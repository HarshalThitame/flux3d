import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { quoteShopOrder, normalizeOrderItems } from '@/lib/shop/authoritative-pricing'
import { rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  const limit = await rateLimitResponse(request, { prefix: 'shop-quote', windowSeconds: 60, maxRequests: 60 })
  if (!limit.success) return NextResponse.json({ error: 'Too many requests. Please retry shortly.' }, { status: 429 })
  try {
    const body = await request.json()
    const supabase = await createServerSupabaseClient()
    const { data: auth } = await supabase.auth.getUser()
    const destination = body.destination
    const quote = await quoteShopOrder({
      items: normalizeOrderItems(body.items), userId: auth.user?.id ?? null,
      couponCode: typeof body.couponCode === 'string' ? body.couponCode.trim().toUpperCase() : null,
      appliedOfferId: typeof body.appliedOfferId === 'string' ? body.appliedOfferId.trim() : null,
      destination: destination && typeof destination.pincode === 'string' && typeof destination.state === 'string' ? destination : null,
    })
    return NextResponse.json({ quote }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to calculate pricing. Please retry.'
    const validation = /cart|quantity|SKU|coupon|promotion|pincode|product|stock|delivery|Sign in|minimum/i.test(message)
    return NextResponse.json({ error: message }, { status: validation ? 422 : 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
