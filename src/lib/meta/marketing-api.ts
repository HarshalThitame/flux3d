import { createServerClient } from '@/lib/supabase/server'
import { getMetaApiHeaders, getMetaAdAccountId, getMetaGraphBase, getMetaCatalogId, getMetaPixelId } from '@/lib/meta/config'

// ─── Types ─────────────────────────────────────────────────────────────────

export type MetaCampaign = {
  id: string
  name: string
  objective: string
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED'
  effective_status: string
  daily_budget?: string
  budget_remaining?: string
  created_time: string
  updated_time: string
}

export type MetaAdSet = {
  id: string
  name: string
  campaign_id: string
  status: string
  daily_budget: string
  targeting: Record<string, unknown>
}

export type MetaAdCreative = {
  id: string
  name: string
  object_story_spec?: Record<string, unknown>
}

export type MetaAd = {
  id: string
  name: string
  adset_id: string
  creative: { id: string }
  status: string
}

export type CarouselCard = {
  link: string
  picture: string
  name: string
  description: string
}

export type CreateCampaignInput = {
  name: string
  objective: 'SALES' | 'AWARENESS' | 'TRAFFIC' | 'CONVERSIONS'
  status: 'PAUSED' | 'ACTIVE'
  special_ad_categories?: string[]
}

export type CreateAdSetInput = {
  campaignId: string
  name: string
  dailyBudgetPaise: number
  pixelId: string
  targeting: Record<string, unknown>
  optimizationGoal?: string
  billingEvent?: string
  promotedObject?: Record<string, unknown>
}

export type CreateCarouselCreativeInput = {
  name: string
  pageId: string
  link: string
  message: string
  cards: CarouselCard[]
  callToAction?: string
}

export type CreateAdInput = {
  adsetId: string
  name: string
  creativeId: string
  status: 'PAUSED' | 'ACTIVE'
}

export type CreateAdCampaignResult = {
  campaignId: string
  adSetId: string
  creativeId: string
  adId: string
}

// ─── Low-level fetch wrapper ────────────────────────────────────────────────

async function metaApiPost(path: string, body: Record<string, unknown>) {
  const base = getMetaGraphBase()
  const headers = getMetaApiHeaders()
  const url = `${base}${path}`

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const result = (await response.json().catch(() => ({}))) as Record<string, unknown>

  if (!response.ok) {
    const error = (result.error as Record<string, unknown>) ?? result
    throw new Error(
      `Meta API error ${response.status}: ${JSON.stringify(error)}`,
    )
  }

  if (result.error) {
    throw new Error(`Meta API error: ${JSON.stringify(result.error)}`)
  }

  return result
}

async function metaApiGet(path: string) {
  const base = getMetaGraphBase()
  const headers = getMetaApiHeaders()
  const url = `${base}${path}`

  const response = await fetch(url, { headers })
  const result = (await response.json().catch(() => ({}))) as Record<string, unknown>

  if (!response.ok) {
    const error = (result.error as Record<string, unknown>) ?? result
    throw new Error(
      `Meta API error ${response.status}: ${JSON.stringify(error)}`,
    )
  }

  return result
}

// ─── Campaign ───────────────────────────────────────────────────────────────

export async function createCampaign(
  input: CreateCampaignInput,
): Promise<{ id: string }> {
  const adAccountId = getMetaAdAccountId()
  const result = (await metaApiPost(`/${adAccountId}/campaigns`, {
    name: input.name,
    objective: input.objective,
    status: input.status,
    special_ad_categories: input.special_ad_categories ?? [],
  })) as { id: string }

  return result
}

export async function listCampaigns(
  fields = 'id,name,objective,status,effective_status,daily_budget,budget_remaining,created_time,updated_time',
): Promise<MetaCampaign[]> {
  const adAccountId = getMetaAdAccountId()
  const result = (await metaApiGet(
    `/${adAccountId}/campaigns?fields=${encodeURIComponent(fields)}&limit=50`,
  )) as { data?: MetaCampaign[] }

  return result.data ?? []
}

// ─── Ad Set ─────────────────────────────────────────────────────────────────

export async function createAdSet(input: CreateAdSetInput): Promise<{ id: string }> {
  const adAccountId = getMetaAdAccountId()
  const result = (await metaApiPost(`/${adAccountId}/adsets`, {
    campaign_id: input.campaignId,
    name: input.name,
    daily_budget: input.dailyBudgetPaise,
    billing_event: input.billingEvent ?? 'IMPRESSIONS',
    optimization_goal: input.optimizationGoal ?? 'OFFSITE_CONVERSIONS',
    targeting: input.targeting,
    promoted_object: input.promotedObject,
    status: 'PAUSED',
  })) as { id: string }

  return result
}

