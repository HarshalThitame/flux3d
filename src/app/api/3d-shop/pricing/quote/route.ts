import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { quoteShopOrder, normalizeOrderItems } from '@/lib/shop/authoritative-pricing'
import { rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// Cart pages and the slide-out cart can request the same total at the same
// time. Coalescing only in-flight work (never caching a completed quote)
// preserves authoritative pricing while avoiding duplicate database work.
const inFlightQuotes = new Map<string, ReturnType<typeof quoteShopOrder>>()

function getSharedQuote(
  key: string,
  create: () => ReturnType<typeof quoteShopOrder>,
) {
  const active = inFlightQuotes.get(key)
  if (active) return active

  const next = create().finally(() => {
    if (inFlightQuotes.get(key) === next) inFlightQuotes.delete(key)
  })
  inFlightQuotes.set(key, next)
  return next
}

export async function POST(request: Request) {
  const startedAt = performance.now()
  try {
    const body = await request.json()
    const supabase = await createServerSupabaseClient()
    const [limit, { data: auth }] = await Promise.all([
      rateLimitResponse(request, { prefix: 'shop-quote', windowSeconds: 60, maxRequests: 60 }),
      supabase.auth.getUser(),
    ])
    if (!limit.success) return NextResponse.json({ error: 'Too many requests. Please retry shortly.' }, { status: 429 })
    const destination = body.destination
    const input = {
      items: normalizeOrderItems(body.items), userId: auth.user?.id ?? null,
      couponCode: typeof body.couponCode === 'string' ? body.couponCode.trim().toUpperCase() : null,
      appliedOfferId: typeof body.appliedOfferId === 'string' ? body.appliedOfferId.trim() : null,
      destination: destination && typeof destination.pincode === 'string' && typeof destination.state === 'string' ? destination : null,
    }
    const quote = await getSharedQuote(JSON.stringify(input), () => quoteShopOrder(input))
    const duration = Math.round(performance.now() - startedAt)
    if (duration > 1500) {
      console.warn('[shop-quote] Slow quote', { duration, itemCount: input.items.length, hasCoupon: Boolean(input.couponCode), hasDestination: Boolean(input.destination) })
    }
    return NextResponse.json({ quote }, { headers: { 'Cache-Control': 'no-store', 'Server-Timing': `shopquote;dur=${duration}` } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to calculate pricing. Please retry.'
    const validation = /cart|quantity|SKU|coupon|promotion|pincode|product|stock|delivery|Sign in|minimum/i.test(message)
    const duration = Math.round(performance.now() - startedAt)
    console.error('[shop-quote] Quote failed', { duration, validation, message })
    return NextResponse.json({ error: message }, { status: validation ? 422 : 503, headers: { 'Cache-Control': 'no-store', 'Server-Timing': `shopquote;dur=${duration}` } })
  }
}
