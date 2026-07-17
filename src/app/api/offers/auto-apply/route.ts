import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'

const PUBLIC_OFFER_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
}

export async function GET() {
  try {
    const supabase = createAdminSupabaseClient()
    const now = new Date().toISOString()

    const { data: offers, error } = await supabase
      .from('offers')
      .select('*')
      .eq('is_active', true)
      .lte('starts_at', now)
      .gte('ends_at', now)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('[offers/auto-apply] Query failed:', error.message)
      return NextResponse.json({ valid: false, offer: null, debug: error.message })
    }

    const offer = offers?.[0] ?? null

    if (!offer) {
      return NextResponse.json({ valid: false, offer: null }, { headers: PUBLIC_OFFER_CACHE_HEADERS })
    }

    if (offer.usage_limit != null && (offer.used_count ?? 0) >= offer.usage_limit) {
      return NextResponse.json({ valid: false, offer: null }, { headers: PUBLIC_OFFER_CACHE_HEADERS })
    }

    return NextResponse.json({
      valid: true,
      offer: {
        id: offer.id,
        title: offer.title,
        code: offer.badge_text ?? offer.sale_label ?? offer.title ?? 'SALE',
        discount_type: offer.offer_type === 'buy_x_get_y' ? 'percentage' : offer.offer_type,
        discount_value: Number(offer.discount_value),
        max_discount: offer.max_discount ? Number(offer.max_discount) : null,
        min_order_value: Number(offer.min_order_value ?? 0),
        discount_amount: 0,
        sale_label: offer.sale_label,
        badge_text: offer.badge_text,
        applicable_categories: offer.applicable_categories ?? null,
        applicable_materials: offer.applicable_materials ?? null,
        applicable_products: offer.applicable_products ?? null,
        free_shipping: offer.offer_type === 'free_shipping',
      },
    }, { headers: PUBLIC_OFFER_CACHE_HEADERS })
  } catch (error) {
    console.error(
      '[offers/auto-apply] Unexpected failure:',
      error instanceof Error ? error.message : error
    )
    return NextResponse.json({ valid: false, offer: null })
  }
}