// ─── Ad Creative ────────────────────────────────────────────────────────────

export async function createCarouselCreative(
  input: CreateCarouselCreativeInput,
): Promise<{ id: string }> {
  const adAccountId = getMetaAdAccountId()

  const childAttachments = input.cards.map((card) => ({
    link: card.link,
    picture: card.picture,
    name: card.name,
    description: card.description,
  }))

  const result = (await metaApiPost(`/${adAccountId}/adcreatives`, {
    name: input.name,
    object_story_spec: {
      page_id: input.pageId,
      link_data: {
        link: input.link,
        message: input.message,
        child_attachments: childAttachments,
        call_to_action: {
          type: input.callToAction ?? 'SHOP_NOW',
          value: { link: input.link },
        },
      },
    },
  })) as { id: string }

  return result
}

// ─── Ad ─────────────────────────────────────────────────────────────────────

export async function createAd(input: CreateAdInput): Promise<{ id: string }> {
  const adAccountId = getMetaAdAccountId()
  const result = (await metaApiPost(`/${adAccountId}/ads`, {
    name: input.name,
    adset_id: input.adsetId,
    creative: { creative_id: input.creativeId },
    status: input.status,
  })) as { id: string }

  return result
}

// ─── Orchestrated campaign builder ──────────────────────────────────────────

export async function createPausedCarouselCampaign(params: {
  campaignName: string
  adSetName: string
  adName: string
  creativeName: string
  dailyBudgetPaise: number
  pageId: string
  siteUrl: string
  message: string
  cards: CarouselCard[]
}): Promise<CreateAdCampaignResult> {
  const pixelId = getMetaPixelId()

  // 1. Campaign
  const campaign = await createCampaign({
    name: params.campaignName,
    objective: 'SALES',
    status: 'PAUSED',
  })

  // 2. Ad Set with cold-audience targeting
  const targeting = buildColdAudienceTargeting()
  const adSet = await createAdSet({
    campaignId: campaign.id,
    name: params.adSetName,
    dailyBudgetPaise: params.dailyBudgetPaise,
    pixelId,
    targeting,
    optimizationGoal: 'OFFSITE_CONVERSIONS',
    billingEvent: 'IMPRESSIONS',
    promotedObject: {
      pixel_id: pixelId,
      custom_event_type: 'PURCHASE',
    },
  })

  // 3. Creative
  const creative = await createCarouselCreative({
    name: params.creativeName,
    pageId: params.pageId,
    link: `${params.siteUrl.replace(/\/+$/, '')}/3d-shop`,
    message: params.message,
    cards: params.cards,
  })

  // 4. Ad
  const ad = await createAd({
    adsetId: adSet.id,
    name: params.adName,
    creativeId: creative.id,
    status: 'PAUSED',
  })

  return {
    campaignId: campaign.id,
    adSetId: adSet.id,
    creativeId: creative.id,
    adId: ad.id,
  }
}

// ─── DPA Retargeting campaign builder ───────────────────────────────────────

export async function createPausedDPARetargetingCampaign(params: {
  campaignName: string
  adSetName: string
  adName: string
  creativeName: string
  dailyBudgetPaise: number
  pageId: string
  siteUrl: string
  message: string
}): Promise<CreateAdCampaignResult> {
  const pixelId = getMetaPixelId()
  const catalogId = getMetaCatalogId()

  // 1. Campaign (DPA uses same SALES objective)
  const campaign = await createCampaign({
    name: params.campaignName,
    objective: 'SALES',
    status: 'PAUSED',
  })

  // 2. Ad Set optimized for DPA
  const targeting = buildRetargetingTargeting(pixelId)
  const adSet = await createAdSet({
    campaignId: campaign.id,
    name: params.adSetName,
    dailyBudgetPaise: params.dailyBudgetPaise,
    pixelId,
    targeting,
    optimizationGoal: 'OFFSITE_CONVERSIONS',
    billingEvent: 'IMPRESSIONS',
    promotedObject: {
      pixel_id: pixelId,
      custom_event_type: 'PURCHASE',
      product_set_id: `all_products_${catalogId}`, // Meta auto-creates a product set per catalog
    },
  })

  // 3. DPA Creative (template-based)
  const creative = await createDPACreative({
    name: params.creativeName,
    pageId: params.pageId,
    link: `${params.siteUrl.replace(/\/+$/, '')}/3d-shop`,
    message: params.message,
  })

  // 4. Ad
  const ad = await createAd({
    adsetId: adSet.id,
    name: params.adName,
    creativeId: creative.id,
    status: 'PAUSED',
  })

  return {
    campaignId: campaign.id,
    adSetId: adSet.id,
    creativeId: creative.id,
    adId: ad.id,
  }
}

