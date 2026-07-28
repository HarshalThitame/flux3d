import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import type { EmailQueueRow } from 'types/database'

type QueueItemWithTemplate = EmailQueueRow & {
  email_templates?: { name: string }[] | null
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/email-queue
 *
 * Query params:
 *   status       — filter by status
 *   template_id  — filter by template
 *   page         — default 1
 *   limit        — default 25, max 100
 *
 * Returns: { data: (EmailQueueRow & { template_name })[], total: number, page, limit }
 */
export async function GET(req: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const templateId = searchParams.get('template_id')
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '25')))

    const supabase = createAdminClient()
    let query = supabase
      .from('email_queue')
      .select('*, email_templates(name)', { count: 'exact' })

    if (status) {
      query = query.eq('status', status)
    }
    if (templateId) {
      query = query.eq('template_id', templateId)
    }

    query = query.order('created_at', { ascending: false })
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('[admin/email-queue] Query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = (data ?? []) as QueueItemWithTemplate[]
    const normalized = rows.map((row) => ({
      ...row,
      template_name: row.email_templates?.[0]?.name ?? 'Unknown',
    }))

    return NextResponse.json({
      data: normalized,
      total: count ?? 0,
      page,
      limit,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
