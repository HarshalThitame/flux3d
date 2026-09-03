import { createServerClient } from "@/lib/supabase/server";
import {
  getMetaApiHeaders,
  getMetaAdAccountId,
  getMetaGraphBase,
  getMetaCatalogId,
  getMetaPixelId,
  getMetaApiVersion,
} from "@/lib/meta/config";
import { logWarn, logError } from "@/lib/logger";

// ─── API version deprecation warning ───────────────────────────────────────
const apiVersion = getMetaApiVersion();
const versionDate = new Date(`${apiVersion.slice(1).split(".")[0]}-01-01`); // rough heuristic
const ageMonths =
  (Date.now() - versionDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
if (ageMonths > 18) {
  logWarn(
    `Meta Graph API version ${apiVersion} is older than 18 months and may be deprecated soon. Consider upgrading META_API_VERSION.`,
    {
      module: "meta-ads",
      metadata: { apiVersion, ageMonths: Math.round(ageMonths) },
    },
  );
}

// ─── Retry configuration ─────────────────────────────────────────────────────
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function extractMetaErrorMessage(result: Record<string, unknown>): string {
  const errorObj = (result.error ?? result) as Record<string, unknown>;
  if (typeof errorObj.message === "string") return errorObj.message;
  if (typeof errorObj.error_user_msg === "string")
    return errorObj.error_user_msg;
  if (typeof errorObj.error_msg === "string") return errorObj.error_msg;
  return JSON.stringify(errorObj);
}

class MetaApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "MetaApiError";
    this.status = status;
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Graph API calls should not hang forever when Meta has an outage. AbortSignal
// .timeout is available in Node 18+/Vercel's Node runtime.
const META_API_TIMEOUT_MS = 30_000;

async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  isRetryable: (status: number, result: Record<string, unknown>) => boolean,
): Promise<T> {
  let lastErr: Error | undefined;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      const status = err instanceof MetaApiError ? err.status : 0;
      // status 0 means a network/timeout error — always transient and worth
      // retrying. 5xx and 429 are handled by the caller's predicate. 4xx
      // (invalid params, auth) are NOT retried.
      const retryable = status === 0 || isRetryable(status, {});
      if (attempt >= MAX_RETRIES || !retryable) break;
      logWarn(`Meta API retry ${attempt}/${MAX_RETRIES} for ${label}`, {
        module: "meta-ads",
        error: lastErr,
      });
      await sleep(RETRY_DELAY_MS * Math.pow(2, attempt - 1));
    }
  }
  throw lastErr ?? new Error(`Max retries exceeded for ${label}`);
}

// ─── Types ─────────────────────────────────────────────────────────────────

export type MetaCampaign = {
  id: string;
  name: string;
  objective: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
  effective_status: string;
  daily_budget?: string;
  budget_remaining?: string;
  created_time: string;
  updated_time: string;
};

export type MetaAdSet = {
  id: string;
  name: string;
  campaign_id: string;
  status: string;
  daily_budget: string;
  targeting: Record<string, unknown>;
};

export type MetaAdCreative = {
  id: string;
  name: string;
  object_story_spec?: Record<string, unknown>;
};

export type MetaAd = {
  id: string;
  name: string;
  adset_id: string;
  creative: { id: string };
  status: string;
};

export type CarouselCard = {
  link: string;
  picture: string;
  name: string;
  description: string;
};

export type CreateCampaignInput = {
  name: string;
  objective:
    | "OUTCOME_SALES"
    | "OUTCOME_AWARENESS"
    | "OUTCOME_TRAFFIC"
    | "CONVERSIONS"
    | "PRODUCT_CATALOG_SALES";
  status: "PAUSED" | "ACTIVE";
  special_ad_categories?: string[];
};

export type CreateAdSetInput = {
  campaignId: string;
  name: string;
  dailyBudgetPaise: number;
  pixelId: string;
  targeting: Record<string, unknown>;
  optimizationGoal?: string;
  billingEvent?: string;
  promotedObject?: Record<string, unknown>;
};

export type CreateCarouselCreativeInput = {
  name: string;
  pageId: string;
  link: string;
  message: string;
  cards: CarouselCard[];
  callToAction?: string;
};