async function createDPACreative(params: {
  name: string
  pageId: string
  link: string
  message: string
}): Promise<{ id: string }> {
  const adAccountId = getMetaAdAccountId()

  const result = (await metaApiPost(`/${adAccountId}/adcreatives`, {
    name: params.name,
    object_story_spec: {
      page_id: params.pageId,
      template_data: {
        template_type: 'DYNAMIC_PRODUCT_ADS',
        call_to_action: {
          type: 'SHOP_NOW',
          value: { link: params.link },
        },
        description: '{{product.description | truncate:90}}',
        link: params.link,
        message: params.message,
        name: '{{product.name | truncate:40}}',
        picture: '{{product.image_link}}',
      },
    },
  })) as { id: string }

  return result
}

// ─── Targeting builders ─────────────────────────────────────────────────────

function buildColdAudienceTargeting(): Record<string, unknown> {
  return {
    geo_locations: {
      countries: ['IN'],
      location_types: ['home', 'recent'],
    },
    age_min: 25,
    age_max: 55,
    flexible_spec: [
      {
        interests: [
          { id: '6003012446280', name: 'Home decor' },
          { id: '6003012476280', name: 'Interior design' },
          { id: '6003139266462', name: 'Office supplies' },
          { id: '6003002346380', name: 'Corporate gifts' },
          { id: '6003066707182', name: 'Small business' },
        ],
      },
    ],
    publisher_platforms: ['facebook', 'instagram', 'audience_network', 'messenger'],
    facebook_positions: ['feed', 'marketplace', 'video_feed', 'right_hand_column', 'instant_article'],
    instagram_positions: ['stream', 'story', 'explore', 'reels'],
    device_platforms: ['mobile', 'desktop'],
  }
}

function buildRetargetingTargeting(pixelId: string): Record<string, unknown> {
  return {
    geo_locations: {
      countries: ['IN'],
      location_types: ['home', 'recent'],
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
            event_type: 'PURCHASE',
            retention_seconds: 2592000, // 30 days
          },
        ],
        inclusion_rules: [
          {
            event_type: 'VIEW_CONTENT',
            retention_seconds: 604800, // 7 days
          },
        ],
      },
    ],
    publisher_platforms: ['facebook', 'instagram', 'audience_network', 'messenger'],
    facebook_positions: ['feed', 'marketplace', 'video_feed'],
    instagram_positions: ['stream', 'story', 'explore', 'reels'],
    device_platforms: ['mobile', 'desktop'],
  }
}

// ─── Product data fetcher for carousel ──────────────────────────────────────

export type AdProductCard = {
  skuCode: string
  slug: string
  name: string
  price: number
  imageUrl: string | null
  categoryName: string | null
}

export async function fetchNewArrivalProductsForAd(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  categoryName: string,
  limit = 10,
): Promise<AdProductCard[]> {
  const { data: products, error } = await supabase
    .from('shelf_products')
    .select(
      'id, name, slug, thumbnail_url, base_price, category:shelf_categories(name), shelf_skus(sku_code, price, variant_image_url, is_available)',
    )
    .eq('is_active', true)
    .eq('is_archived', false)
    .ilike('shelf_categories.name', `%${categoryName}%`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`)
  }

  const cards: AdProductCard[] = []

  for (const product of products ?? []) {
    const skus = (product.shelf_skus ?? []) as Array<{
      sku_code: string
      price: number
      variant_image_url: string | null
      is_available: boolean
    }>

    for (const sku of skus) {
      if (!sku.is_available) continue

      cards.push({
        skuCode: sku.sku_code,
        slug: product.slug,
        name: product.name,
        price: sku.price || product.base_price || 0,
        imageUrl: sku.variant_image_url || product.thumbnail_url,
        categoryName: categoryName,
      })

      break // one SKU per product for the carousel
    }

    if (cards.length >= limit) break
  }

  return cards
}
