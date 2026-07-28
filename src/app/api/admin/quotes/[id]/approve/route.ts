import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminPermission } from '@/lib/admin/permissions'
import { approveQuoteVersion } from '@/lib/quote/approval'
import { logAdminAction } from '@/lib/admin/auditLog'
import { sendModelValidationResult } from '@/lib/email/triggers'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminPermission('quotes.approve')
  if ('response' in auth) return auth.response

  try {
    const { id } = await params
    await approveQuoteVersion(id, auth.user.id)

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'approve_quote',
      target_type: 'quote',
      target_id: id,
    })

    // Send model validation pass email
    try {
      const supabase = createAdminSupabaseClient()
      const { data: order } = await supabase
        .from('orders')
        .select('order_number, full_name, email, user_id')
        .eq('id', id)
        .maybeSingle()
      if (order) {
        const row = order as Record<string, unknown>
        sendModelValidationResult(
          String(row.user_id ?? ''),
          String(row.email ?? ''),
          String(row.order_number ?? id),
          String(row.full_name ?? 'Customer'),
          true,
        ).catch((err) => console.error('[quotes/approve] Failed to enqueue validation email:', err))
      }
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
