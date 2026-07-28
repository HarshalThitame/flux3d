import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminPermission } from '@/lib/admin/permissions'
import { logAdminAction } from '@/lib/admin/auditLog'
import { logQuoteEvent } from '@/lib/quote/audit'
import { sendModelValidationResult } from '@/lib/email/triggers'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminPermission('quotes.approve')
  if ('response' in auth) return auth.response

  try {
    const { id } = await params
    const body = (await request.json().catch(() => ({}))) as { reason?: string }
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''

    const adminSupabase = (await import('@/lib/admin/server')).createAdminSupabaseClient()

    const { data: latest } = await adminSupabase
      .from('quote_versions')
      .select('id, order_id')
      .eq('quote_id', id)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!latest) {
      return NextResponse.json({ error: 'Quote version not found.' }, { status: 404 })
    }

    await adminSupabase
      .from('quote_versions')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', latest.id)

    await logQuoteEvent({
      quoteVersionId: latest.id,
      orderId: latest.order_id ?? null,
      actorId: auth.user.id,
      actorRole: 'admin',
      eventType: 'rejected',
      previousStatus: 'pending_review',
      newStatus: 'rejected',
      note: reason || undefined,
    })

    if (latest.order_id) {
      await adminSupabase
        .from('orders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', latest.order_id)
    }

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'reject_quote',
      target_type: 'quote',
      target_id: id,
      new_value: { reason },
    })

    // Send model validation fail email
    try {
      const { data: order } = await adminSupabase
        .from('orders')
        .select('order_number, full_name, email, user_id')
        .eq('id', latest.order_id ?? '')
        .maybeSingle()
      if (order) {
        const row = order as Record<string, unknown>
        sendModelValidationResult(
          String(row.user_id ?? ''),
          String(row.email ?? ''),
          String(row.order_number ?? latest.order_id ?? ''),
          String(row.full_name ?? 'Customer'),
          false,
          reason ? [reason] : ['Model did not meet print requirements.'],
        ).catch((err) => console.error('[quotes/reject] Failed to enqueue validation email:', err))
      }
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
