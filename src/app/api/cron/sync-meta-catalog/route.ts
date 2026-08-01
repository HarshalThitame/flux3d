import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { syncFullCatalogToMeta } from '@/lib/meta/catalog'
import { getStoredCatalogHashes, saveStoredCatalogHashes } from '@/lib/meta/sync-state'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

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
  if (!(await verifyCronAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: products, error } = await supabase
    .from('shelf_products')
    .select(`
      id, name, slug, description, thumbnail_url, image_urls,
      is_active, is_archived, base_price,
      category:category_id(name),
      skus:shelf_skus(id, sku_code, price, stock_quantity, is_available, variant_combination, variant_image_url)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Load previously stored payload hashes so unchanged items are skipped.
  // Without this the 6-hourly sync re-pushed every item, re-triggering WhatsApp
  // review each time and flipping APPROVED items to OUTDATED/NO_REVIEW.
  const storedHashes = await getStoredCatalogHashes().catch((e) => {
    console.error('[sync-meta-catalog] Failed to load stored hashes:', e)
    return {}
  })

  const result = await syncFullCatalogToMeta(products ?? [], storedHashes)

  // Persist the current hashes so the next cron run skips unchanged items.
  if (result.hashes) {
    await saveStoredCatalogHashes(result.hashes).catch((e) => {
      console.error('[sync-meta-catalog] Failed to persist payload hashes:', e)
    })
  }

  try {
    await supabase.from('error_logs').insert({
      source: 'meta_catalog_cron',
      severity: result.failed > 0 ? 'warning' : 'info',
      message: `Catalog sync: ${result.succeeded} ok, ${result.failed} failed, ${result.skipped} skipped (${result.total} total changed)`,
      error_message: `Catalog sync: ${result.succeeded} ok, ${result.failed} failed, ${result.skipped} skipped (${result.total} total changed)`,
      metadata: { total: result.total, succeeded: result.succeeded, failed: result.failed, skipped: result.skipped, durationMs: result.durationMs },
    })
  } catch (e) {
    console.error('[sync-meta-catalog] Log write failed:', e)
  }

  return NextResponse.json({
    success: result.failed === 0,
    total: result.total,
    succeeded: result.succeeded,
    failed: result.failed,
    skipped: result.skipped,
    durationMs: result.durationMs,
  })
}