export type CreateAdInput = {
  adsetId: string;
  name: string;
  creativeId: string;
  status: "PAUSED" | "ACTIVE";
};

export type CreateAdCampaignResult = {
  campaignId: string;
  adSetId: string;
  creativeId: string;
  adId: string;
};

// ─── Low-level fetch wrapper ────────────────────────────────────────────────

async function metaApiPostRaw(path: string, body: Record<string, unknown>) {
  const base = getMetaGraphBase();
  const headers = getMetaApiHeaders();
  const url = `${base}${path}`;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(META_API_TIMEOUT_MS),
  });

  const result = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!response.ok) {
    const message = extractMetaErrorMessage(result);
    throw new MetaApiError(
      response.status,
      `Meta API error ${response.status}: ${message}`,
    );
  }

  if (result.error) {
    const message = extractMetaErrorMessage(result);
    throw new MetaApiError(200, `Meta API error: ${message}`);
  }

  return result;
}

function metaApiPost(path: string, body: Record<string, unknown>) {
  return withRetry(
    `POST ${path}`,
    () => metaApiPostRaw(path, body),
    (status) => status >= 500 || status === 429,
  );
}

async function metaApiGetRaw(path: string) {
  const base = getMetaGraphBase();
  const headers = getMetaApiHeaders();
  const url = `${base}${path}`;

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(META_API_TIMEOUT_MS),
  });
  const result = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!response.ok) {
    const message = extractMetaErrorMessage(result);
    throw new MetaApiError(
      response.status,
      `Meta API error ${response.status}: ${message}`,
    );
  }

  return result;
}

function metaApiGet(path: string) {
  return withRetry(
    `GET ${path}`,
    () => metaApiGetRaw(path),
    (status) => status >= 500 || status === 429,
  );
}

// ─── Campaign ───────────────────────────────────────────────────────────────

export async function createCampaign(
  input: CreateCampaignInput,
): Promise<{ id: string }> {
  const adAccountId = getMetaAdAccountId();
  const result = (await metaApiPost(`/${adAccountId}/campaigns`, {
    name: input.name,
    objective: input.objective,
    status: input.status,
    special_ad_categories: input.special_ad_categories ?? [],
  })) as { id: string };

  return result;
}

export async function listCampaigns(
  fields = "id,name,objective,status,effective_status,daily_budget,budget_remaining,created_time,updated_time",
): Promise<MetaCampaign[]> {
  const adAccountId = getMetaAdAccountId();
  const result = (await metaApiGet(
    `/${adAccountId}/campaigns?fields=${encodeURIComponent(fields)}&limit=50`,
  )) as { data?: MetaCampaign[] };

  return result.data ?? [];
}

// ─── Ad Set ─────────────────────────────────────────────────────────────────

export async function createAdSet(
  input: CreateAdSetInput,
): Promise<{ id: string }> {
  const adAccountId = getMetaAdAccountId();
  const result = (await metaApiPost(`/${adAccountId}/adsets`, {
    campaign_id: input.campaignId,
    name: input.name,
    daily_budget: input.dailyBudgetPaise,
    billing_event: input.billingEvent ?? "IMPRESSIONS",
    optimization_goal: input.optimizationGoal ?? "OFFSITE_CONVERSIONS",
    targeting: input.targeting,
    promoted_object: input.promotedObject,
    status: "PAUSED",
    is_adset_budget_sharing_enabled: false,
  })) as { id: string };

  return result;
}

// ─── Ad Creative ────────────────────────────────────────────────────────────

export async function createCarouselCreative(
  input: CreateCarouselCreativeInput,
): Promise<{ id: string }> {
  const adAccountId = getMetaAdAccountId();

  const childAttachments = input.cards.map((card) => ({
    link: card.link,
    picture: card.picture,
    name: card.name,
    description: card.description,
  }));

  const result = (await metaApiPost(`/${adAccountId}/adcreatives`, {
    name: input.name,
    object_story_spec: {
      page_id: input.pageId,
      link_data: {
        link: input.link,
        message: input.message,
        child_attachments: childAttachments,
        call_to_action: {
          type: input.callToAction ?? "SHOP_NOW",
          value: { link: input.link },
        },
      },
    },
  })) as { id: string };

  return result;
}

// ─── Ad ─────────────────────────────────────────────────────────────────────

