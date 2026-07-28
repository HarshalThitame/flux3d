import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminUser } from '@/lib/admin/server'
import type { EmailLogRow } from 'types/database'

/**
 * GET /api/admin/email-logs
 *
 * Query params:
 *   status       — filter by email_logs.status
 *   email_type   — filter by email_type
 *   recipient    — partial match on recipient (ILIKE)
 *   page         — page number (default 1)
 *   limit        — items per page (default 25, max 100)
 *   user_id      — filter by user_id
 *   order_id     — filter by order_id
 *   from         — ISO date, filter sent_at >= from
 *   to           — ISO date, filter sent_at < to
 *
 * Returns:
 *   { data: EmailLogRow[], total: number, page: number, limit: number }
 *
 * Performance:
 *   - Uses the composite index idx_email_logs_status_created_at for status filters.
 *   - Count query can be slow on large tables; consider approximate counts
 *     or caching if email volume exceeds 1M rows.
 */

export async function GET(req: Request) {
  try {
    await requireAdminUser()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const emailType = searchParams.get('email_type')
    const recipient = searchParams.get('recipient')
    const userId = searchParams.get('user_id')
    const orderId = searchParams.get('order_id')
    const dateFrom = searchParams.get('from')
    const dateTo = searchParams.get('to')
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '25')))

    const supabase = createAdminClient()

    // Build query
    let query = supabase.from('email_logs').select('*', { count: 'exact' })

    if (status) {
      query = query.eq('status', status)
    }
    if (emailType) {
      query = query.eq('email_type', emailType)
    }
    if (recipient) {
      query = query.ilike('recipient', `%${recipient}%`)
    }
    if (userId) {
      query = query.eq('user_id', userId)
    }
    if (orderId) {
      query = query.eq('order_id', orderId)
    }
    if (dateFrom) {
      query = query.gte('sent_at', dateFrom)
    }
    if (dateTo) {
      query = query.lt('sent_at', dateTo)
    }

    // Ordering: newest first
    query = query.order('created_at', { ascending: false })

    // Pagination
    const offset = (page - 1) * limit
    const endOffset = offset + limit - 1
    query = query.range(offset, endOffset)

    const { data, error, count } = await query

    if (error) {
      console.error('[admin/email-logs] Query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: (data ?? []) as EmailLogRow[],
      total: count ?? 0,
      page,
      limit,
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Failed to fetch email logs'
    console.error('[admin/email-logs] Error:', errMsg)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
