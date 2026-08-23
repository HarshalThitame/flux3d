import { NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { Receiver } from '@upstash/qstash'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const DEFAULT_RETENTION_DAYS = 7

const qstashReceiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY ?? '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY ?? '',
})

async function verifyQStash(request: Request): Promise<boolean> {
  const signature = request.headers.get('upstash-signature') ?? ''
  if (!signature) return false
  const body = await request.clone().text().catch(() => '')
  try {
    return await qstashReceiver.verify({
      body,
      signature,
      url: request.url,
    })
  } catch {
    return false
  }
}

async function verifyCronAuth(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        return crypto.timingSafeEqual(
          Buffer.from(authHeader.slice(7)),
          Buffer.from(cronSecret),
        )
      } catch {
        // fall through to next check
      }
    }
  }
  const userAgent = request.headers.get('user-agent')
  return userAgent === 'vercel-cron'
}

async function getRetentionDays(supabase: SupabaseClient): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('business_settings')
      .select('cleanup_abandoned_quote_days:cleanup_abandoned_quote_days')
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle()

    if (error || !data) {
      return DEFAULT_RETENTION_DAYS
    }

    const val = (data as Record<string, unknown>).cleanup_abandoned_quote_days
    if (!val) return DEFAULT_RETENTION_DAYS

    return Math.max(1, Number(val))
  } catch {
    return DEFAULT_RETENTION_DAYS
  }
}

export async function GET(request: Request) {
  const isAuthorized = (await verifyQStash(request)) || (await verifyCronAuth(request))
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_QUOTE_BUCKET ?? 'quote-models'
  const retentionDays = await getRetentionDays(supabase)

  const results = {
    orphans: { deletedCount: 0, paths: [] as string[] },
    abandoned: { deletedCount: 0, paths: [] as string[] },
    abandonedQuoteRows: { deletedCount: 0, quoteIds: [] as string[] },
  }

  // ─── Phase 1: Clean up orphaned storage objects (no DB references) ───
  const { data: orphans, error: orphanRpcError } = await supabase.rpc('cleanup_orphan_models', {
    p_grace_hours: 24,
  })

  if (orphanRpcError) {
    console.error('[cron] cleanup_orphan_models RPC failed:', orphanRpcError)
  } else {
    const orphanPaths: string[] = (orphans as { path: string }[] ?? []).map((o) => o.path)

    if (orphanPaths.length > 0) {
      const { error: removeError } = await supabase.storage
        .from(bucket)
        .remove(orphanPaths)

      if (removeError) {
        console.error('[cron] Failed to remove orphaned files:', removeError)
      } else {
        results.orphans.deletedCount = orphanPaths.length
        results.orphans.paths = orphanPaths
      }
    }
  }

  // ─── Phase 2: Clean up abandoned quote model files ───
  // Files uploaded for quotes that were never converted to orders,
  // older than the retention period.
  const { data: abandoned, error: abandonRpcError } = await supabase.rpc('cleanup_abandoned_quotes', {
    p_retention_days: retentionDays,
  })

  if (abandonRpcError) {
    console.error('[cron] cleanup_abandoned_quotes RPC failed:', abandonRpcError)
  } else {
    const abandonedRows = (abandoned as Array<{
      file_url: string
      size: number
      uploaded_at: string
      quote_id: string | null
    }> ?? [])

    const abandonedPaths = abandonedRows.map((row) => row.file_url).filter(Boolean)

    if (abandonedPaths.length > 0) {
      const { error: removeError } = await supabase.storage
        .from(bucket)
        .remove(abandonedPaths)

      if (removeError) {
        console.error('[cron] Failed to remove abandoned model files:', removeError)
      } else {
        results.abandoned.deletedCount = abandonedPaths.length
        results.abandoned.paths = abandonedPaths
      }
    }

    // Delete the model_files rows for abandoned uploads
    if (abandonedPaths.length > 0) {
      const { error: mfDeleteError } = await supabase
        .from('model_files')
        .delete()
        .in('file_url', abandonedPaths)
        .eq('status', 'quoted')

      if (mfDeleteError) {
        console.error('[cron] Failed to delete abandoned model_files rows:', mfDeleteError)
      } else {
        results.abandoned.deletedCount = abandonedPaths.length
      }
    }
  }

  // ─── Phase 3: Clean up orphaned quote rows (quotes with file_path but no matching order) ───
  const { data: abandonedQuotes, error: abandonQuoteRpcError } = await supabase.rpc('cleanup_abandoned_quote_rows', {
    p_retention_days: retentionDays,
  })

  if (abandonQuoteRpcError) {
    console.error('[cron] cleanup_abandoned_quote_rows RPC failed:', abandonQuoteRpcError)
  } else {
    const quoteRows = (abandonedQuotes as Array<{
      quote_id: string
      file_path: string
      created_at: string
    }> ?? [])

    if (quoteRows.length > 0) {
      const { error: qDeleteError } = await supabase
        .from('quotes')
        .delete()
        .in('quote_id', quoteRows.map((r) => r.quote_id))

      if (qDeleteError) {
        console.error('[cron] Failed to delete abandoned quote rows:', qDeleteError)
      } else {
        results.abandonedQuoteRows.deletedCount = quoteRows.length
        results.abandonedQuoteRows.quoteIds = quoteRows.map((r) => r.quote_id)
      }
    }
  }

  // ─── Audit logging ───
  try {
    await supabase.from('admin_audit_logs').insert({
      admin_id: null,
      action: 'cron_cleanup_storage',
      target_type: 'storage.objects',
      target_id: null,
      new_value: {
        bucket,
        retention_days: retentionDays,
        orphan_files_deleted: results.orphans.deletedCount,
        abandoned_files_deleted: results.abandoned.deletedCount,
        abandoned_quote_rows_deleted: results.abandonedQuoteRows.deletedCount,
        orphan_paths: results.orphans.paths,
        abandoned_paths: results.abandoned.paths,
        abandoned_quote_ids: results.abandonedQuoteRows.quoteIds,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (logError) {
    console.error('[cron] Failed to log cleanup audit:', logError)
  }

  return NextResponse.json({
    success: true,
    orphans: {
      deletedCount: results.orphans.deletedCount,
      paths: results.orphans.paths,
    },
    abandoned: {
      deletedCount: results.abandoned.deletedCount,
      paths: results.abandoned.paths,
    },
    abandonedQuoteRows: {
      deletedCount: results.abandonedQuoteRows.deletedCount,
      quoteIds: results.abandonedQuoteRows.quoteIds,
    },
    retentionDays,
  })
}
