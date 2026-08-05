import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import {
  createPausedCarouselCampaign,
  createPausedDPARetargetingCampaign,
  type CarouselCard,
} from '@/lib/meta/marketing-api'
import { getMetaPixelId } from '@/lib/meta/config'

export const runtime = 'nodejs'

/**
 * POST /api/admin/ads/create
 *
 * Creates a PAUSED Meta carousel ad campaign for new-arrival products
 * in a given category, plus an optional PAUSED DPA retargeting campaign.
 *
 * Body:
 *   categoryName?: string  (default: "3D Printed Home Decor")
 *   dailyBudgetPaise?: number  (default: 15000 = ₹150)
 *   siteUrl?: string  (default: NEXT_PUBLIC_SITE_URL or https://flux3d.in)
 *   pageId?: string  (falls back to META_PAGE_ID env)
 *   createDpa?: boolean  (default: true)
 *   productLimit?: number  (default: 10)
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // ─── Auth check ────────────────────────────────────────────────────────
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.is_admin) {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 })
    }

    // ─── Parse body ────────────────────────────────────────────────────────
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const categoryName = typeof body.categoryName === 'string' ? body.categoryName : '3D Printed Home Decor'
    const dailyBudgetPaise =
      typeof body.dailyBudgetPaise === 'number' ? body.dailyBudgetPaise : 15000
    const siteUrl =
      typeof body.siteUrl === 'string'
        ? body.siteUrl
        : (process.env.NEXT_PUBLIC_SITE_URL || 'https://flux3d.in')
    const pageId =
      typeof body.pageId === 'string'
        ? body.pageId
        : (process.env.META_PAGE_ID || null)
    const createDpa = typeof body.createDpa === 'boolean' ? body.createDpa : true
    const productLimit = typeof body.productLimit === 'number' ? body.productLimit : 10

    if (!pageId) {
      return NextResponse.json(
        {
          error:
            'Missing Facebook Page ID. Provide it in the request body as "pageId" or set META_PAGE_ID in your environment. You can find your Page ID in Facebook Page Settings → Page Info.',
        },
        { status: 400 },
      )
    }

    // ─── Fetch target category IDs ─────────────────────────────────────────
    const { data: categories, error: catError } = await supabase
      .from('shelf_categories')
      .select('id, name')
      .ilike('name', `%${categoryName}%`)
      .eq('is_active', true)

    if (catError) {
      return NextResponse.json(
        { error: `Category lookup failed: ${catError.message}` },
        { status: 500 },
      )
    }

    if (!categories || categories.length === 0) {
      return NextResponse.json(
        {
          error: `No active category found matching "${categoryName}". Please check your category name in the 3D Shop admin.`,
          availableCategories: await listActiveCategories(supabase),
        },
        { status: 404 },
      )
    }

    const categoryIds = categories.map((c: { id: string }) => c.id)

    // ─── Fetch new-arrival products ────────────────────────────────────────
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
      return NextResponse.json(
        { error: `Product fetch failed: ${prodError.message}` },
        { status: 500 },
      )
    }

    if (!products || products.length === 0) {
      // Fallback: just take the newest products in the category regardless of 7-day window
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

      if (fallbackError || !fallbackProducts || fallbackProducts.length === 0) {
        return NextResponse.json(
          {
            error: `No active products found in category "${categoryName}".`,
            suggestion: 'Add products to this category or choose a different one.',
            availableCategories: await listActiveCategories(supabase),
          },
          { status: 404 },
        )
      }

      products.push(...fallbackProducts)
    }

    // ─── Build carousel cards ──────────────────────────────────────────────
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

      const imageUrl =
        firstAvailableSku.variant_image_url ||
        product.thumbnail_url ||
        null

      if (!imageUrl) continue

      const price = firstAvailableSku.price || product.base_price || 0
      const productUrl = `${siteUrl.replace(/\/+$/, '')}/3d-shop/product/${product.slug}?sku=${firstAvailableSku.sku_code}`

      cards.push({
        link: productUrl,
        picture: imageUrl,
        name: product.name,
        description: `₹${Math.round(price).toLocaleString('en-IN')} — ${categoryName}`,
      })

      if (cards.length >= productLimit) break
    }

    if (cards.length === 0) {
      return NextResponse.json(
        {
          error:
            'No usable products with images and available stock were found in this category.',
          suggestion: 'Ensure products have thumbnail images and at least one SKU in stock.',
        },
        { status: 400 },
      )
    }

    // ─── Create campaigns ──────────────────────────────────────────────────
    const timestamp = new Date().toISOString().slice(0, 10)
    const pixelId = getMetaPixelId()

    const carouselResult = await createPausedCarouselCampaign({
      campaignName: `Flux3D New Arrivals — ${categoryName} — ${timestamp}`,
      adSetName: `Cold Audience — ${categoryName} — India 25-55 — ${timestamp}`,
      adName: `Carousel Ad — ${categoryName} — ${timestamp}`,
      creativeName: `Carousel Creative — ${cards.length} products — ${timestamp}`,
      dailyBudgetPaise,
      pageId,
      siteUrl,
      message: `Discover our newest 3D-printed arrivals — crafted for modern offices & homes. Premium quality, pan-India delivery.`,
      cards,
    })

    let dpaResult = null
    if (createDpa) {
      try {
        dpaResult = await createPausedDPARetargetingCampaign({
          campaignName: `Flux3D DPA Retargeting — ${categoryName} — ${timestamp}`,
          adSetName: `Retargeting — Viewed Not Purchased — ${categoryName} — ${timestamp}`,
          adName: `DPA Ad — ${categoryName} — ${timestamp}`,
          creativeName: `DPA Creative — ${categoryName} — ${timestamp}`,
          dailyBudgetPaise: Math.round(dailyBudgetPaise * 0.5), // 50% of main budget
          pageId,
          siteUrl,
          message: `Still thinking about it? Your favorites are waiting. Complete your order now with secure checkout & pan-India delivery.`,
        })
      } catch (dpaErr) {
        // DPA is best-effort; don't fail the whole request
        console.warn('DPA campaign creation failed (non-critical):', dpaErr)
      }
    }

    // ─── Persist ad record to DB ──────────────────────────────────────────
    const { error: insertError } = await supabase.from('meta_ad_campaigns').insert({
      campaign_id: carouselResult.campaignId,
      adset_id: carouselResult.adSetId,
      creative_id: carouselResult.creativeId,
      ad_id: carouselResult.adId,
      name: `Flux3D New Arrivals — ${categoryName} — ${timestamp}`,
      objective: 'SALES',
      status: 'PAUSED',
      daily_budget_paise: dailyBudgetPaise,
      category_name: categoryName,
      product_count: cards.length,
      pixel_id: pixelId,
      page_id: pageId,
      dpa_campaign_id: dpaResult?.campaignId ?? null,
      created_by: user.id,
    })

    if (insertError) {
      console.warn('Failed to persist ad record to DB:', insertError)
    }

    return NextResponse.json({
      success: true,
      status: 'PAUSED',
      carousel: carouselResult,
      dpa: dpaResult
        ? {
            campaignId: dpaResult.campaignId,
            adSetId: dpaResult.adSetId,
            creativeId: dpaResult.creativeId,
            adId: dpaResult.adId,
          }
        : null,
      productsUsed: cards.map((c) => ({ name: c.name, price: c.description })),
      metaAdsManagerUrl: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${process.env.META_AD_ACCOUNT_ID}`,
      note: 'Both campaigns are created in PAUSED status. Go to Meta Ads Manager and click "Publish" when you are ready.',
    })
  } catch (err) {
    console.error('Meta ad creation error:', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Failed to create Meta ad campaign',
        help: 'Ensure META_SYSTEM_USER_TOKEN, META_AD_ACCOUNT_ID, META_CATALOG_ID, META_PAGE_ID, and NEXT_PUBLIC_META_PIXEL_ID are configured correctly.',
      },
      { status: 500 },
    )
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function listActiveCategories(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
): Promise<{ id: string; name: string }[]> {
  const { data } = await supabase
    .from('shelf_categories')
    .select('id, name')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  return (data ?? []) as { id: string; name: string }[]
}
