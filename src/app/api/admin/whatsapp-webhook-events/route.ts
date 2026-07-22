import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminRequest } from '@/lib/admin/request'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'failed'
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 100)
  const offset = Number(searchParams.get('offset')) || 0

  const supabase = createAdminClient()

  let query = supabase
    .from('whatsapp_webhook_events')
    .select('id, sender, payload_hash, payload, signature_verified, processed_at, reply_sent, retry_count, last_error, last_retried_at, received_at, created_at', { count: 'exact' })

  if (status === 'failed') {
    query = query.is('processed_at', null).gte('retry_count', 3)
  } else if (status === 'pending') {
    query = query.is('processed_at', null).lt('retry_count', 3)
  } else if (status === 'processed') {
    query = query.not('processed_at', 'is', null)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    events: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  })
}
