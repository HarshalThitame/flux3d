import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { sendStockAlertDigest } from '@/lib/email/triggers'

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
  if (!(await verifyCronAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  // 1. Recompute alerts (insert new, resolve recovered)
  const { data: recompute, error: recomputeError } = await supabase.rpc('recompute_stock_alerts')
  if (recomputeError) {
    console.error('[cron] recompute_stock_alerts failed:', recomputeError)
    return NextResponse.json({ error: recomputeError.message }, { status: 500 })
  }

  const inserted = Number(recompute?.inserted ?? 0)
  const resolved = Number(recompute?.resolved ?? 0)

  // 2. Load the new open alerts created this run to build the digest
  const { data: alerts, error: alertsError } = await supabase
    .from('stock_alerts')
    .select(`
      id, sku_id, product_id, alert_type, severity, message, status, stock_at_alert,
      sku:shelf_skus(sku_code, variant_combination),
      product:shelf_products(name)
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (alertsError) {
    console.error('[cron] Failed to load stock alerts:', alertsError)
    return NextResponse.json({ error: alertsError.message }, { status: 500 })
  }

  const rows = (alerts ?? []) as unknown as Array<{
    alert_type: 'low_stock' | 'out_of_stock'
    stock_at_alert: number
    sku: { sku_code: string; variant_combination: Record<string, string | boolean> } | null
    product: { name: string | null } | null
  }>

  const lowStockCount = rows.filter((alert) => alert.alert_type === 'low_stock').length
  const outOfStockCount = rows.filter((alert) => alert.alert_type === 'out_of_stock').length

  const items = rows.map((alert) => ({
    productName: alert.product?.name ?? 'Unknown product',
    skuCode: alert.sku?.sku_code ?? 'SKU',
    variantLabel: Object.entries(alert.sku?.variant_combination ?? {})
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(' · '),
    stockQuantity: alert.stock_at_alert,
    threshold: 0,
    alertType: alert.alert_type,
  }))

  // 3. Email the admin digest when new alerts were created
  let email: { queued: boolean; error?: string } | null = null
  if (inserted > 0) {
    try {
      await sendStockAlertDigest(items, inserted, lowStockCount, outOfStockCount)
      email = { queued: true }

      // Mark the freshly emailed alerts as notified
      const { error: notifyError } = await supabase
        .from('stock_alerts')
        .update({ notified_at: new Date().toISOString() })
        .eq('status', 'open')

      if (notifyError) console.warn('[cron] Failed to mark alerts notified:', notifyError.message)
    } catch (error) {
      email = { queued: false, error: error instanceof Error ? error.message : 'Email enqueue failed' }
    }
  }

  return NextResponse.json({
    success: true,
    inserted,
    resolved,
    openAlerts: rows.length,
    lowStockCount,
    outOfStockCount,
    email,
  })
}
