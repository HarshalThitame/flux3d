import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { CreateCampaignSchema } from "@/lib/admin/meta-ads-schemas";
import { validateBody } from "@/lib/admin/meta-ads-route";
import {
  createMetaAdCampaign,
  resolveDuplicateParams,
  computeIdempotencyKey,
  listActiveCategories,
} from "@/lib/admin/meta-ads-service";
import { logError, logInfo } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * POST /api/admin/ads/create
 *
 * Creates a PAUSED Meta carousel ad campaign for new-arrival products
 * in a given category, plus an optional PAUSED DPA retargeting campaign.
 *
 * Body validated by CreateCampaignSchema (Zod).
 * Includes idempotency check and automatic rollback on partial failure.
 */

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const supabase = await createServerClient();

    // ─── Auth check ────────────────────────────────────────────────────────
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.is_admin) {
      return NextResponse.json(
        { error: "Forbidden: admin only" },
        { status: 403 },
      );
    }

    // ─── Validate body ───────────────────────────────────────────────────
    const rawBody = (await request.json().catch(() => ({}))) as unknown;
    const validation = validateBody(CreateCampaignSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, issues: validation.issues },
        { status: 400 },
      );
    }

    const {
      categoryName,
      dailyBudgetPaise,
      siteUrl: siteUrlRaw,
      pageId: pageIdRaw,
      createDpa,
      productLimit,
      duplicateFromId,
    } = validation.data;

    const siteUrl =
      siteUrlRaw ?? (process.env.NEXT_PUBLIC_SITE_URL || "https://flux3d.in");
    let pageId = pageIdRaw ?? (process.env.META_PAGE_ID || null);

    // ─── Handle duplication ────────────────────────────────────────────────
    const params = await resolveDuplicateParams(supabase, {
      categoryName,
      dailyBudgetPaise,
      siteUrl,
      pageId: pageId ?? "",
      createDpa,
      productLimit,
      duplicateFromId,
    });

    pageId = params.pageId;

    if (!pageId) {
      return NextResponse.json(
        {
          error:
            'Missing Facebook Page ID. Provide it in the request body as "pageId" or set META_PAGE_ID in your environment.',
        },
        { status: 400 },
      );
    }

    // ─── Idempotency check ───────────────────────────────────────────────
    const idempotencyKey = computeIdempotencyKey(
      user.id,
      params.categoryName,
      params.dailyBudgetPaise,
    );
    const { data: existingRecord } = await supabase
      .from("meta_ad_campaigns")
      .select("id, campaign_id, created_at")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingRecord) {
      return NextResponse.json(
        {
          error: "A campaign with these settings was already created today.",
          existingCampaignId: existingRecord.campaign_id,
        },
        { status: 409 },
      );
    }

    // ─── Create campaign via shared service ───────────────────────────────
    const result = await createMetaAdCampaign(supabase, params, user.id);

    logInfo("Meta campaign created successfully", {
      module: "meta-ads",
      duration: Date.now() - startTime,
      metadata: {
        campaignId: result.carousel.campaignId,
        dpaCampaignId: result.dpa?.campaignId ?? null,
        categoryName: params.categoryName,
        productCount: result.cards.length,
      },
    });

    return NextResponse.json({
      success: true,
      status: "PAUSED",
      carousel: result.carousel,
      dpa: result.dpa
        ? {
            campaignId: result.dpa.campaignId,
            adSetId: result.dpa.adSetId,
            creativeId: result.dpa.creativeId,
            adId: result.dpa.adId,
          }
        : null,
      productsUsed: result.cards.map((c) => ({
        name: c.name,
        price: c.description,
      })),
      metaAdsManagerUrl: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${process.env.META_AD_ACCOUNT_ID}`,
      note: 'Both campaigns are created in PAUSED status. Go to Meta Ads Manager and click "Publish" when you are ready.',
    });
  } catch (err) {
    logError("Meta ad creation error", {
      module: "meta-ads",
      error: err instanceof Error ? err : new Error(String(err)),
    });

    const message =
      err instanceof Error ? err.message : "Failed to create Meta ad campaign";

    // Return structured errors from the service
    if (message.includes("No active category found")) {
      const categories = await listActiveCategories(
        await createServerClient(),
      ).catch(() => []);
      return NextResponse.json(
        { error: message, availableCategories: categories },
        { status: 404 },
      );
    }

    if (
      message.includes("No active products found") ||
      message.includes("No usable products")
    ) {
      const categories = await listActiveCategories(
        await createServerClient(),
      ).catch(() => []);
      return NextResponse.json(
        {
          error: message,
          suggestion:
            "Add products to this category or choose a different one.",
          availableCategories: categories,
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error: message,
        help: "Ensure META_SYSTEM_USER_TOKEN, META_AD_ACCOUNT_ID, META_CATALOG_ID, META_PAGE_ID, and NEXT_PUBLIC_META_PIXEL_ID are configured correctly.",
      },
      { status: 500 },
    );
  }
}