export async function createAd(input: CreateAdInput): Promise<{ id: string }> {
  const adAccountId = getMetaAdAccountId();
  const result = (await metaApiPost(`/${adAccountId}/ads`, {
    name: input.name,
    adset_id: input.adsetId,
    creative: { creative_id: input.creativeId },
    status: input.status,
  })) as { id: string };

  return result;
}

// ─── Orchestrated campaign builder ──────────────────────────────────────────

export async function createPausedCarouselCampaign(params: {
  campaignName: string;
  adSetName: string;
  adName: string;
  creativeName: string;
  dailyBudgetPaise: number;
  pageId: string;
  siteUrl: string;
  message: string;
  cards: CarouselCard[];
  targeting?: Record<string, unknown>;
}): Promise<CreateAdCampaignResult> {
  const pixelId = getMetaPixelId();

  // 1. Campaign
  const campaign = await createCampaign({
    name: params.campaignName,
    objective: "OUTCOME_SALES",
    status: "PAUSED",
  });

  // 2. Ad Set with cold-audience targeting
  const targeting = params.targeting ?? buildColdAudienceTargeting();
  const adSet = await createAdSet({
    campaignId: campaign.id,
    name: params.adSetName,
    dailyBudgetPaise: params.dailyBudgetPaise,
    pixelId,
    targeting,
    optimizationGoal: "OFFSITE_CONVERSIONS",
    billingEvent: "IMPRESSIONS",
    promotedObject: {
      pixel_id: pixelId,
      custom_event_type: "PURCHASE",
    },
  });

  // 3. Creative
  const creative = await createCarouselCreative({
    name: params.creativeName,
    pageId: params.pageId,
    link: `${params.siteUrl.replace(/\/+$/, "")}/3d-shop`,
    message: params.message,
    cards: params.cards,
  });

  // 4. Ad
  const ad = await createAd({
    adsetId: adSet.id,
    name: params.adName,
    creativeId: creative.id,
    status: "PAUSED",
  });

  return {
    campaignId: campaign.id,
    adSetId: adSet.id,
    creativeId: creative.id,
    adId: ad.id,
  };
}

// ─── DPA Retargeting campaign builder ───────────────────────────────────────

export async function createPausedDPARetargetingCampaign(params: {
  campaignName: string;
  adSetName: string;
  adName: string;
  creativeName: string;
  dailyBudgetPaise: number;
  pageId: string;
  siteUrl: string;
  message: string;
  targeting?: Record<string, unknown>;
}): Promise<CreateAdCampaignResult> {
  const pixelId = getMetaPixelId();
  // DPA adsets require a REAL product_set_id. The previously hardcoded
  // `all_products_${catalogId}` does not exist, so DPA adsets always failed.
  // Resolve the catalog's default product set ("All Products") via the API.
  const productSetId = await getDefaultCatalogProductSetId();

  // 1. Campaign (DPA uses same OUTCOME_SALES objective)
  const campaign = await createCampaign({
    name: params.campaignName,
    objective: "OUTCOME_SALES",
    status: "PAUSED",
  });

  // 2. Ad Set optimized for DPA
  const targeting = params.targeting ?? buildRetargetingTargeting(pixelId);
  const adSet = await createAdSet({
    campaignId: campaign.id,
    name: params.adSetName,
    dailyBudgetPaise: params.dailyBudgetPaise,
    pixelId,
    targeting,
    optimizationGoal: "OFFSITE_CONVERSIONS",
    billingEvent: "IMPRESSIONS",
    promotedObject: {
      pixel_id: pixelId,
      custom_event_type: "PURCHASE",
      product_set_id: productSetId,
    },
  });

  // 3. DPA Creative (template-based)
  const creative = await createDPACreative({
    name: params.creativeName,
    pageId: params.pageId,
    link: `${params.siteUrl.replace(/\/+$/, "")}/3d-shop`,
    message: params.message,
  });

  // 4. Ad
  const ad = await createAd({
    adsetId: adSet.id,
    name: params.adName,
    creativeId: creative.id,
    status: "PAUSED",
  });

  return {
    campaignId: campaign.id,
    adSetId: adSet.id,
    creativeId: creative.id,
    adId: ad.id,
  };
}

