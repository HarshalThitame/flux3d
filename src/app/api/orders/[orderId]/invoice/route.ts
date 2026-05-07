import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatAddressSummary, getOrderStatusLabel, getOrderStatusClasses } from '@/lib/orders'

export const dynamic = 'force-dynamic'

type InvoiceRow = {
  id: string
  order_number: string | null
  group_id: string | null
  file_url: string
  material: string
  color: string
  infill: number
  layer_height: number
  supports: boolean
  full_name: string
  phone: string
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  pincode: string
  landmark: string | null
  delivery_charge: number
  total_price: number
  price: number
  estimated_time: number
  status: string
  notes: string | null
  created_at: string
}

function generateInvoiceHtml(order: InvoiceRow, items: InvoiceRow[]) {
  const isMulti = items.length > 1
  const invoiceDate = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const subtotal = items.reduce((s, i) => s + Number(i.price), 0)
  const totalDelivery = items.reduce((s, i) => s + Number(i.delivery_charge), 0)
  const grandTotal = items.reduce((s, i) => s + Number(i.total_price), 0)
  const totalTime = items.reduce((s, i) => s + Number(i.estimated_time), 0)
  const addressLines = formatAddressSummary({
    addressLine1: order.address_line1,
    addressLine2: order.address_line2 ?? '',
    city: order.city,
    state: order.state,
    pincode: order.pincode,
    landmark: order.landmark ?? '',
  })

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice - ${order.order_number ?? order.id}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #1a1a2e; background: #fff; line-height: 1.6; padding: 40px; }
  .invoice { max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #ff5c1a; padding-bottom: 24px; margin-bottom: 24px; }
  .header h1 { font-size: 28px; font-weight: 800; color: #0f0f23; }
  .header h1 span { color: #ff5c1a; }
  .header .meta { text-align: right; font-size: 13px; color: #666; }
  .header .meta strong { color: #1a1a2e; }
  .badge { display: inline-block; padding: 4px 14px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .badge-active { background: #d1fae5; color: #065f46; }
  .section { margin-bottom: 24px; }
  .section h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.12em; color: #888; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { text-align: left; padding: 8px 12px; background: #f5f5fa; color: #555; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
  td { padding: 10px 12px; border-bottom: 1px solid #eee; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .total-row td { font-weight: 700; font-size: 15px; border-bottom: 2px solid #1a1a2e; }
  .grand-total td { font-weight: 800; font-size: 18px; color: #ff5c1a; border: none; padding-top: 12px; }
  .address-box { background: #f8f8fc; border-radius: 12px; padding: 16px; font-size: 14px; line-height: 1.8; }
  .address-box strong { display: block; margin-bottom: 4px; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #888; text-align: center; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
</style>
</head>
<body>
<div class="invoice">
  <div class="header">
    <div>
      <h1>Flux<span>3D</span></h1>
      <p style="font-size:13px;color:#666;margin-top:4px;">3D Printing Service</p>
    </div>
    <div class="meta">
      <div><strong>Invoice</strong></div>
      <div>${order.order_number ?? order.id}</div>
      <div>${invoiceDate}</div>
      <div style="margin-top:6px;"><span class="badge badge-active">${getOrderStatusLabel(order.status as any)}</span></div>
    </div>
  </div>

  <div class="section">
    <h2>Bill To</h2>
    <div class="address-box">
      <strong>${order.full_name}</strong>
      <div>${order.phone}</div>
      ${addressLines.map(l => `<div>${l}</div>`).join('')}
    </div>
  </div>

  <div class="section">
    <h2>${isMulti ? `Order Items (${items.length})` : 'Order Details'}</h2>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Material</th>
          <th>Color</th>
          <th>Infill</th>
          <th class="num">Price</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
        <tr>
          <td>${item.file_url.split('/').pop() ?? 'Model'}</td>
          <td>${item.material}</td>
          <td>${item.color}</td>
          <td>${item.infill}%</td>
          <td class="num">₹${Number(item.price).toFixed(0)}</td>
        </tr>`).join('')}
        <tr class="total-row">
          <td colspan="4">Subtotal</td>
          <td class="num">₹${subtotal.toFixed(0)}</td>
        </tr>
        <tr class="total-row">
          <td colspan="4">Delivery Charge</td>
          <td class="num">${totalDelivery === 0 ? 'FREE' : '₹' + totalDelivery.toFixed(0)}</td>
        </tr>
        <tr class="total-row">
          <td colspan="4">Est. Print Time</td>
          <td class="num">${totalTime.toFixed(1)} hr</td>
        </tr>
        <tr class="grand-total">
          <td colspan="4">Total</td>
          <td class="num">₹${grandTotal.toFixed(0)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>Flux3D — 3D Printing Service</p>
    <p>This is a computer-generated invoice. Payment is collected separately.</p>
    <p style="margin-top:8px;">${order.order_number ?? order.id} · ${invoiceDate}</p>
  </div>
</div>
</body>
</html>`
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const row = order as InvoiceRow
    let items: InvoiceRow[] = [row]
    if (row.group_id) {
      const { data: groupData } = await supabase
        .from('orders')
        .select('*')
        .eq('group_id', row.group_id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      if (groupData && groupData.length > 0) {
        items = groupData as InvoiceRow[]
      }
    }

    const html = generateInvoiceHtml(row, items)
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="invoice-${order.order_number ?? order.id}.html"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 })
  }
}
