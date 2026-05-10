import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export async function GET() {
  try {
    const supabase = createAdminSupabaseClient()
    const now = new Date().toISOString()

    const { data: offers, error } = await supabase
      .from('offers')
      .select('*')
      .eq('auto_apply', true)
      .eq('is_active', true)
      .lte('starts_at', now)
      .gte('ends_at', now)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      return NextResponse.json({ valid: false, error: error.message }, { status: 500 })
    }

    const offer = offers?.[0] ?? null

    if (!offer) {
      return NextResponse.json({ valid: false, offer: null })
    }

    return NextResponse.json({
      valid: true,
      offer: {
        id: offer.id,
        code: offer.badge_text ?? offer.sale_label ?? 'SALE',
        discount_type: offer.offer_type === 'buy_x_get_y' ? 'percentage' : offer.offer_type,
        discount_value: Number(offer.discount_value),
        max_discount: offer.max_discount ? Number(offer.max_discount) : null,
        min_order_value: Number(offer.min_order_value ?? 0),
        discount_amount: 0,
        sale_label: offer.sale_label,
        badge_text: offer.badge_text,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { valid: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