async function createDPACreative(params: {
  name: string;
  pageId: string;
  link: string;
  message: string;
}): Promise<{ id: string }> {
  const adAccountId = getMetaAdAccountId();

  const result = (await metaApiPost(`/${adAccountId}/adcreatives`, {
    name: params.name,
    object_story_spec: {
      page_id: params.pageId,
      template_data: {
        template_type: "DYNAMIC_PRODUCT_ADS",
        call_to_action: {
          type: "SHOP_NOW",
          value: { link: params.link },
        },
        description: "{{product.description | truncate:90}}",
        link: params.link,
        message: params.message,
        name: "{{product.name | truncate:40}}",
        picture: "{{product.image_link}}",
      },
    },
  })) as { id: string };

  return result;
}

// ─── Targeting builders ─────────────────────────────────────────────────────

function buildColdAudienceTargeting(): Record<string, unknown> {
  return {
    geo_locations: {
      countries: ["IN"],
      location_types: ["home", "recent"],
    },
    age_min: 25,
    age_max: 55,
    flexible_spec: [
      {
        interests: [
          { id: "6003012446280", name: "Home decor" },
          { id: "6003012476280", name: "Interior design" },
          { id: "6003139266462", name: "Office supplies" },
          { id: "6003002346380", name: "Corporate gifts" },
          { id: "6003066707182", name: "Small business" },
        ],
      },
    ],
    publisher_platforms: [
      "facebook",
      "instagram",
      "audience_network",
      "messenger",
    ],
    facebook_positions: [
      "feed",
      "marketplace",
      "video_feed",
      "right_hand_column",
      "instant_article",
    ],
    instagram_positions: ["stream", "story", "explore", "reels"],
    device_platforms: ["mobile", "desktop"],
  };
}

function buildRetargetingTargeting(pixelId: string): Record<string, unknown> {
  return {
    geo_locations: {
      countries: ["IN"],
      location_types: ["home", "recent"],
    },
    age_min: 25,
    age_max: 55,
    // Custom audience for website visitors who viewed content but didn't purchase
    // Uses the pixel's built-in retargeting (Meta auto-creates these segments)
    custom_audiences: [],
    product_audience_specs: [
      {
        pixel_id: pixelId,
        exclusion_rules: [
          {
            event_type: "PURCHASE",
            retention_seconds: 2592000, // 30 days
          },
        ],
        inclusion_rules: [
          {
            event_type: "VIEW_CONTENT",
            retention_seconds: 604800, // 7 days
          },
        ],
      },
    ],
    publisher_platforms: [
      "facebook",
      "instagram",
      "audience_network",
      "messenger",
    ],
    facebook_positions: ["feed", "marketplace", "video_feed"],
    instagram_positions: ["stream", "story", "explore", "reels"],
    device_platforms: ["mobile", "desktop"],
  };
}

// ─── Catalog helpers ────────────────────────────────────────────────────────

/**
 * Resolves the Meta catalog's default "All Products" product set id. DPA
 * adsets require a real product_set_id — the previous hardcoded
 * `all_products_${catalogId}` never existed, so DPA campaigns silently failed.
 */
export async function getDefaultCatalogProductSetId(): Promise<string> {
  const catalogId = getMetaCatalogId();
  const result = (await metaApiGet(
    `/${catalogId}/product_sets?fields=id,name&limit=100`,
  )) as { data?: Array<{ id: string; name?: string }> };

  const sets = result.data ?? [];
  const allProducts = sets.find((set) => /all products/i.test(set.name ?? ""));
  const selected = allProducts ?? sets[0];
  if (!selected?.id) {
    throw new Error(
      'No product set found for the Meta catalog. Create an "All Products" product set in Commerce Manager.',
    );
  }
  return selected.id;
}

// ─── Product data fetcher for carousel ──────────────────────────────────────

export type AdProductCard = {
  skuCode: string;
  slug: string;
  name: string;
  price: number;
  imageUrl: string | null;
  categoryName: string | null;
};

