import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { trackFeatureUsage } from '@/lib/tracking/featureTracker'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')?.toUpperCase().replace(/\s+/g, '')
    const userId = searchParams.get('userId')
    const orderAmount = parseFloat(searchParams.get('orderAmount') ?? '0')

    if (!code) {
      return NextResponse.json({ valid: false, error: 'Coupon code is required' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const now = new Date().toISOString()

    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ valid: false, error: error.message }, { status: 500 })
    }

    if (!coupon) {
      return NextResponse.json({ valid: false, error: 'Invalid coupon code' })
    }

    if (!coupon.is_active) {
      return NextResponse.json({ valid: false, error: 'This coupon is no longer active' })
    }

    if (now < coupon.starts_at) {
      return NextResponse.json({ valid: false, error: 'This coupon is not yet valid' })
    }

    if (now > coupon.expires_at) {
      return NextResponse.json({ valid: false, error: 'This coupon has expired' })
    }

    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return NextResponse.json({ valid: false, error: 'This coupon has reached its usage limit' })
    }

    if (orderAmount < coupon.min_order_value) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order value of ₹${coupon.min_order_value} required`,
      })
    }

    if (userId && coupon.usage_per_user) {
      const { count } = await supabase
        .from('redemptions')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id)
        .eq('user_id', userId)

      if (count && count >= coupon.usage_per_user) {
        return NextResponse.json({
          valid: false,
          error: 'You have already used this coupon the maximum number of times',
        })
      }
    }

    if (userId && coupon.first_order_only) {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (count && count > 0) {
        return NextResponse.json({
          valid: false,
          error: 'This coupon is for first-time orders only',
        })
      }
    }

    let discountAmount = 0
    if (coupon.discount_type === 'percentage') {
      discountAmount = (orderAmount * coupon.discount_value) / 100
      if (coupon.max_discount && discountAmount > coupon.max_discount) {
        discountAmount = coupon.max_discount
      }
    } else if (coupon.discount_type === 'fixed_amount') {
      discountAmount = Math.min(coupon.discount_value, orderAmount)
    }
    // free_shipping -- handled client-side by setting delivery charge to 0

    void trackFeatureUsage(userId ?? null, 'coupon_applied', {
      code: coupon.code,
      couponId: coupon.id,
      discountType: coupon.discount_type,
      discountAmount,
      orderAmount,
    }).catch(() => {})

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        max_discount: coupon.max_discount,
        min_order_value: coupon.min_order_value,
        discount_amount: discountAmount,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { valid: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
