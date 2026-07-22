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
  const { data, error } = await supabase.rpc('release_expired_reservations')

  if (error) {
    console.error('[cron] release_expired_reservations failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    released: data ?? [],
    releasedCount: Array.isArray(data) ? data.length : 0,
  })
}
