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
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_QUOTE_BUCKET ?? 'quote-models'

  const { data: orphans, error: rpcError } = await supabase.rpc('cleanup_orphan_models', {
    p_grace_hours: 24,
  })

  if (rpcError) {
    console.error('[cron] cleanup_orphan_models RPC failed:', rpcError)
    return NextResponse.json({ error: rpcError.message }, { status: 500 })
  }

  const orphanPaths: string[] = (orphans as { path: string }[] ?? []).map((o) => o.path)
  let deletedCount = 0

  if (orphanPaths.length > 0) {
    const { error: removeError } = await supabase.storage
      .from(bucket)
      .remove(orphanPaths)

    if (removeError) {
      console.error('[cron] Failed to remove orphaned files:', removeError)
      return NextResponse.json({ error: removeError.message }, { status: 500 })
    }

    deletedCount = orphanPaths.length
  }

  try {
    await supabase.from('admin_audit_logs').insert({
      admin_id: null,
      action: 'cron_cleanup_orphan_models',
      target_type: 'storage.objects',
      target_id: null,
      new_value: {
        bucket,
        deleted_count: deletedCount,
        grace_hours: 24,
        orphan_paths: orphanPaths,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (logError) {
    console.error('[cron] Failed to log cleanup audit:', logError)
  }

  return NextResponse.json({
    success: true,
    deletedCount,
    orphanPaths,
  })
}