export async function fetchNewArrivalProductsForAd(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  categoryName: string,
  limit = 10,
): Promise<AdProductCard[]> {
  const { data: products, error } = await supabase
    .from("shelf_products")
    .select(
      "id, name, slug, thumbnail_url, base_price, category:shelf_categories(name), shelf_skus(sku_code, price, variant_image_url, is_available)",
    )
    .eq("is_active", true)
    .eq("is_archived", false)
    .ilike("shelf_categories.name", `%${categoryName}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  const cards: AdProductCard[] = [];

  for (const product of products ?? []) {
    const skus = (product.shelf_skus ?? []) as Array<{
      sku_code: string;
      price: number;
      variant_image_url: string | null;
      is_available: boolean;
    }>;

    for (const sku of skus) {
      if (!sku.is_available) continue;

      cards.push({
        skuCode: sku.sku_code,
        slug: product.slug,
        name: product.name,
        price: sku.price || product.base_price || 0,
        imageUrl: sku.variant_image_url || product.thumbnail_url,
        categoryName: categoryName,
      });

      break; // one SKU per product for the carousel
    }

    if (cards.length >= limit) break;
  }

  return cards;
}

// ─── Extended Read / Update / Delete Operations ─────────────────────────────

export type MetaCampaignInsight = {
  campaign_id: string;
  campaign_name: string;
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  cpc: string;
  conversions: string;
  cost_per_conversion: string;
  date_start?: string;
  date_stop?: string;
};

export type MetaAdSetDetail = {
  id: string;
  name: string;
  campaign_id: string;
  status: string;
  daily_budget: string;
  targeting: Record<string, unknown>;
  optimization_goal?: string;
  billing_event?: string;
};

export type MetaAdDetail = {
  id: string;
  name: string;
  adset_id: string;
  creative: { id: string; name?: string };
  status: string;
  preview_shareable_link?: string;
};

export type MetaCampaignDetails = MetaCampaign & {
  adsets?: { data?: MetaAdSetDetail[] };
};

async function metaApiDeleteRaw(path: string) {
  const base = getMetaGraphBase();
  const headers = getMetaApiHeaders();
  const url = `${base}${path}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers,
    signal: AbortSignal.timeout(META_API_TIMEOUT_MS),
  });
  const result = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!response.ok) {
    const message = extractMetaErrorMessage(result);
    throw new MetaApiError(
      response.status,
      `Meta API error ${response.status}: ${message}`,
    );
  }

  return result;
}

function metaApiDelete(path: string) {
  return withRetry(
    `DELETE ${path}`,
    () => metaApiDeleteRaw(path),
    (status) => status >= 500 || status === 429,
  );
}

// ─── Cleanup helpers for rollback ───────────────────────────────────────────

export async function deleteAdSet(
  adSetId: string,
): Promise<{ success: boolean }> {
  await metaApiDelete(`/${adSetId}`);
  return { success: true };
}

export async function deleteAd(adId: string): Promise<{ success: boolean }> {
  await metaApiDelete(`/${adId}`);
  return { success: true };
}

export async function deleteCreative(
  creativeId: string,
): Promise<{ success: boolean }> {
  await metaApiDelete(`/${creativeId}`);
  return { success: true };
}

// ─── Insights ─────────────────────────────────────────────────────────────

export async function getCampaignInsights(
  campaignIds: string[],
  datePreset: "today" | "yesterday" | "last_7d" | "last_30d" = "last_7d",
): Promise<MetaCampaignInsight[]> {
  const fields =
    "campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,conversions,cost_per_conversion";
  const ids = campaignIds.join(",");
  const result = (await metaApiGet(
    `/insights?level=campaign&campaign_ids=[${ids}]&fields=${encodeURIComponent(fields)}&date_preset=${datePreset}`,
  )) as { data?: MetaCampaignInsight[] };

  return result.data ?? [];
}

export async function getAdAccountInsights(
  datePreset: "today" | "yesterday" | "last_7d" | "last_30d" = "today",
): Promise<MetaCampaignInsight[]> {
  const adAccountId = getMetaAdAccountId();
  const fields =
    "spend,impressions,clicks,ctr,cpc,conversions,cost_per_conversion";
  const result = (await metaApiGet(
    `/${adAccountId}/insights?fields=${encodeURIComponent(fields)}&date_preset=${datePreset}`,
  )) as { data?: MetaCampaignInsight[] };

  return result.data ?? [];
}

