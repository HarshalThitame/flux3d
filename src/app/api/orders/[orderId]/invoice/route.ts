import { NextResponse } from 'next/server'
import PDFDocument from 'pdfkit/js/pdfkit.standalone'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatAddressSummary, getOrderStatusLabel, type OrderStatus } from '@/lib/orders'
import { getSettings } from '@/lib/settings'
import type { BusinessSettings } from '@/lib/admin/business-settings'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

async function generatePdf(order: InvoiceRow, items: InvoiceRow[], settings: BusinessSettings): Promise<Buffer> {
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
  const businessName = settings.businessName || 'Flux3D'
  const primaryColor = settings.primaryColor || '#7C5CFF'
  const tagline = settings.tagline || '3D PRINTING SERVICE'
  const invoicePrefix = settings.invoicePrefix || 'INV-'

  const doc = new PDFDocument({ size: 'A4', margin: 48 })
  const buffers: Buffer[] = []
  doc.on('data', (chunk: Buffer) => buffers.push(chunk))
  const pdf = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)))
    doc.on('error', reject)
  })

  const L = 48
  const R = doc.page.width - L
  const pageW = R - L
  const pageB = doc.page.height - L
  const colW = pageW
  let y = L

  function bail(pts: number) {
    if (y + pts > pageB) {
      doc.addPage()
      y = L
    }
  }

  const Rs = (n: number) => `Rs.${n.toFixed(0)}`

  doc.rect(L, y, colW, 80).fill('#0f0f23')
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(28)
  doc.text(businessName.toLowerCase(), L + 18, y + 18)
  doc.fillColor('#8899bb').font('Helvetica').fontSize(9)
  doc.text(tagline.toUpperCase(), L + 18, y + 50)

  const metaX = R - 180
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
  doc.text('INVOICE', metaX, y + 18, { width: 160, align: 'right' })
  doc.fillColor('#8899bb').font('Helvetica').fontSize(8)
  doc.text(`#${order.order_number ?? order.id}`, metaX, y + 36, { width: 160, align: 'right' })
  doc.text(invoiceDate, metaX, y + 50, { width: 160, align: 'right' })
  const rawStatus = getOrderStatusLabel(order.status as OrderStatus)
  const invoiceStatus = rawStatus === 'Completed' ? 'Paid' : rawStatus
  doc.fillColor('#22c55e').font('Helvetica-Bold').fontSize(8)
  doc.text(invoiceStatus.toUpperCase(), metaX, y + 64, { width: 160, align: 'right' })
  y += 100

  const addrH = 30 + addressLines.length * 14
  const billH = Math.max(72, addrH + 10)
  bail(billH + 24)
  doc.roundedRect(L, y, colW, billH + 24, 6).fill('#f8f9fc')
  doc.fillColor('#0f0f23').font('Helvetica-Bold').fontSize(8)
  doc.text('BILL TO', L + 18, y + 14)
  doc.fillColor('#1a1a2e').font('Helvetica-Bold').fontSize(11)
  doc.text(order.full_name, L + 18, y + 28)
  doc.fillColor('#555').font('Helvetica').fontSize(9)
  doc.text(order.phone, L + 18, y + 44)
  const addrX = R - 8 - 180
  addressLines.forEach((line, i) => {
    doc.text(line, addrX, y + 12 + i * 14, { width: 180, align: 'right' })
  })
  y += billH + 34

  const cols = [
    { x: 0, w: 145, a: 'left' as const, label: 'ITEM' },
    { x: 145, w: 100, a: 'left' as const, label: 'MATERIAL' },
    { x: 245, w: 80, a: 'left' as const, label: 'COLOR' },
    { x: 325, w: 54, a: 'center' as const, label: 'INFILL' },
    { x: 379, w: 50, a: 'center' as const, label: 'LAYER' },
    { x: 429, w: 70, a: 'right' as const, label: 'PRICE' },
  ]
  const tw = cols.reduce((s, c) => s + c.w, 0)

  const rowsH = 22 + items.length * 22 + 16
  bail(rowsH)
  doc.roundedRect(L, y, tw, 22, 4).fill(primaryColor)
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7)
  cols.forEach((c) => doc.text(c.label, L + c.x + 6, y + 6, { width: c.w, align: c.a }))
  y += 28

  doc.font('Helvetica').fontSize(9)
  items.forEach((item, idx) => {
    const fn = item.file_url ? (String(item.file_url).split('/').pop() ?? 'Model') : 'Model'
    bail(22)
    if (idx % 2 === 0) doc.rect(L, y - 2, tw, 22).fill('#fafbfd')
    doc.fillColor('#1a1a2e')
    const vals = [
      fn.length > 22 ? fn.slice(0, 20) + '..' : fn,
      item.material ?? '',
      item.color ?? '',
      `${item.infill ?? 0}%`,
      `${Number(item.layer_height ?? 0).toFixed(2)}`,
      Rs(Number(item.price ?? 0)),
    ]
    cols.forEach((c, ci) => doc.text(vals[ci], L + c.x + 6, y + 3, { width: c.w, align: c.a }))
    if (idx < items.length - 1) {
      doc.moveTo(L, y + 19).lineTo(L + tw, y + 19).strokeColor('#eee').lineWidth(0.5).stroke()
    }
    y += 22
  })
  y += 16

  const sw = 200
  const sx = R - sw
  const sh = 85
  bail(sh + 20)
  doc.roundedRect(sx, y, sw, sh, 6).fill('#fff6f0')
  let sy = y + 14
  doc.fillColor('#888').font('Helvetica-Bold').fontSize(8)
  doc.text('SUMMARY', sx + 14, sy)
  sy += 20

  const srows = [
    { l: 'Subtotal', v: Rs(subtotal) },
    { l: 'Delivery', v: totalDelivery === 0 ? 'FREE' : Rs(totalDelivery) },
    { l: 'Print Time', v: `${totalTime.toFixed(1)} hr` },
  ]
  doc.fontSize(9)
  srows.forEach((r) => {
    doc.fillColor('#555').font('Helvetica').text(r.l, sx + 14, sy)
    doc.fillColor('#1a1a2e').font('Helvetica-Bold').text(r.v, sx + 14, sy, { width: sw - 28, align: 'right' })
    sy += 16
  })

  doc.moveTo(sx + 14, sy).lineTo(sx + sw - 14, sy).strokeColor(primaryColor).lineWidth(1).stroke()
  sy += 11
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(13)
  doc.text('Grand Total', sx + 14, sy)
  doc.text(Rs(grandTotal), sx + 14, sy, { width: sw - 28, align: 'right' })
  y += sh + 20

  if (order.notes?.trim()) {
    bail(52)
    doc.roundedRect(L, y, colW, 44, 4).fill('#f8f9fc')
    doc.fillColor('#888').font('Helvetica-Bold').fontSize(8)
    doc.text('NOTES', L + 18, y + 10)
    doc.fillColor('#555').font('Helvetica').fontSize(9)
    doc.text(order.notes, L + 18, y + 24, { width: colW - 36 })
    y += 56
  }

  bail(36)
  doc.moveTo(L, y).lineTo(R, y).strokeColor('#ddd').lineWidth(0.5).stroke()
  y += 12
  doc.fillColor('#999').font('Helvetica').fontSize(7)
  doc.text(`${businessName} — ${tagline}`, L, y, { align: 'center', width: colW })
  y += 10
  doc.text(`${order.order_number ?? order.id} · Generated on ${invoiceDate}`, L, y, { align: 'center', width: colW })

  doc.end()
  return pdf
}

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

    const selectColumns =
      'id, order_number, group_id, file_url, material, color, infill, layer_height, supports, full_name, phone, address_line1, address_line2, city, state, pincode, landmark, delivery_charge, total_price, price, estimated_time, status, notes, created_at'

    let order
    let error
    try {
      const result = await supabase
        .from('orders')
        .select(selectColumns)
        .eq('id', orderId)
        .eq('user_id', user.id)
        .maybeSingle()
      order = result.data
      error = result.error
    } catch (e) {
      return NextResponse.json({ error: 'DB query exception: ' + (e instanceof Error ? e.message : String(e)) }, { status: 500 })
    }

    if (error) {
      return NextResponse.json({ error: 'DB error: ' + error.message }, { status: 500 })
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const row = order as InvoiceRow
    let items: InvoiceRow[] = [row]
    if (row.group_id) {
      const { data: groupData } = await supabase
        .from('orders')
        .select(selectColumns)
        .eq('group_id', row.group_id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      if (groupData && groupData.length > 0) {
        items = groupData as InvoiceRow[]
      }
    }

    const settings = await getSettings()
    let pdf
    try {
      pdf = await generatePdf(row, items, settings)
    } catch (e) {
      return NextResponse.json({ error: 'PDF generation failed: ' + (e instanceof Error ? e.message : String(e)) }, { status: 500 })
    }

    const filename = `${order.id}.pdf`

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdf.length),
      },
    })
  } catch (err) {
    console.error('Invoice generation fatal error:', err)
    return NextResponse.json({ error: 'Fatal error: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}
