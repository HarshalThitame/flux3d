import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { StoredCatalogHashes } from "./catalog";

/**
 * Persistent store for Meta catalog sync state.
 *
 * The 6-hourly full-sync cron must NOT re-push unchanged items: every
 * items_batch UPDATE re-triggers WhatsApp review and flips APPROVED items to
 * OUTDATED/NO_REVIEW, hiding the catalog from customers. We persist the
 * per-SKU payload hashes between runs and skip items whose hash is unchanged.
 *
 * State lives in the dedicated `meta_sync_state` table (one row, id =
 * 'default'), which is NOT subject to any retention purge — the earlier
 * `error_logs` storage was wiped by purge_old_records(90) after ~90 days,
 * causing a full catalog re-push and WhatsApp review churn.
 */

const STATE_ROW_ID = "default";

let cachedClient: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        return fetch(input, { ...init, signal: controller.signal }).finally(
          () => clearTimeout(timeout),
        );
      },
    },
  });
  return cachedClient;
}

export async function getStoredCatalogHashes(): Promise<StoredCatalogHashes> {
  const supabase = getClient();
  if (!supabase) return {};

  const { data, error } = await supabase
    .from("meta_sync_state")
    .select("hashes")
    .eq("id", STATE_ROW_ID)
    .maybeSingle();

  if (error || !data?.hashes) return {};
  const hashes = data.hashes as Record<string, unknown>;
  const result: StoredCatalogHashes = {};
  for (const [key, value] of Object.entries(hashes)) {
    if (typeof value === "string") result[key] = value;
  }
  return result;
}

/**
 * Atomically MERGE hashes into the stored map (server-side `hashes || new`).
 *
 * Use this from the real-time webhook handler: it avoids the lost-update race
 * where the webhook read-modify-write cycle overwrote hashes persisted by a
 * concurrently running cron (or vice versa). Entries already in the store are
 * only overwritten when present in the incoming map; nothing is deleted.
 */
export async function mergeStoredCatalogHashes(
  newHashes: StoredCatalogHashes,
): Promise<void> {
  if (Object.keys(newHashes).length === 0) return;
  const supabase = getClient();
  if (!supabase) return;

  const { error } = await supabase.rpc("merge_meta_sync_hashes", {
    p_id: STATE_ROW_ID,
    p_hashes: newHashes,
  });
  if (error) throw new Error(`merge_meta_sync_hashes failed: ${error.message}`);
}

/**
 * REPLACE the whole stored hash map. Use only from the full-sync cron: its
 * result map is derived from the complete stored set plus this run's outcome,
 * so wholesale replacement also prunes entries for SKUs that no longer exist.
 */
export async function saveStoredCatalogHashes(
  hashes: StoredCatalogHashes,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;

  const { error } = await supabase
    .from("meta_sync_state")
    .upsert(
      { id: STATE_ROW_ID, hashes, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    );
  if (error) throw new Error(`meta_sync_state upsert failed: ${error.message}`);
}

// ── Pending catalog deletions ───────────────────────────────────────────────
// Failed Meta catalog DELETEs (throttles, transient Graph errors) are queued
// here and retried by the full-sync cron — which otherwise only upserts and
// would never re-attempt a deletion, leaving stale items visible in the
// WhatsApp catalog. Stored as a second meta_sync_state row:
// retailer_id -> ISO timestamp of when the delete was queued.

const DELETES_ROW_ID = "delete-queue";

export async function getPendingCatalogDeletes(): Promise<string[]> {
  const supabase = getClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("meta_sync_state")
    .select("hashes")
    .eq("id", DELETES_ROW_ID)
    .maybeSingle();

  if (error || !data?.hashes) return [];
  return Object.keys(data.hashes as Record<string, unknown>);
}

/** Atomically append retailer_ids to the pending-delete queue (never throws). */
export async function queueCatalogDeletes(
  retailerIds: string[],
): Promise<void> {
  const ids = [...new Set(retailerIds.filter(Boolean))];
  if (ids.length === 0) return;
  const supabase = getClient();
  if (!supabase) return;

  const now = new Date().toISOString();
  const entries = Object.fromEntries(ids.map((id) => [id, now]));
  try {
    await supabase.rpc("merge_meta_sync_hashes", {
      p_id: DELETES_ROW_ID,
      p_hashes: entries,
    });
  } catch (e) {
    console.error("[meta/sync-state] Failed to queue catalog deletes:", e);
  }
}

/** Remove successfully deleted retailer_ids from the queue (best-effort). */
export async function clearCatalogDeletes(
  retailerIds: string[],
): Promise<void> {
  if (retailerIds.length === 0) return;
  const supabase = getClient();
  if (!supabase) return;

  try {
    const pending = await getPendingCatalogDeletes();
    const cleared = new Set(retailerIds);
    const remaining = Object.fromEntries(
      pending
        .filter((id) => !cleared.has(id))
        .map((id) => [id, new Date(0).toISOString()]),
    );
    await supabase
      .from("meta_sync_state")
      .upsert(
        {
          id: DELETES_ROW_ID,
          hashes: remaining,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
  } catch (e) {
    console.error("[meta/sync-state] Failed to clear catalog deletes:", e);
  }
}

/**
 * Atomically remove specific retailer_id keys from the stored hash map.
 *
 * Called after a slug-based Meta catalog ghost entry is successfully deleted
 * so the key is pruned from meta_sync_state.hashes. Without this, the next
 * full-sync cron run would see the slug hash as "unchanged" and skip deleting
 * the ghost entry — re-creating the 0-price duplicate in the catalog.
 */
export async function deleteFromStoredCatalogHashes(
  retailerIds: string[],
): Promise<void> {
  const ids = [...new Set(retailerIds.filter(Boolean))];
  if (ids.length === 0) return;
  const supabase = getClient();
  if (!supabase) return;

  try {
    const { error } = await supabase.rpc("delete_meta_sync_hashes", {
      p_id: STATE_ROW_ID,
      p_keys: ids,
    });
    if (error)
      throw new Error(`delete_meta_sync_hashes failed: ${error.message}`);
  } catch (e) {
    console.error("[meta/sync-state] Failed to delete catalog hash keys:", e);
  }
}
