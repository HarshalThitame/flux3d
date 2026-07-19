import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUptimeSeconds } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const started = Date.now()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  let dbOk = false
  let dbError: string | null = null

  if (supabaseUrl && serviceKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey)
      const { error } = await supabase.from('materials').select('id').limit(1).maybeSingle()
      dbOk = !error
      dbError = error ? error.message : null
    } catch (e) {
      dbError = e instanceof Error ? e.message : 'Unknown error'
    }
  } else {
    dbError = 'Missing configuration'
  }

  const statusCode = dbOk ? 200 : 503
  const duration = Date.now() - started

  return NextResponse.json(
    {
      status: dbOk ? 'ok' : 'degraded',
      uptime: getUptimeSeconds(),
      version: process.env.npm_package_version || '0.1.0',
      checks: {
        database: { ok: dbOk, error: dbError },
      },
      duration,
    },
    {
      status: statusCode,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    }
  )
}
