import { NextResponse } from 'next/server'
import PDFDocument from 'pdfkit/js/pdfkit.standalone'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatAddressSummary, getOrderStatusLabel, type OrderStatus } from '@/lib/orders'

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
  const pdf = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)))
    doc.on('error', reject)
  })

  const pageW = doc.page.width - 100
  const rightX = doc.page.width - 50
  let y = 50

  doc.rect(50, y, pageW, 80)
  doc.fill('#0f0f23')
  doc.fillColor('#ffffff')
  doc.font('Helvetica-Bold').fontSize(28)
  doc.text('flux', 68, y + 18, { continued: true })
  doc.fillColor('#ff5c1a').text('3d')
  doc.fillColor('#8899bb').font('Helvetica').fontSize(9)
  doc.text('3D PRINTING SERVICE', 68, y + 50)
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
  doc.text('INVOICE', rightX - 160, y + 18, { width: 140, align: 'right' })
  doc.fillColor('#8899bb').font('Helvetica').fontSize(8)
  doc.text(`#${order.order_number ?? order.id}`, rightX - 160, y + 36, { width: 140, align: 'right' })
  doc.text(invoiceDate, rightX - 160, y + 50, { width: 140, align: 'right' })
  const statusLabel = getOrderStatusLabel(order.status as OrderStatus)
  doc.fillColor('#22c55e').font('Helvetica-Bold').fontSize(8)
  doc.text(statusLabel.toUpperCase(), rightX - 160, y + 64, { width: 140, align: 'right' })
  y += 100

  doc.roundedRect(50, y, pageW, 70, 6)
  doc.fill('#f8f9fc')
  doc.fillColor('#0f0f23').font('Helvetica-Bold').fontSize(8)
  doc.text('BILL TO', 68, y + 14)
  doc.fillColor('#1a1a2e').font('Helvetica-Bold').fontSize(11)
  doc.text(order.full_name, 68, y + 28)
  doc.fillColor('#555').font('Helvetica').fontSize(9)
  doc.text(order.phone, 68, y + 44)
  addressLines.forEach((line, i) => {
    doc.text(line, rightX - 180, y + 14 + i * 13, { width: 160, align: 'right' })
  })
  y += 90

  const tableLeft = 50
  const tableW = pageW
  const colDefs = [
    { x: 0, w: 120, align: 'left' as const, label: 'ITEM' },
    { x: 120, w: 100, align: 'left' as const, label: 'MATERIAL' },
    { x: 220, w: 90, align: 'left' as const, label: 'COLOR' },
    { x: 310, w: 70, align: 'center' as const, label: 'INFILL' },
    { x: 380, w: 65, align: 'center' as const, label: 'LAYER' },
    { x: 445, w: 60, align: 'right' as const, label: 'PRICE' },
  ]

  doc.roundedRect(tableLeft, y, tableW, 22, 4)
  doc.fill('#ff5c1a')
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7)
  colDefs.forEach((col) => {
    doc.text(col.label, tableLeft + col.x + 6, y + 6, { width: col.w, align: col.align })
  })
  y += 30

  doc.font('Helvetica').fontSize(9)
  items.forEach((item, idx) => {
    const fileName = item.file_url ? (String(item.file_url).split('/').pop() ?? 'Model') : 'Model'
    const rowH = 20
    if (idx % 2 === 0) {
      doc.rect(tableLeft, y - 2, tableW, rowH + 2).fill('#fafbfd')
    }
    doc.fillColor('#1a1a2e')
    const rowVals = [
      fileName,
      item.material ?? '',
      item.color ?? '',
      `${item.infill ?? 0}%`,
      `${Number(item.layer_height ?? 0).toFixed(2)} mm`,
      `₹${Number(item.price ?? 0).toFixed(0)}`,
    ]
    colDefs.forEach((col, ci) => {
      doc.text(rowVals[ci], tableLeft + col.x + 6, y + 3, { width: col.w, align: col.align })
    })
    if (idx < items.length - 1) {
      doc.moveTo(tableLeft, y + rowH - 1).lineTo(tableLeft + tableW, y + rowH - 1).strokeColor('#eee').lineWidth(0.5).stroke()
    }
    y += rowH + 2
  })
  y += 10

  doc.roundedRect(tableLeft + 240, y, 310, 85, 6)
  doc.fill('#fff6f0')
  const summaryStartX = tableLeft + 256
  let sy = y + 14
  doc.fillColor('#888').font('Helvetica-Bold').fontSize(8)
  doc.text('SUMMARY', summaryStartX, sy)
  sy += 18

  const summaryRows = [
    { label: 'Subtotal', value: `₹${subtotal.toFixed(0)}` },
    { label: 'Delivery Charge', value: totalDelivery === 0 ? 'FREE' : `₹${totalDelivery.toFixed(0)}` },
    { label: 'Est. Print Time', value: `${totalTime.toFixed(1)} hr` },
  ]
  doc.fontSize(9)
  summaryRows.forEach((row) => {
    doc.fillColor('#555').font('Helvetica').text(row.label, summaryStartX, sy)
    doc.fillColor('#1a1a2e').font('Helvetica-Bold').text(row.value, summaryStartX, sy, { width: 280, align: 'right' })
    sy += 16
  })

  doc.moveTo(summaryStartX, sy).lineTo(summaryStartX + 280, sy).strokeColor('#ff5c1a').lineWidth(1).stroke()
  sy += 12
  doc.fillColor('#ff5c1a').font('Helvetica-Bold').fontSize(14)
  doc.text('Grand Total', summaryStartX, sy)
  doc.text(`₹${grandTotal.toFixed(0)}`, summaryStartX, sy, { width: 280, align: 'right' })
  y += 110

  if (order.notes?.trim()) {
    y += 6
    doc.roundedRect(50, y, pageW, 44, 4)
    doc.fill('#f8f9fc')
    doc.fillColor('#888').font('Helvetica-Bold').fontSize(8)
    doc.text('NOTES', 68, y + 10)
    doc.fillColor('#555').font('Helvetica').fontSize(9)
    doc.text(order.notes, 68, y + 24)
    y += 60
  }

  const remaining = doc.page.height - y
  if (remaining > 80) {
    y = doc.page.height - 60
  } else {
    y += 20
  }

  doc.moveTo(50, y).lineTo(50 + pageW, y).strokeColor('#ddd').lineWidth(0.5).stroke()
  y += 12
  doc.fillColor('#999').font('Helvetica').fontSize(7)
  doc.text('Flux3D — 3D Printing Service', 50, y, { align: 'center', width: pageW })
  y += 10
  doc.text(`${order.order_number ?? order.id} · Generated on ${invoiceDate}`, 50, y, { align: 'center', width: pageW })

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

    let pdf
    try {
      pdf = await generatePdf(row, items)
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
