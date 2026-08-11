import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import PDFDocument from 'pdfkit/js/pdfkit.standalone'
import {
  ADMIN_ORDER_SELECT,
  getAdminOrdersData,
  groupAdminOrders,
  type AdminOrdersFilter,
  type OrderRow,
} from '@/lib/admin/queries'
import { requireAdminRequest } from '@/lib/admin/request'
import { rateLimitResponse } from '@/lib/rate-limit'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { STATUS_LABELS, formatDate, formatMoney } from '@/app/admin/orders/order-ui'
import type { AdminOrder } from '@/lib/admin/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_EXPORT_ROWS = 5000

export async function POST(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  const rateLimit = await rateLimitResponse(request, {
    prefix: 'admin_orders_export',
    windowSeconds: 300,
    maxRequests: 20,
    userId: auth.user.id,
  })

  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 })
  }

  let body: { format?: 'csv' | 'xlsx' | 'pdf'; groupIds?: string[]; filter?: AdminOrdersFilter }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const format = body.format ?? 'xlsx'
  if (!['csv', 'xlsx', 'pdf'].includes(format)) {
    return NextResponse.json({ error: 'Unsupported format.' }, { status: 400 })
  }

  try {
    const orders = await resolveOrders(body.groupIds, body.filter)

    if (orders.length === 0) {
      return NextResponse.json({ error: 'No orders matched the export criteria.' }, { status: 400 })
    }

    const { buffer, contentType, extension } = await generateExport(orders, format)
    const filename = `flux3d-orders-${new Date().toISOString().slice(0, 10)}.${extension}`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.byteLength),
      },
    })
  } catch (error) {
    console.error('Order export failed:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Export failed.',
    }, { status: 500 })
  }
}

async function resolveOrders(groupIds: string[] | undefined, filter: AdminOrdersFilter | undefined): Promise<AdminOrder[]> {
  if (groupIds && groupIds.length > 0) {
    const supabase = createAdminSupabaseClient()
    const { data } = await supabase
      .from('orders')
      .select(ADMIN_ORDER_SELECT)
      .in('group_id', groupIds)
      .order('created_at', { ascending: false })
    return groupAdminOrders((data ?? []) as OrderRow[])
  }

  // Paginate through the filtered set in chunks of 1000.
  const pageSize = 1000
  const collected: AdminOrder[] = []
  let page = 1
  while (page <= Math.ceil(MAX_EXPORT_ROWS / pageSize)) {
    const result = await getAdminOrdersData(page, pageSize, filter ?? {})
    collected.push(...result.orders)
    if (result.orders.length < pageSize) break
    page += 1
  }
  return collected
}

function buildRow(order: AdminOrder) {
  return {
    'Order Number': order.orderNumber,
    'Group ID': order.groupId,
    'Customer': order.fullName,
    'Phone': order.phone ?? '',
    'Email': order.email ?? '',
    'Files': order.items.map((item) => item.fileName).join('; '),
    'Materials': order.items.map((item) => item.material).join('; '),
    'Colors': order.items.map((item) => item.color).join('; '),
    'Status': STATUS_LABELS[order.status] ?? order.status,
    'Payment Status': order.paymentStatus ?? 'pending',
    'Grand Total': order.grandTotal,
    'Total Price': order.totalPrice,
    'Discount Amount': order.discountAmount ?? 0,
    'Delivery Charge': order.deliveryCharge,
    'Tracking Number': order.tracking_number ?? '',
    'Courier': order.courier_name ?? '',
    'Created At': order.createdAt,
  }
}

async function generateExport(orders: AdminOrder[], format: 'csv' | 'xlsx' | 'pdf') {
  const rows = orders.map(buildRow)

  if (format === 'xlsx') {
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders')
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    return {
      buffer: new Uint8Array(buffer),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: 'xlsx',
    }
  }

  if (format === 'csv') {
    const header = Object.keys(rows[0])
    const csvRows = rows.map((row) => header.map((key) => `"${String(row[key as keyof typeof row] ?? '').replace(/"/g, '""')}"`).join(','))
    const csv = '\uFEFF' + [header.join(','), ...csvRows].join('\n')
    return {
      buffer: new TextEncoder().encode(csv),
      contentType: 'text/csv;charset=utf-8',
      extension: 'csv',
    }
  }

  // PDF
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true })
  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  doc.fontSize(18).text('Flux3D — Orders Export', { align: 'center' })
  doc.moveDown(0.5)
  doc.fontSize(9).fillColor('#666666')
  doc.text(`Generated ${new Date().toLocaleString('en-IN')} · ${orders.length} orders`, { align: 'center' })
  doc.moveDown(1)

  const tableLeft = 40
  const cellPadding = 4
  const columns = [
    { label: 'Order#', width: 62 },
    { label: 'Customer', width: 128 },
    { label: 'Status', width: 68 },
    { label: 'Grand Total', width: 84 },
    { label: 'Created At', width: 133 },
  ]
  const rowHeight = 16

  function cellFor(order: AdminOrder, index: number) {
    const values = [
      order.orderNumber,
      order.fullName,
      STATUS_LABELS[order.status] ?? order.status,
      formatMoney(order.grandTotal),
      formatDate(order.createdAt),
    ]
    return values[index]
  }

  function fitText(text: string, width: number, size: number) {
    let candidate = text
    doc.fontSize(size)
    while (candidate.length > 1 && doc.widthOfString(candidate) > width - cellPadding * 2) {
      candidate = candidate.slice(0, -1)
    }
    return candidate.length < text.length ? `${candidate}…` : candidate
  }

  const drawHeader = () => {
    doc.fillColor('#4C1D95')
    let x = tableLeft
    const y = doc.y
    columns.forEach((column) => {
      doc.fontSize(9).text(column.label, x + cellPadding, y, { width: column.width - cellPadding * 2, lineBreak: false })
      x += column.width
    })
    doc.moveDown(0.7)
  }

  const drawRow = (order: AdminOrder) => {
    if (doc.y > 795 - rowHeight) {
      doc.addPage()
      drawHeader()
    }
    doc.fillColor('#111827')
    const y = doc.y
    let x = tableLeft
    columns.forEach((column, i) => {
      const value = fitText(cellFor(order, i), column.width, 8.5)
      doc.fontSize(8.5).text(value, x + cellPadding, y, { width: column.width - cellPadding * 2, lineBreak: false })
      x += column.width
    })
    doc.moveDown(rowHeight / 12)
  }

  drawHeader()
  for (const order of orders) {
    drawRow(order)
  }

  doc.end()
  const buffer = await done
  return {
    buffer: new Uint8Array(buffer),
    contentType: 'application/pdf',
    extension: 'pdf',
  }
}