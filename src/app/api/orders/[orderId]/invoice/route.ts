import { NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatAddressSummary, getOrderStatusLabel } from '@/lib/orders'
import { getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/supabase/config'
import { createClient } from '@supabase/supabase-js'

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

async function generatePdf(order: InvoiceRow, items: InvoiceRow[]): Promise<Buffer> {
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

  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  const buffers: Buffer[] = []
  doc.on('data', (chunk: Buffer) => buffers.push(chunk))

  const left = doc.page.margins.left
  let y = doc.page.margins.top

  doc.font('Helvetica-Bold').fontSize(26).fillColor('#0f0f23')
  doc.text('Flux', left, y, { continued: true })
  doc.fillColor('#ff5c1a').text('3D')
  y = doc.y + 4
  doc.font('Helvetica').fontSize(10).fillColor('#666')
  doc.text('3D Printing Service', left, y)
  y = doc.y + 8

  doc.font('Helvetica-Bold').fontSize(16).fillColor('#0f0f23')
  doc.text('INVOICE', left, y)
  doc.font('Helvetica').fontSize(9).fillColor('#555')
  const rightX = doc.page.width - left
  const metaLines = [
    `${order.order_number ?? order.id}`,
    invoiceDate,
    getOrderStatusLabel(order.status as any),
  ]
  const lineHeight = 13
  metaLines.forEach((line, i) => {
    doc.text(line, left, y + i * lineHeight, { width: rightX - left, align: 'right' })
  })
  y = y + metaLines.length * lineHeight + 16

  const pageW = doc.page.width - left * 2

  doc.moveTo(left, y).lineTo(left + pageW, y).strokeColor('#ff5c1a').lineWidth(2).stroke()
  y += 20

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#888')
  doc.text('BILL TO', left, y)
  y += 16

  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a1a2e')
  doc.text(order.full_name, left, y)
  y += 14
  doc.font('Helvetica').fontSize(10).fillColor('#444')
  doc.text(order.phone, left, y)
  y += 14
  addressLines.forEach(line => {
    doc.text(line, left, y)
    y += 14
  })
  y += 10

  doc.moveTo(left, y).lineTo(left + pageW, y).strokeColor('#ddd').lineWidth(1).stroke()
  y += 16

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#888')
  doc.text(isMulti ? `ORDER ITEMS (${items.length})` : 'ORDER DETAILS', left, y)
  y += 18

  const colX = [left, left + 180, left + 300, left + 370, left + pageW]
  const colWidths = [colX[1] - colX[0], colX[2] - colX[1], colX[3] - colX[2], colX[4] - colX[3] - 70, 70]
  const headers = ['Item', 'Material', 'Color', 'Infill', 'Price']
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#666')
  doc.rect(left, y - 4, pageW, 18).fill('#f5f5fa')
  doc.fillColor('#555')
  let cx = left + 4
  headers.forEach((h, i) => {
    doc.text(h, cx, y, { width: colWidths[i], align: i === headers.length - 1 ? 'right' : 'left' })
    cx += colWidths[i]
  })
  y += 18

  doc.font('Helvetica').fontSize(9).fillColor('#333')
  items.forEach((item) => {
    const rowValues = [
      item.file_url.split('/').pop() ?? 'Model',
      item.material,
      item.color,
      `${item.infill}%`,
      `Rs.${Number(item.price).toFixed(0)}`,
    ]
    cx = left + 4
    rowValues.forEach((val, i) => {
      doc.text(val, cx, y, { width: colWidths[i], align: i === rowValues.length - 1 ? 'right' : 'left' })
      cx += colWidths[i]
    })
    doc.moveTo(left, y + 16).lineTo(left + pageW, y + 16).strokeColor('#eee').lineWidth(0.5).stroke()
    y += 20
  })

  const summaryRows = [
    { label: 'Subtotal', value: `Rs.${subtotal.toFixed(0)}` },
    { label: 'Delivery Charge', value: totalDelivery === 0 ? 'FREE' : `Rs.${totalDelivery.toFixed(0)}` },
    { label: 'Est. Print Time', value: `${totalTime.toFixed(1)} hr` },
  ]
  summaryRows.forEach(row => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1a1a2e')
    doc.text(row.label, left, y)
    doc.text(row.value, left, y, { width: pageW, align: 'right' })
    y += 16
  })

  doc.moveTo(left, y).lineTo(left + pageW, y).strokeColor('#1a1a2e').lineWidth(2).stroke()
  y += 14
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#ff5c1a')
  doc.text('Total', left, y)
  doc.text(`Rs.${grandTotal.toFixed(0)}`, left, y, { width: pageW, align: 'right' })
  y += 30

  doc.moveTo(left, y).lineTo(left + pageW, y).strokeColor('#ddd').lineWidth(1).stroke()
  y += 16
  doc.font('Helvetica').fontSize(8).fillColor('#999')
  doc.text('Flux3D - 3D Printing Service', left, y, { align: 'center', width: pageW })
  y += 10
  doc.text(`${order.order_number ?? order.id} - ${invoiceDate}`, left, y, { align: 'center', width: pageW })

  doc.end()

  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)))
  })
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

    const adminSupabase = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey())
    const { data: order, error } = await adminSupabase
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
      const { data: groupData } = await adminSupabase
        .from('orders')
        .select('*')
        .eq('group_id', row.group_id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      if (groupData && groupData.length > 0) {
        items = groupData as InvoiceRow[]
      }
    }

    const pdf = await generatePdf(row, items)
    const filename = `invoice-${order.order_number ?? order.id}.pdf`

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdf.length),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 })
  }
}
