import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createPausedCarouselCampaign,
  createPausedDPARetargetingCampaign,
  deleteCampaign,
  type CarouselCard,
} from '@/lib/meta/marketing-api'
import { getMetaPixelId } from '@/lib/meta/config'
import { logWarn, logError } from '@/lib/logger'

const DEFAULT_INTERESTS = [
  { id: '6003012446280', name: 'Home decor' },
  { id: '6003012476280', name: 'Interior design' },
  { id: '6003139266462', name: 'Office supplies' },
  { id: '6003002346380', name: 'Corporate gifts' },
  { id: '6003066707182', name: 'Small business' },
]

function buildTargetingFromConfig(config?: TargetingConfig): Record<string, unknown> {
  const ageMin = config?.ageMin ?? 25
  const ageMax = config?.ageMax ?? 55
  const countries = config?.countries ?? ['IN']
  const interests = config?.interests ?? DEFAULT_INTERESTS
  const placements = config?.placements ?? ['facebook', 'instagram', 'audience_network', 'messenger']

  return {
    geo_locations: {
      countries,
      location_types: ['home', 'recent'],
    },
    age_min: ageMin,
    age_max: ageMax,
    flexible_spec: [
      {
        interests,
      },
    ],
    publisher_platforms: placements,
    facebook_positions: ['feed', 'marketplace', 'video_feed', 'right_hand_column', 'instant_article'],
    instagram_positions: ['stream', 'story', 'explore', 'reels'],
    device_platforms: ['mobile', 'desktop'],
  }
}

export type TargetingConfig = {
  ageMin?: number
  ageMax?: number
  countries?: string[]
  interests?: Array<{ id: string; name: string }>
  placements?: string[]
}

export type CampaignCreationParams = {
  categoryName: string
  dailyBudgetPaise: number
  siteUrl: string
  pageId: string
  createDpa: boolean
  productLimit: number
  duplicateFromId?: string
  targetingConfig?: TargetingConfig
}

export type CampaignCreationResult = {
  carousel: {
    campaignId: string
    adSetId: string
    creativeId: string
    adId: string
  }
  dpa: {
    campaignId: string
    adSetId: string
    creativeId: string
    adId: string
  } | null
  cards: CarouselCard[]
  idempotencyKey: string
}

export type CreatedEntityIds = {
  campaignId?: string
  adSetId?: string
  creativeId?: string
  adId?: string
  dpaCampaignId?: string
  dpaAdSetId?: string
  dpaCreativeId?: string
  dpaAdId?: string
}

export async function resolveDuplicateParams(
  supabase: SupabaseClient,
  params: CampaignCreationParams,
): Promise<CampaignCreationParams> {
  if (!params.duplicateFromId) return params

  const { data: sourceCampaign } = await supabase
    .from('meta_ad_campaigns')
    .select('category_name, daily_budget_paise, page_id, pixel_id, name, dpa_campaign_id')
    .eq('campaign_id', params.duplicateFromId)
    .maybeSingle()

  if (!sourceCampaign) return params

  return {
    ...params,
    categoryName: sourceCampaign.category_name ?? params.categoryName,
    dailyBudgetPaise: sourceCampaign.daily_budget_paise ?? params.dailyBudgetPaise,
    pageId: sourceCampaign.page_id ?? params.pageId,
    createDpa: sourceCampaign.dpa_campaign_id ? true : params.createDpa,
  }
}

export async function listActiveCategories(
  supabase: SupabaseClient,
): Promise<{ id: string; name: string }[]> {
  const { data } = await supabase
    .from('shelf_categories')
    .select('id, name')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  return (data ?? []) as { id: string; name: string }[]
}

export async function fetchProductsForAd(
  supabase: SupabaseClient,
  categoryName: string,
  productLimit: number,
): Promise<{
  products: Array<Record<string, unknown>>
  categoryIds: string[]
}> {
  const { data: categories, error: catError } = await supabase
    .from('shelf_categories')
    .select('id, name')
    .ilike('name', `%${categoryName}%`)
    .eq('is_active', true)

  if (catError) {
    throw new Error(`Category lookup failed: ${catError.message}`)
  }

  if (!categories || categories.length === 0) {
    throw new Error(`No active category found matching "${categoryName}".`)
  }

  const categoryIds = categories.map((c: { id: string }) => c.id)

  // Try new-arrival products first (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: products, error: prodError } = await supabase
    .from('shelf_products')
    .select(
      'id, name, slug, thumbnail_url, base_price, created_at, category_id, shelf_skus(sku_code, price, variant_image_url, is_available, stock_quantity)',
    )
    .in('category_id', categoryIds)
    .eq('is_active', true)
    .eq('is_archived', false)
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: false })
    .limit(productLimit)

  if (prodError) {
    throw new Error(`Product fetch failed: ${prodError.message}`)
  }

  let finalProducts = products ?? []

  if (finalProducts.length === 0) {
    // Fallback: newest products regardless of 7-day window
    const { data: fallbackProducts, error: fallbackError } = await supabase
      .from('shelf_products')
      .select(
        'id, name, slug, thumbnail_url, base_price, created_at, category_id, shelf_skus(sku_code, price, variant_image_url, is_available, stock_quantity)',
      )
      .in('category_id', categoryIds)
      .eq('is_active', true)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(productLimit)

    if (fallbackError) {
      throw new Error(`Product fallback fetch failed: ${fallbackError.message}`)
    }

    finalProducts = fallbackProducts ?? []
  }

  if (finalProducts.length === 0) {
    throw new Error(`No active products found in category "${categoryName}".`)
  }

  return { products: finalProducts, categoryIds }
}

