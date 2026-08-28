import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Receiver } from "@upstash/qstash";
import {
  syncFullCatalogToMeta,
  deleteMetaCatalogItem,
} from "@/lib/meta/catalog";
import {
  getStoredCatalogHashes,
  saveStoredCatalogHashes,
  getPendingCatalogDeletes,
  clearCatalogDeletes,
} from "@/lib/meta/sync-state";
import { sendOpsAlert } from "@/lib/alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const qstashReceiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY ?? "",
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY ?? "",
});

// Auth is QStash-signature ONLY. The previous dual-auth (QStash OR
// CRON_SECRET Bearer) meant a leaked CRON_SECRET fully bypassed signature
// verification. The schedule is created via scripts/setup-meta-catalog-schedule.ts.
//
// QStash signs scheduled requests with an `upstash-signature` header for POST
// and, for GET, appends `upstash-signature` to the URL query string — accept
// both so either schedule style works.
async function verifyQStash(request: Request): Promise<boolean> {
  const body = await request
    .clone()
    .text()
    .catch(() => "");
  const headerSignature = request.headers.get("upstash-signature") ?? "";
  if (headerSignature) {
    try {
      return await qstashReceiver.verify({
        body,
        signature: headerSignature,
        url: request.url,
      });
    } catch {
      return false;
    }
  }
  const querySignature =
    new URL(request.url).searchParams.get("upstash-signature") ?? "";
  if (!querySignature) return false;
  try {
    return await qstashReceiver.verify({
      body,
      signature: querySignature,
      url: request.url,
    });
  } catch {
    return false;
  }
}

async function runCatalogSync(request: Request) {
  if (!(await verifyQStash(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Missing Supabase config" },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Bounded pagination — an unbounded select grows with the catalog and risks
  // blowing the function's maxDuration mid-run.
  const PRODUCTS_PAGE_SIZE = 500;
  const MAX_PRODUCT_PAGES = 20;
  const productSelect = `
    id, name, slug, description, thumbnail_url, image_urls,
    is_active, is_archived, base_price,
    category:category_id(name),
    skus:shelf_skus(id, sku_code, price, stock_quantity, is_available, variant_combination, variant_image_url)
  `;
  const products: Array<Record<string, unknown>> = [];
  for (let page = 0; page < MAX_PRODUCT_PAGES; page++) {
    const { data: rows, error } = await supabase
      .from("shelf_products")
      .select(productSelect)
      .order("created_at", { ascending: false })
      .range(page * PRODUCTS_PAGE_SIZE, (page + 1) * PRODUCTS_PAGE_SIZE - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!rows || rows.length === 0) break;
    products.push(...rows);
    if (rows.length < PRODUCTS_PAGE_SIZE) break;
  }

  // Retry catalog deletions that previously failed (throttles/transient Graph
  // errors). Without this pass a failed delete is never retried and the stale
  // item stays visible in the WhatsApp catalog forever.
  let deletesRetried = 0;
  let deletesSucceeded = 0;
  try {
    const pendingDeletes = await getPendingCatalogDeletes();
    if (pendingDeletes.length > 0) {
      const cleared: string[] = [];
      for (const retailerId of pendingDeletes) {
        deletesRetried += 1;
        const result = await deleteMetaCatalogItem(retailerId);
        if (result.success) {
          deletesSucceeded += 1;
          cleared.push(retailerId);
        } else if (
          /^Meta API error 404/.test(result.error ?? "") ||
          /does not exist|not found/i.test(result.error ?? "")
        ) {
          // Item already gone from Meta — stop retrying.
          cleared.push(retailerId);
        }
      }
      await clearCatalogDeletes(cleared);
    }
  } catch (e) {
    console.error("[sync-meta-catalog] Delete-queue drain failed:", e);
  }

  // Load previously stored payload hashes so unchanged items are skipped.
  // Without this the 6-hourly sync re-pushed every item, re-triggering WhatsApp
  // review each time and flipping APPROVED items to OUTDATED/NO_REVIEW.
  const storedHashes = await getStoredCatalogHashes().catch((e) => {
    console.error("[sync-meta-catalog] Failed to load stored hashes:", e);
    return {};
  });

  const result = await syncFullCatalogToMeta(
    products as Parameters<typeof syncFullCatalogToMeta>[0],
    storedHashes,
  );

  // Persist the current hashes so the next cron run skips unchanged items.
  if (result.hashes) {
    await saveStoredCatalogHashes(result.hashes).catch((e) => {
      console.error("[sync-meta-catalog] Failed to persist payload hashes:", e);
    });
  }

  // Ops alert on partial/total sync failure (rate-limited per key — max 2
  // emails/hour; every occurrence still lands in error_logs).
  if (result.failed > 0 || deletesRetried > deletesSucceeded) {
    void sendOpsAlert({
      key: "meta_catalog_sync_failures",
      severity: result.failed > result.succeeded ? "critical" : "warning",
      source: "meta_catalog_cron",
      subject: `Meta catalog sync: ${result.failed} failed, ${result.succeeded} succeeded`,
      body:
        `The 6-hourly Meta catalog sync completed with failures.\n` +
        `Changed items: ${result.total} (${result.succeeded} ok, ${result.failed} failed, ${result.skipped} skipped)\n` +
        `Delete retries: ${deletesSucceeded}/${deletesRetried} cleared\n` +
        `Duration: ${Math.round(result.durationMs / 1000)}s\n\n` +
        `Failed SKUs are retried automatically on the next run. Check error_logs (source=meta_catalog_cron) for per-SKU errors.`,
      metadata: {
        total: result.total,
        succeeded: result.succeeded,
        failed: result.failed,
        skipped: result.skipped,
        deletesRetried,
        deletesSucceeded,
        failures: result.actions.filter((a) => !a.success).slice(0, 10),
      },
    });
  }

  try {
    await supabase.from("error_logs").insert({
      source: "meta_catalog_cron",
      severity: result.failed > 0 ? "warning" : "info",
      message: `Catalog sync: ${result.succeeded} ok, ${result.failed} failed, ${result.skipped} skipped (${result.total} total changed)`,
      error_message: `Catalog sync: ${result.succeeded} ok, ${result.failed} failed, ${result.skipped} skipped (${result.total} total changed)`,
      metadata: {
        total: result.total,
        succeeded: result.succeeded,
        failed: result.failed,
        skipped: result.skipped,
        durationMs: result.durationMs,
        deletesRetried,
        deletesSucceeded,
      },
    });
  } catch (e) {
    console.error("[sync-meta-catalog] Log write failed:", e);
  }

  // Dead-man switch: ping the Better Stack heartbeat on every completed run.
  // Better Stack alerts if a ping does NOT arrive within the expected window
  // (7h period + grace) — catching silent cron death (QStash schedule gone,
  // deploy breakage) that no error-based alerting can see. Fire-and-forget;
  // unset env var = feature disabled.
  const heartbeatUrl = process.env.CATALOG_SYNC_HEARTBEAT_URL;
  if (heartbeatUrl) {
    void fetch(heartbeatUrl, {
      method: "GET",
      signal: AbortSignal.timeout(10_000),
    }).catch((e) => {
      console.error("[sync-meta-catalog] Heartbeat ping failed:", e);
    });
  }

  return NextResponse.json({
    success: result.failed === 0,
    total: result.total,
    succeeded: result.succeeded,
    failed: result.failed,
    skipped: result.skipped,
    durationMs: result.durationMs,
    deletesRetried,
    deletesSucceeded,
  });
}

export async function GET(request: Request) {
  return runCatalogSync(request);
}

export async function POST(request: Request) {
  return runCatalogSync(request);
}
