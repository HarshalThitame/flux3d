import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { createAdminSupabaseClient, isCurrentUserAdmin } from '@/lib/admin/server'
import { trackFeatureUsage } from '@/lib/tracking/featureTracker'
import { rateLimitResponse } from '@/lib/rate-limit'
import { generateShopInvoicePdf } from '@/lib/shop/invoice'
import { mapShopOrderRow, isShopOrderPaid, type ShopOrderItem } from '@/lib/shop/orders'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params

    let supabase
    try {
      supabase = await createServerSupabaseClient()
    } catch {
      return NextResponse.json({ error: 'Failed to create Supabase client' }, { status: 500 })
    }

    let user
    try {
      const { data, error: authError } = await supabase.auth.getUser()
      if (authError) {
        return NextResponse.json({ error: 'Auth error: ' + authError.message }, { status: 401 })
      }
      user = data.user
    } catch (e) {
      return NextResponse.json({ error: 'Auth exception: ' + (e instanceof Error ? e.message : String(e)) }, { status: 500 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - no user session' }, { status: 401 })
    }

    const limit = await rateLimitResponse(_request, {
      prefix: 'invoice:shop',
      windowSeconds: 60,
      maxRequests: 10,
      userId: user.id,
    })
    if (!limit.success) {
      return NextResponse.json({ error: 'Too many invoice requests' }, { status: 429 })
    }

    const isAdmin = await isCurrentUserAdmin()
    const orderSupabase = isAdmin ? createAdminSupabaseClient() : supabase

    let query = orderSupabase
      .from('shelf_orders')
      .select('*')
      .eq('id', orderId)
    if (!isAdmin) {
      query = query.eq('user_id', user.id)
    }

    let order
    let orderError
    try {
      const result = await query.maybeSingle()
      order = result.data
      orderError = result.error
    } catch (e) {
      return NextResponse.json({ error: 'DB query exception: ' + (e instanceof Error ? e.message : String(e)) }, { status: 500 })
    }

    if (orderError) {
      return NextResponse.json({ error: 'DB error: ' + orderError.message }, { status: 500 })
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const shopOrder = mapShopOrderRow(order)
    const isPaid = isShopOrderPaid(shopOrder.payment_status)

    if (!isAdmin && !isPaid) {
      return NextResponse.json(
        { error: 'Invoice is only available after payment is confirmed.' },
        { status: 403 }
      )
    }

    const settings = await getSettings()

    let invoiceNumber = String(order.invoice_number ?? '')
    if (!invoiceNumber && isPaid) {
      const year = new Date(shopOrder.placed_at).getFullYear()
      const start = `${year}-01-01T00:00:00.000Z`
      const end = `${year + 1}-01-01T00:00:00.000Z`
      const { count } = await orderSupabase
        .from('shelf_orders')
        .select('id', { count: 'exact', head: true })
        .gte('placed_at', start)
        .lt('placed_at', end)
      const serial = (settings.shopInvoiceStartNumber || 1001) + (count ?? 0)
      const prefix = settings.shopInvoicePrefix || 'SHP-'
      invoiceNumber = `${prefix}${year}-${String(serial).padStart(5, '0')}`
      await orderSupabase
        .from('shelf_orders')
        .update({
          invoice_number: invoiceNumber,
          invoice_generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
    }

    let pdf
    try {
      pdf = await generateShopInvoicePdf(
        shopOrder,
        (Array.isArray(order.items) ? order.items : []) as ShopOrderItem[],
        settings,
        { invoiceNumber, providerPaymentId: shopOrder.provider_payment_id },
      )
    } catch (e) {
      return NextResponse.json({ error: 'PDF generation failed: ' + (e instanceof Error ? e.message : String(e)) }, { status: 500 })
    }

    const filename = invoiceNumber ? `${invoiceNumber}.pdf` : `${shopOrder.id}.pdf`

    void trackFeatureUsage(shopOrder.user_id ?? user.id, 'invoice_downloaded', {
      orderId: shopOrder.id,
      orderNumber: shopOrder.order_number,
      itemCount: (Array.isArray(order.items) ? order.items : []).length,
    }).catch(() => {})

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdf.length),
      },
    })
  } catch (err) {
    console.error('Shop invoice generation fatal error:', err)
    return NextResponse.json({ error: 'Fatal error: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}