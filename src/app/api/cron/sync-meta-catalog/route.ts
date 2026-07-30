import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Receiver } from '@upstash/qstash'
import { syncFullCatalogToMeta } from '@/lib/meta/catalog'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY ?? '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY ?? '',
})

export async function GET(request: Request) {
  const signature = request.headers.get('upstash-signature') ?? ''
  const body = await request.text()

  const isValid = await receiver.verify({ body, signature, url: request.url })
  if (!isValid) {
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

  const result = await syncFullCatalogToMeta(products ?? [])

  await supabase.from('error_logs').insert({
    source: 'meta_catalog_cron',
    severity: result.failed > 0 ? 'warning' : 'info',
    message: `Full catalog sync: ${result.succeeded} ok, ${result.failed} failed (${result.total} total)`,
    metadata: { total: result.total, succeeded: result.succeeded, failed: result.failed, durationMs: result.durationMs },
  })

  return NextResponse.json({
    success: result.failed === 0,
    total: result.total,
    succeeded: result.succeeded,
    failed: result.failed,
    durationMs: result.durationMs,
  })
}
