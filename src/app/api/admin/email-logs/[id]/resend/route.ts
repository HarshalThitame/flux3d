import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminUser } from '@/lib/admin/server'
import { enqueueEmail } from '@/lib/email/producer'
import type { EmailLogRow } from 'types/database'

/**
 * POST /api/admin/email-logs/[id]/resend
 *
 * Re-sends an email by looking up the original email_log row,
 * creating a new log with original_log_id pointing back,
 * and enqueuing the same email payload.
 *
 * Auth: Admin only.
 */

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser()
    const { id } = await params

    const supabase = createAdminClient()

    // Fetch original log
    const { data: original, error: fetchError } = await supabase
      .from('email_logs')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !original) {
      return NextResponse.json(
        { error: fetchError?.message ?? 'Email log not found' },
        { status: fetchError ? 500 : 404 }
      )
    }

    const log = original as EmailLogRow

    // Prevent resending bounced emails without checking bounce type
    if (log.status === 'bounced' && log.bounce_type === 'hard') {
      return NextResponse.json(
        { error: 'Cannot resend: this email hard-bounced. The recipient address is invalid.' },
        { status: 400 }
      )
    }

    // Build payload from log (we don't store the full payload in email_logs,
    // so we reconstruct a minimal one. In production, you might store
    // the full JSON payload in a separate column for perfect reconstruction.)
    const payload = {
      emailType: log.email_type,
      userId: log.user_id,
      recipient: log.recipient,
      subject: log.subject,
      // We pass order context if available
      orderNumber: log.order_id ? 'N/A' : 'N/A',
      customerName: 'Customer',
    } as Record<string, unknown>

    // For order-related emails, try to enrich from orders or shelf_orders
    if (log.order_id && log.order_type) {
      const table = log.order_type === 'shop' ? 'shelf_orders' : 'orders'
      const { data: order } = await supabase
        .from(table)
        .select('order_number, full_name, items, total_amount, grand_total')
        .eq('id', log.order_id)
        .maybeSingle()

      if (order) {
        const orderData = order as Record<string, unknown>
        payload.orderNumber = String(orderData.order_number ?? 'N/A')
        payload.customerName = String(orderData.full_name ?? 'Customer')
        payload.total = String(orderData.grand_total ?? orderData.total_amount ?? 'N/A')
        if (orderData.items) {
          try {
            const items = Array.isArray(orderData.items) ? orderData.items : JSON.parse(String(orderData.items))
            payload.items = items.map((it: Record<string, unknown>) => ({
              name: String(it.product_name ?? it.name ?? 'Item'),
              material: String(it.material ?? ''),
              color: String(it.color ?? ''),
              quantity: Number(it.quantity ?? 1),
              price: String(it.unit_price ?? it.price ?? ''),
            }))
          } catch {
            payload.items = []
          }
        }
      }
    }

    // Enqueue the resend
    const { logId: newLogId } = await enqueueEmail(payload as unknown as Parameters<typeof enqueueEmail>[0])

    // Link the new log back to the original
    await supabase
      .from('email_logs')
      .update({ original_log_id: log.id })
      .eq('id', newLogId)

    return NextResponse.json({ success: true, newLogId })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Resend failed'
    console.error('[admin/email-logs/resend] Error:', errMsg)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
