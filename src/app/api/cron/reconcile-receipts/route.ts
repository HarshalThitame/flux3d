import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { lookupPaymentAttemptByInternalOrder } from '@/lib/payments/repository'
import { notifyPaymentCaptured } from '@/lib/payments/email-triggers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

const MIN_AGE_MINUTES = 15
const MAX_PER_RUN = 10

/**
 * Receipt reconciliation sweep.
 *
 * Safety net for the class of incident where a paid guest/shop order never
 * received its receipt because the fire-and-forget notification died silently
 * (see payment_audit_logs action='receipt_send_failed'). Finds paid shop
 * orders older than MIN_AGE_MINUTES with no successful/in-flight receipt in
 * email_logs and re-invokes the idempotent notification path (which itself
 * de-duplicates on sent/delivered receipts).
 */
async function verifyCronAuth(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  const expected = Buffer.from(authHeader.slice(7))
  const actual = Buffer.from(cronSecret)
  if (expected.length !== actual.length) return false
  return crypto.timingSafeEqual(expected, actual)
}

export async function GET(request: Request) {
  if (!(await verifyCronAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminSupabaseClient()
    const cutoff = new Date(Date.now() - MIN_AGE_MINUTES * 60_000).toISOString()

    // Paid shop orders old enough that the immediate notification should have
    // completed long ago.
    const { data: candidates, error } = await supabase
      .from('shelf_orders')
      .select('id, order_number, user_id, guest_contact')
      .in('payment_status', ['paid', 'captured'])
      .lt('placed_at', cutoff)
      .is('guest_data_anonymized_at', null)
      .order('placed_at', { ascending: false })
      .limit(100)

    if (error) throw new Error(error.message)

    const rows = (candidates ?? []) as Array<Record<string, unknown>>
    if (rows.length === 0) {
      return NextResponse.json({ ok: true, checked: 0, backfilled: [] })
    }

    // Exclude orders that already have a successful OR in-flight receipt.
    const ids = rows.map((row) => String(row.id))
    const { data: logged } = await supabase
      .from('email_logs')
      .select('order_id, status')
      .eq('email_type', 'payment_receipt')
      .eq('order_type', 'shop')
      .in('order_id', ids)

    const covered = new Set(
      (logged ?? [])
        .filter((entry) => ['sent', 'delivered', 'queued'].includes(String(entry.status)))
        .map((entry) => String(entry.order_id))
    )

    const missing = rows.filter((row) => !covered.has(String(row.id))).slice(0, MAX_PER_RUN)

    const backfilled: Array<{ orderId: string; orderNumber: string; ok: boolean }> = []
    for (const row of missing) {
      const orderId = String(row.id)
      const attempt = await lookupPaymentAttemptByInternalOrder({
        internalOrderType: 'shop_order',
        internalOrderId: orderId,
        paymentPurpose: 'shop_order',
      })

      if (!attempt || !['paid', 'captured'].includes(attempt.status)) {
        continue
      }

      // Idempotent: sendShopOrderReceipt de-duplicates on prior successful sends.
      let ok = true
      try {
        await notifyPaymentCaptured({
          id: attempt.id,
          customer_id: attempt.customer_id,
          internal_order_type: attempt.internal_order_type,
          internal_order_id: attempt.internal_order_id,
          amount_paise: attempt.amount_paise,
          payment_method: attempt.payment_method,
          provider_payment_id: attempt.provider_payment_id,
        })
      } catch (notifyError) {
        ok = false
        console.error('[cron/reconcile-receipts] notify failed:', notifyError instanceof Error ? notifyError.message : notifyError)
      }

      // postgrest-js 2.x builders lack .catch — await inside try/catch.
      try {
        await supabase.from('payment_audit_logs').insert({
          actor_id: null,
          actor_role: 'system',
          action: 'receipt_reconciled',
          entity_type: 'email_notification',
          entity_id: attempt.id,
          new_state: {
            internal_order_id: orderId,
            order_number: String(row.order_number ?? ''),
            ok,
            reconciled_at: new Date().toISOString(),
          },
        })
      } catch {
        // best-effort audit
      }

      backfilled.push({ orderId, orderNumber: String(row.order_number ?? ''), ok })
    }

    return NextResponse.json({
      ok: true,
      checked: rows.length,
      missing: missing.length,
      backfilled,
    })
  } catch (error) {
    console.error('[cron/reconcile-receipts] Failed:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Reconciliation failed.' },
      { status: 500 }
    )
  }
}
