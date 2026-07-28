import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { logAdminAction } from '@/lib/admin/auditLog'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/email-queue/[id]/cancel
 *
 * Cancels a queued email. Only items with status 'queued' or 'sending' can be cancelled.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data: item } = await supabase
      .from('email_queue')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!item) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 })
    }

    if (!['queued', 'sending'].includes(item.status)) {
      return NextResponse.json(
        { error: `Cannot cancel an email with status '${item.status}'` },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('email_queue')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      console.error('[admin/email-queue/cancel] Update error:', error)
      return NextResponse.json(
        { error: error?.message ?? 'Cancel failed' },
        { status: 500 }
      )
    }

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'cancel_email_queue',
      target_type: 'setting',
      target_id: id,
      old_value: { status: item.status },
      new_value: { status: 'cancelled' },
    })

    return NextResponse.json({ data })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
