import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { verifyInvoiceShareToken } from '@/lib/orders/invoice-token'
import { generateReceiptPdfFromOrder, type ReceiptOrder } from '@/lib/whatsapp/receipt-pdf'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://flux3d.in'

export async function GET(request: Request, { params }: { params: Promise<{ orderId: string; token: string }> }) {
  const { orderId, token } = await params

  const { valid, expired } = verifyInvoiceShareToken(orderId, token)
  if (!valid) {
    return NextResponse.json(
      { error: expired ? 'Link expired' : 'Invalid link' },
      { status: expired ? 410 : 401 }
    )
  }

  const supabase = createAdminSupabaseClient()
  const { data: row, error } = await supabase
    .from('shelf_orders')
    .select('order_number, placed_at, total_amount_paise, subtotal_paise, discount_amount_paise, shipping_charge_paise, payment_currency, payment_method, payment_verified_at, provider_order_id, provider_payment_id, shipping_address, items')
    .eq('id', orderId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'DB error: ' + error.message }, { status: 500 })
  if (!row) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const addr = (row.shipping_address ?? {}) as Record<string, unknown>
  const items = (Array.isArray(row.items) ? row.items : []) as Array<{
    name?: string; productName?: string
    variantLabel?: string
    quantity?: number
    unitPrice?: number
    price?: number
  }>
  const receipt: ReceiptOrder = {
    orderNumber: row.order_number,
    placedAt: row.placed_at,
    items: items.map((it) => ({
      name: it.name ?? it.productName ?? 'Item',
      variant: it.variantLabel ?? null,
      quantity: Number(it.quantity ?? 1),
      unitPrice: Number(it.unitPrice ?? it.price ?? 0),
      thumbnail: null,
    })),
    subtotalAmountPaise: Number(row.subtotal_paise ?? row.total_amount_paise),
    discountAmountPaise: Number(row.discount_amount_paise ?? 0),
    shippingChargePaise: Number(row.shipping_charge_paise ?? 0),
    totalAmountPaise: Number(row.total_amount_paise),
    currency: (row.payment_currency || 'INR').toUpperCase(),
    symbol: '₹',
    paymentMethod: (row.payment_method || 'N/A').replace(/_/g, ' '),
    paymentVerifiedAt: row.payment_verified_at ?? null,
    providerOrderId: row.provider_order_id,
    providerPaymentId: row.provider_payment_id,
    address: {
      name: String(addr.name ?? ''),
      line1: String(addr.line1 ?? addr.addressLine1 ?? ''),
      line2: String(addr.line2 ?? addr.addressLine2 ?? ''),
      city: String(addr.city ?? ''),
      state: String(addr.state ?? ''),
      pincode: String(addr.pincode ?? ''),
      landmark: String(addr.landmark ?? ''),
      phone: String(addr.phone ?? ''),
    },
  }

  try {
    const pdf = await generateReceiptPdfFromOrder(receipt)
    const filename = `Invoice-${row.order_number ?? orderId}.pdf`
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': String(pdf.length),
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[receipts] PDF generation failed:', err)
    return NextResponse.json(
      { error: 'PDF generation failed: ' + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    )
  }
}