// Meta's `time_range` requires YYYY-MM-DD (not relative strings like "7_days_ago").
function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function getAdAccountInsightsTimeSeries(
  days = 7,
): Promise<MetaCampaignInsight[]> {
  const adAccountId = getMetaAdAccountId();
  const fields = "spend,impressions,clicks,date_start";
  const timeRange = JSON.stringify({
    since: isoDateDaysAgo(days),
    until: isoDateDaysAgo(0),
  });
  const result = (await metaApiGet(
    `/${adAccountId}/insights?fields=${encodeURIComponent(fields)}&time_range=${encodeURIComponent(timeRange)}&time_increment=1`,
  )) as { data?: MetaCampaignInsight[] };

  return result.data ?? [];
}

export async function getCampaignInsightsTimeSeries(
  campaignId: string,
  days = 7,
): Promise<MetaCampaignInsight[]> {
  const fields = "spend,impressions,clicks,date_start";
  const timeRange = JSON.stringify({
    since: isoDateDaysAgo(days),
    until: isoDateDaysAgo(0),
  });
  const result = (await metaApiGet(
    `/${campaignId}/insights?fields=${encodeURIComponent(fields)}&time_range=${encodeURIComponent(timeRange)}&time_increment=1`,
  )) as { data?: MetaCampaignInsight[] };

  return result.data ?? [];
}

// ─── Ad Sets ────────────────────────────────────────────────────────────────

export async function listAdSets(
  campaignId: string,
  fields = "id,name,campaign_id,status,daily_budget,targeting,optimization_goal,billing_event",
): Promise<MetaAdSetDetail[]> {
  const result = (await metaApiGet(
    `/${campaignId}/adsets?fields=${encodeURIComponent(fields)}&limit=50`,
  )) as { data?: MetaAdSetDetail[] };

  return result.data ?? [];
}

// ─── Ads ────────────────────────────────────────────────────────────────────

export async function listAds(
  adSetId: string,
  fields = "id,name,adset_id,creative{id,name},status,preview_shareable_link",
): Promise<MetaAdDetail[]> {
  const result = (await metaApiGet(
    `/${adSetId}/ads?fields=${encodeURIComponent(fields)}&limit=50`,
  )) as { data?: MetaAdDetail[] };

  return result.data ?? [];
}

// ─── Campaign Details ─────────────────────────────────────────────────────────

export async function getCampaignDetails(
  campaignId: string,
): Promise<MetaCampaignDetails> {
  const fields =
    "id,name,objective,status,effective_status,daily_budget,budget_remaining,created_time,updated_time,adsets{id,name,status,daily_budget,targeting}";
  const result = (await metaApiGet(
    `/${campaignId}?fields=${encodeURIComponent(fields)}`,
  )) as MetaCampaignDetails;

  return result;
}

// ─── Campaign Updates ─────────────────────────────────────────────────────────

export async function updateCampaignStatus(
  campaignId: string,
  status: "ACTIVE" | "PAUSED" | "ARCHIVED",
): Promise<{ success: boolean }> {
  await metaApiPost(`/${campaignId}`, { status });
  return { success: true };
}

export async function updateCampaignBudget(
  campaignId: string,
  dailyBudgetPaise: number,
): Promise<{ success: boolean }> {
  await metaApiPost(`/${campaignId}`, { daily_budget: dailyBudgetPaise });
  return { success: true };
}

export async function updateCampaignName(
  campaignId: string,
  name: string,
): Promise<{ success: boolean }> {
  await metaApiPost(`/${campaignId}`, { name });
  return { success: true };
}

export async function deleteCampaign(
  campaignId: string,
): Promise<{ success: boolean }> {
  await metaApiDelete(`/${campaignId}`);
  return { success: true };
}

// ─── Ad Preview ─────────────────────────────────────────────────────────────

export async function generateAdPreview(
  adId: string,
  format:
    "DESKTOP_FEED_STANDARD" | "MOBILE_FEED_STANDARD" = "DESKTOP_FEED_STANDARD",
): Promise<{ previewUrl: string }> {
  const result = (await metaApiPost(`/${adId}/previews`, {
    ad_format: format,
  })) as { data?: Array<{ body: string }> };

  const previewUrl = result.data?.[0]?.body ?? "";
  return { previewUrl };
}
