import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const now = new Date().toISOString()

    const { data: offers, error: offerError } = await supabase
      .from('offers')
      .select('*')
      .eq('is_active', true)
      .lte('starts_at', now)
      .gte('ends_at', now)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })

    if (offerError) {
      console.error('[offers/active] Offer query failed:', offerError.message)
      return NextResponse.json({ offers: [], coupons: [] })
    }

    const { data: coupons, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .lte('starts_at', now)
      .gte('expires_at', now)

    if (couponError) {
      console.error('[offers/active] Coupon query failed:', couponError.message)
      return NextResponse.json({ offers: offers ?? [], coupons: [] })
    }

    return NextResponse.json({ offers, coupons })
  } catch (error) {
    console.error(
      '[offers/active] Unexpected failure:',
      error instanceof Error ? error.message : error
    )
    return NextResponse.json({ offers: [], coupons: [] })
  }
}
