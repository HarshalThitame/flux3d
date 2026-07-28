import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { logAdminAction } from '@/lib/admin/auditLog'
import { getEmailSettings } from '@/lib/email/settings-cache'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/email-queue/[id]/retry
 *
 * Re-queues a failed or queued email for immediate retry.
 * Increments retry_count and resets status to 'queued'.
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

    if (item.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot retry a cancelled email' },
        { status: 400 }
      )
    }

    // Check global retry settings
    const emailSettings = await getEmailSettings().catch(() => null)
    if (emailSettings && !emailSettings.retry_failed) {
      return NextResponse.json(
        { error: 'Retry failed emails is disabled in Email Settings' },
        { status: 403 }
      )
    }

    const effectiveMaxRetries = emailSettings?.max_retries ?? item.max_retries ?? 3
    if (item.retry_count >= effectiveMaxRetries) {
      return NextResponse.json(
        { error: 'Max retry limit reached' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('email_queue')
      .update({
        status: 'queued',
        retry_count: item.retry_count + 1,
        error_message: null,
        scheduled_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      console.error('[admin/email-queue/retry] Update error:', error)
      return NextResponse.json(
        { error: error?.message ?? 'Retry failed' },
        { status: 500 }
      )
    }

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'retry_email_queue',
      target_type: 'setting',
      target_id: id,
      old_value: { status: item.status, retry_count: item.retry_count },
      new_value: { status: 'queued', retry_count: item.retry_count + 1 },
    })

    return NextResponse.json({ data })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
