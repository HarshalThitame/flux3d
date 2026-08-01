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
  const { data, error } = await supabase.rpc('cleanup_whatsapp_sessions')

  if (error) {
    console.error('[cron] cleanup_whatsapp_sessions failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const deletedCount = Array.isArray(data) && data.length > 0 ? Number(data[0]?.deleted_count ?? 0) : 0

  let orderSessionsDeleted = 0
  const { data: orderData, error: orderError } = await supabase.rpc('cleanup_whatsapp_order_sessions')
  if (orderError) {
    console.error('[cron] cleanup_whatsapp_order_sessions failed:', orderError)
  } else {
    orderSessionsDeleted = Number(orderData ?? 0)
  }

  // Log to admin audit trail
  try {
    await supabase.from('admin_audit_logs').insert({
      admin_id: null,
      action: 'cron_cleanup_whatsapp_sessions',
      target_type: 'whatsapp_sessions',
      target_id: null,
      new_value: {
        deleted_count: deletedCount,
        order_sessions_deleted: orderSessionsDeleted,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (logError) {
    console.error('[cron] Failed to log cleanup audit:', logError)
  }

  return NextResponse.json({
    success: true,
    deletedCount,
    orderSessionsDeleted,
  })
}