export function buildCarouselCards(
  products: Array<Record<string, unknown>>,
  siteUrl: string,
  categoryName: string,
  productLimit: number,
): CarouselCard[] {
  const cards: CarouselCard[] = []

  for (const product of products) {
    const skus = (product.shelf_skus ?? []) as Array<{
      sku_code: string
      price: number
      variant_image_url: string | null
      is_available: boolean
      stock_quantity: number
    }>

    const firstAvailableSku = skus.find(
      (s) => s.is_available && s.stock_quantity > 0,
    )

    if (!firstAvailableSku) continue

    const imageUrl = firstAvailableSku.variant_image_url || (product.thumbnail_url as string | null) || null
    if (!imageUrl) continue

    const price = firstAvailableSku.price || (product.base_price as number) || 0
    const productUrl = `${siteUrl.replace(/\/+$/, '')}/3d-shop/product/${product.slug}?sku=${firstAvailableSku.sku_code}`

    cards.push({
      link: productUrl,
      picture: imageUrl,
      name: product.name as string,
      description: `₹${Math.round(price).toLocaleString('en-IN')} — ${categoryName}`,
    })

    if (cards.length >= productLimit) break
  }

  if (cards.length === 0) {
    throw new Error('No usable products with images and available stock were found in this category.')
  }

  return cards
}

export function computeIdempotencyKey(userId: string, categoryName: string, dailyBudgetPaise: number): string {
  return `${userId}:${categoryName}:${dailyBudgetPaise}:${new Date().toISOString().slice(0, 10)}`
}

export async function cleanupMetaEntities(ids: CreatedEntityIds): Promise<void> {
  logWarn('Rolling back Meta campaign entities', {
    module: 'meta-ads',
    metadata: { ids },
  })

  const entities = [
    ids.dpaAdId,
    ids.dpaCreativeId,
    ids.dpaAdSetId,
    ids.dpaCampaignId,
    ids.adId,
    ids.creativeId,
    ids.adSetId,
    ids.campaignId,
  ].filter(Boolean) as string[]

  for (const id of entities) {
    try {
      await deleteCampaign(id)
    } catch {
      // Best-effort cleanup; some may already be gone
    }
  }
}

