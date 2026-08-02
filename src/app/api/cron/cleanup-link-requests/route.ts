import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

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

export async function GET(request: Request) {
  if (!await verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const maxAgeHours = 24
  const { data, error } = await supabase.rpc('cleanup_link_requests', { p_max_age_hours: maxAgeHours })

  if (error) {
    console.error('[cron] cleanup_link_requests failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const deletedCount = Array.isArray(data) && data.length > 0 ? Number(data[0]?.deleted_count ?? 0) : 0

  try {
    await supabase.from('admin_audit_logs').insert({
      admin_id: null,
      action: 'cron_cleanup_link_requests',
      target_type: 'link_request',
      target_id: null,
      new_value: {
        deleted_count: deletedCount,
        max_age_hours: maxAgeHours,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (logError) {
    console.error('[cron] Failed to log cleanup audit:', logError)
  }

  return NextResponse.json({
    success: true,
    deletedCount,
  })
}