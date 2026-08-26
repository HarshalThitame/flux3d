import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { Receiver } from "@upstash/qstash";
import { listCampaigns, updateCampaignStatus } from "@/lib/meta/marketing-api";
import { logError, logInfo, logWarn } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const qstashReceiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY ?? "",
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY ?? "",
});

async function verifyCronAuth(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(authHeader.slice(7)),
      Buffer.from(cronSecret),
    );
  } catch {
    return false;
  }
}

async function verifyQStash(request: Request): Promise<boolean> {
  const signature = request.headers.get("upstash-signature") ?? "";
  if (!signature) return false;
  const body = await request
    .clone()
    .text()
    .catch(() => "");
  try {
    return await qstashReceiver.verify({
      body,
      signature,
      url: request.url,
    });
  } catch {
    return false;
  }
}

/**
 * GET /api/cron/sync-meta-ads
 *
 * Reconciles local meta_ad_campaigns records with the actual state in Meta Ads Manager.
 * Updates status, budget, and names for any campaigns that changed externally.
 * Also flags orphaned local records (campaigns deleted in Meta) and orphaned Meta campaigns
 * (campaigns created externally and not in local DB).
 */
export async function GET(request: Request) {
  const isAuthorized =
    (await verifyQStash(request)) || (await verifyCronAuth(request));
  if (!isAuthorized) {
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
  const startTime = Date.now();

  try {
    // ─── Fetch all campaigns from Meta ───────────────────────────────────
    const metaCampaigns = await listCampaigns();
    const metaMap = new Map(metaCampaigns.map((c) => [c.id, c]));

    // ─── Fetch all local records ──────────────────────────────────────────
    const { data: localRecords, error: localError } = await supabase
      .from("meta_ad_campaigns")
      .select("id, campaign_id, name, status, daily_budget_paise");

    if (localError) {
      throw new Error(`Failed to load local records: ${localError.message}`);
    }

    const localMap = new Map(
      (localRecords ?? []).map((r) => [r.campaign_id as string, r]),
    );

    let updated = 0;
    const archived = 0;
    let orphanedMeta = 0;
    let orphanedLocal = 0;
    let spendAnomalies = 0;

    // ─── Reconcile each local record against Meta ─────────────────────────
    for (const local of localRecords ?? []) {
      const meta = metaMap.get(local.campaign_id as string);
      if (!meta) {
        // Campaign was deleted/archived in Meta but still exists locally
        if (local.status !== "ARCHIVED" && local.status !== "DELETED") {
          await supabase
            .from("meta_ad_campaigns")
            .update({
              status: "ARCHIVED",
              updated_at: new Date().toISOString(),
            })
            .eq("id", local.id);
          orphanedLocal++;
        }
        continue;
      }

      const updates: Record<string, unknown> = {};
      if (local.status !== meta.status) {
        updates.status = meta.status;
      }
      if (local.name !== meta.name) {
        updates.name = meta.name;
      }
      const metaBudgetPaise = meta.daily_budget
        ? Number(meta.daily_budget)
        : null;
      if (
        metaBudgetPaise !== null &&
        local.daily_budget_paise !== metaBudgetPaise
      ) {
        updates.daily_budget_paise = metaBudgetPaise;
      }

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        await supabase
          .from("meta_ad_campaigns")
          .update(updates)
          .eq("id", local.id);
        updated++;
      }
    }

    // ─── Detect orphaned Meta campaigns (not in local DB) ─────────────────
    for (const meta of metaCampaigns) {
      if (!localMap.has(meta.id)) {
        orphanedMeta++;
      }
    }

    // ─── Spend anomaly detection ─────────────────────────────────────────
    // Fetch 1-day insights for active campaigns and auto-pause if spend > 1.5x daily budget
    const activeCampaigns = metaCampaigns.filter((c) => c.status === "ACTIVE");
    if (activeCampaigns.length > 0) {
      const { getCampaignInsights } = await import("@/lib/meta/marketing-api");
      const insights = await getCampaignInsights(
        activeCampaigns.map((c) => c.id),
        "today",
      );

      for (const insight of insights) {
        const local = localMap.get(insight.campaign_id);
        if (!local) continue;
        const spend = Number(insight.spend) || 0;
        const budget = (local.daily_budget_paise ?? 0) / 100;
        if (budget > 0 && spend > budget * 1.5) {
          logWarn("Spend anomaly detected — auto-pausing campaign", {
            module: "meta-ads",
            metadata: {
              campaignId: insight.campaign_id,
              spend,
              budget,
              multiplier: spend / budget,
            },
          });
          try {
            await updateCampaignStatus(insight.campaign_id, "PAUSED");
            await supabase
              .from("meta_ad_campaigns")
              .update({
                status: "PAUSED",
                updated_at: new Date().toISOString(),
              })
              .eq("campaign_id", insight.campaign_id);
            spendAnomalies++;
          } catch (pauseErr) {
            logError("Failed to auto-pause anomalous campaign", {
              module: "meta-ads",
              error:
                pauseErr instanceof Error
                  ? pauseErr
                  : new Error(String(pauseErr)),
            });
          }
        }
      }
    }

    const duration = Date.now() - startTime;

    logInfo("Meta ads sync completed", {
      module: "meta-ads",
      duration,
      metadata: {
        updated,
        archived: orphanedLocal,
        orphanedMeta,
        spendAnomalies,
      },
    });

    return NextResponse.json({
      success: true,
      updated,
      orphanedLocal,
      orphanedMeta,
      spendAnomalies,
      durationMs: duration,
    });
  } catch (err) {
    logError("Meta ads sync error", {
      module: "meta-ads",
      error: err instanceof Error ? err : new Error(String(err)),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 },
    );
  }
}