export async function createMetaAdCampaign(
  supabase: SupabaseClient,
  params: CampaignCreationParams,
  userId: string,
): Promise<CampaignCreationResult> {
  const timestamp = new Date().toISOString().slice(0, 10)
  const pixelId = getMetaPixelId()

  const { products, categoryIds } = await fetchProductsForAd(supabase, params.categoryName, params.productLimit)
  const cards = buildCarouselCards(products, params.siteUrl, params.categoryName, params.productLimit)

  const targeting = buildTargetingFromConfig(params.targetingConfig)

  const createdIds: CreatedEntityIds = {}

  let carouselResult: CampaignCreationResult['carousel'] | null = null
  let dpaResult: CampaignCreationResult['dpa'] = null

  try {
    carouselResult = await createPausedCarouselCampaign({
      campaignName: `Flux3D New Arrivals — ${params.categoryName} — ${timestamp}`,
      adSetName: `Cold Audience — ${params.categoryName} — India 25-55 — ${timestamp}`,
      adName: `Carousel Ad — ${params.categoryName} — ${timestamp}`,
      creativeName: `Carousel Creative — ${cards.length} products — ${timestamp}`,
      dailyBudgetPaise: params.dailyBudgetPaise,
      pageId: params.pageId,
      siteUrl: params.siteUrl,
      message: `Discover our newest 3D-printed arrivals — crafted for modern offices & homes. Premium quality, pan-India delivery.`,
      cards,
      targeting,
    })

    createdIds.campaignId = carouselResult.campaignId
    createdIds.adSetId = carouselResult.adSetId
    createdIds.creativeId = carouselResult.creativeId
    createdIds.adId = carouselResult.adId
  } catch (createErr) {
    logError('Carousel campaign creation failed — rolling back', {
      module: 'meta-ads',
      error: createErr instanceof Error ? createErr : new Error(String(createErr)),
    })
    await cleanupMetaEntities(createdIds)
    throw createErr instanceof Error ? createErr : new Error(String(createErr))
  }

  if (params.createDpa) {
    try {
      dpaResult = await createPausedDPARetargetingCampaign({
        campaignName: `Flux3D DPA Retargeting — ${params.categoryName} — ${timestamp}`,
        adSetName: `Retargeting — Viewed Not Purchased — ${params.categoryName} — ${timestamp}`,
        adName: `DPA Ad — ${params.categoryName} — ${timestamp}`,
        creativeName: `DPA Creative — ${params.categoryName} — ${timestamp}`,
        dailyBudgetPaise: Math.round(params.dailyBudgetPaise * 0.5),
        pageId: params.pageId,
        siteUrl: params.siteUrl,
        message: `Still thinking about it? Your favorites are waiting. Complete your order now with secure checkout & pan-India delivery.`,
      })

      createdIds.dpaCampaignId = dpaResult.campaignId
      createdIds.dpaAdSetId = dpaResult.adSetId
      createdIds.dpaCreativeId = dpaResult.creativeId
      createdIds.dpaAdId = dpaResult.adId
    } catch (dpaErr) {
      logWarn('DPA campaign creation failed (non-critical)', {
        module: 'meta-ads',
        error: dpaErr instanceof Error ? dpaErr : new Error(String(dpaErr)),
      })
    }
  }

  // Persist carousel record to DB
  const idempotencyKey = computeIdempotencyKey(userId, params.categoryName, params.dailyBudgetPaise)

  const { data: insertedCarousel, error: insertError } = await supabase
    .from('meta_ad_campaigns')
    .insert({
      campaign_id: carouselResult.campaignId,
      adset_id: carouselResult.adSetId,
      creative_id: carouselResult.creativeId,
      ad_id: carouselResult.adId,
      name: `Flux3D New Arrivals — ${params.categoryName} — ${timestamp}`,
      objective: 'SALES',
      status: 'PAUSED',
      daily_budget_paise: params.dailyBudgetPaise,
      category_name: params.categoryName,
      category_id: categoryIds[0] ?? null,
      product_count: cards.length,
      pixel_id: pixelId,
      page_id: params.pageId,
      targeting_config: params.targetingConfig ?? null,
      created_by: userId,
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .single()

  if (insertError) {
    logError('Failed to persist ad record to DB — rolling back Meta campaigns', {
      module: 'meta-ads',
      error: new Error(insertError.message),
      metadata: { insertError, campaignId: carouselResult.campaignId },
    })
    await cleanupMetaEntities(createdIds)
    throw new Error(`Campaign created in Meta but failed to save locally. Meta campaigns have been archived to prevent orphaned spend. Details: ${insertError.message}`)
  }

  // If DPA was created, insert a separate row and link it
  let dpaRecordId: string | null = null
  if (dpaResult) {
    const { data: insertedDpa, error: dpaInsertError } = await supabase
      .from('meta_ad_campaigns')
      .insert({
        campaign_id: dpaResult.campaignId,
        adset_id: dpaResult.adSetId,
        creative_id: dpaResult.creativeId,
        ad_id: dpaResult.adId,
        name: `Flux3D DPA Retargeting — ${params.categoryName} — ${timestamp}`,
        objective: 'SALES',
        status: 'PAUSED',
        daily_budget_paise: Math.round(params.dailyBudgetPaise * 0.5),
        category_name: params.categoryName,
        category_id: categoryIds[0] ?? null,
        product_count: 0,
        pixel_id: pixelId,
        page_id: params.pageId,
        targeting_config: null,
        created_by: userId,
      })
      .select('id')
      .single()

    if (dpaInsertError) {
      logWarn('DPA campaign DB insert failed — DPA will be unlinked', {
        module: 'meta-ads',
        error: new Error(dpaInsertError.message),
      })
    } else if (insertedDpa) {
      dpaRecordId = insertedDpa.id
      await supabase
        .from('meta_ad_campaigns')
        .update({ dpa_campaign_record_id: dpaRecordId, dpa_campaign_id: dpaResult.campaignId })
        .eq('id', insertedCarousel!.id)
    }
  }

  return {
    carousel: carouselResult,
    dpa: dpaResult,
    cards,
    idempotencyKey,
  }
}
