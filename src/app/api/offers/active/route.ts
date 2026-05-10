import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export async function GET() {
  try {
    const supabase = createAdminSupabaseClient()
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
      return NextResponse.json({ error: offerError.message }, { status: 500 })
    }

    const { data: coupons, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .lte('starts_at', now)
      .gte('expires_at', now)

    if (couponError) {
      return NextResponse.json({ error: couponError.message }, { status: 500 })
    }

    return NextResponse.json({ offers, coupons })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
