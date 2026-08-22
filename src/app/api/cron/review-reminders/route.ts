import { NextResponse } from 'next/server'
import { Receiver } from '@upstash/qstash'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { sendReviewReminder } from '@/lib/email/triggers'
import { absoluteUrl } from '@/lib/site'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const qstashReceiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY ?? '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY ?? '',
})

async function verifyCronAuth(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  try {
    return crypto.timingSafeEqual(
      Buffer.from(authHeader.slice(7)),
      Buffer.from(cronSecret),
    )
  } catch {
    return false
  }
}

async function verifyQStash(request: Request): Promise<boolean> {
  const signature = request.headers.get('upstash-signature') ?? ''
  if (!signature) return false
  const body = await request.clone().text().catch(() => '')
  try {
    const isValid = await qstashReceiver.verify({
      body,
      signature,
      url: request.url,
    })
    return isValid
  } catch {
    return false
  }
}

const REMINDER_SCHEDULE = [
  { number: 1, days: 3 },
  { number: 2, days: 7 },
  { number: 3, days: 14 },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function getItemProductId(item: unknown) {
  if (!isRecord(item)) return ''
  return typeof item.productId === 'string'
    ? item.productId
    : typeof item.product_id === 'string'
      ? item.product_id
      : ''
}

function getItemProductName(item: unknown) {
  if (!isRecord(item)) return 'Product'
  return String(item.productName ?? item.product_name ?? 'Product')
}

export async function GET(request: Request) {
  const isAuthorized = (await verifyQStash(request)) || (await verifyCronAuth(request))
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const results: { reminderNumber: number; sent: number; errors: string[] }[] = []

  for (const schedule of REMINDER_SCHEDULE) {
    const sent: string[] = []
    const errors: string[] = []

    // Find orders delivered within the target window for this reminder
    // e.g., for 3-day reminder: delivered between 4 days ago and 3 days ago
    const windowStart = new Date(Date.now() - (schedule.days + 1) * 24 * 60 * 60 * 1000).toISOString()
    const windowEnd = new Date(Date.now() - schedule.days * 24 * 60 * 60 * 1000).toISOString()

    const { data: orders, error: ordersError } = await supabase
      .from('shelf_orders')
      .select('id, user_id, order_number, items, delivered_at')
      .eq('order_status', 'delivered')
      .gte('delivered_at', windowStart)
      .lt('delivered_at', windowEnd)
      .order('delivered_at', { ascending: false })

    if (ordersError) {
      console.error(`[cron/review-reminders] Failed to load orders for reminder ${schedule.number}:`, ordersError)
      errors.push(ordersError.message)
      results.push({ reminderNumber: schedule.number, sent: sent.length, errors })
      continue
    }

    // Batch-load profiles for all orders in this window (avoids an N+1
    // profile query per order).
    const orderUserIds = Array.from(new Set((orders ?? []).map((o) => o.user_id).filter(Boolean)))
    const profileMap = new Map<string, { email?: string | null; full_name?: string | null; name?: string | null }>()
    if (orderUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, name')
        .in('id', orderUserIds)
      for (const profile of profiles ?? []) {
        profileMap.set(profile.id, profile)
      }
    }

    for (const order of orders ?? []) {
      try {
        // Skip if reminder already sent for this order + reminder number
        const { data: existingReminder } = await supabase
          .from('shelf_review_reminders')
          .select('id')
          .eq('order_id', order.id)
          .eq('reminder_number', schedule.number)
          .maybeSingle()

        if (existingReminder) continue

        // Extract product IDs from order items
        const items = Array.isArray(order.items) ? order.items : []
        const productIds = items
          .map(getItemProductId)
          .filter(Boolean)

        if (productIds.length === 0) continue

        // Check which products already have reviews for this order
        const { data: reviews } = await supabase
          .from('shelf_reviews')
          .select('product_id')
          .eq('order_id', order.id)
          .eq('user_id', order.user_id)
          .in('product_id', productIds)

        const reviewedProductIds = new Set((reviews ?? []).map((r) => r.product_id))
        const unreviewedItems = items.filter((item) => {
          const pid = getItemProductId(item)
          return pid && !reviewedProductIds.has(pid)
        })

        if (unreviewedItems.length === 0) continue

        // Get user email and name (batch-loaded above)
        const profile = profileMap.get(order.user_id)
        const email = profile?.email
        const customerName = String(profile?.full_name || profile?.name || 'Customer')
        if (!email) {
          console.warn(`[cron/review-reminders] No email for user ${order.user_id}, order ${order.id}`)
          continue
        }

        // Build items HTML for email
        const itemsHtml = `<ul style="padding:0 32px 16px;margin:0;list-style:none;">\n${unreviewedItems.map((item) => {
          const name = getItemProductName(item)
          const thumbnail = isRecord(item) ? String(item.productThumbnail ?? item.product_thumbnail ?? '') : ''
          return `  <li style="padding:12px 0;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:12px;">\n    ${thumbnail ? `<img src="${thumbnail}" alt="" style="width:48px;height:48px;border-radius:8px;object-fit:cover;flex-shrink:0;" />` : ''}\n    <span style="font-size:15px;font-weight:600;color:#1a1a1a;">${name}</span>\n  </li>`
        }).join('\n')}\n</ul>`

        // Send reminder email
        await sendReviewReminder(
          order.user_id,
          email,
          order.order_number,
          customerName,
          itemsHtml,
          absoluteUrl('/3d-shop/orders'),
        )

        // Record that reminder was sent
        const { error: reminderError } = await supabase
          .from('shelf_review_reminders')
          .insert({
            order_id: order.id,
            user_id: order.user_id,
            reminder_number: schedule.number,
          })

        if (reminderError) {
          console.error(`[cron/review-reminders] Failed to log reminder for order ${order.id}:`, reminderError)
        }

        sent.push(order.id)
      } catch (orderError) {
        const message = orderError instanceof Error ? orderError.message : 'Unknown error'
        console.error(`[cron/review-reminders] Error processing order ${order.id}:`, message)
        errors.push(message)
      }
    }

    results.push({ reminderNumber: schedule.number, sent: sent.length, errors })
  }

  return NextResponse.json({
    success: true,
    reminders: results,
    totalSent: results.reduce((sum, r) => sum + r.sent, 0),
  })
}
