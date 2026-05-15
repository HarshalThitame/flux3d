import { NextResponse } from 'next/server'
import PDFDocument from 'pdfkit/js/pdfkit.standalone'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatAddressSummary } from '@/lib/orders'
import { getSettings } from '@/lib/settings'
import type { BusinessSettings } from '@/lib/admin/business-settings'
import { createAdminSupabaseClient, isCurrentUserAdmin } from '@/lib/admin/server'
import { trackFeatureUsage } from '@/lib/tracking/featureTracker'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const INVOICE_FONT_REGULAR = 'InvoiceSans'
const INVOICE_FONT_BOLD = 'InvoiceSans-Bold'
const INVOICE_FONT_REGULAR_PATH = path.join(process.cwd(), 'public/fonts/NotoSans-Regular.ttf')
const INVOICE_FONT_BOLD_PATH = path.join(process.cwd(), 'public/fonts/NotoSans-Bold.ttf')

type InvoiceRow = {
  id: string
  user_id: string | null
  order_number: string | null
  group_id: string | null
  file_url: string
  material: string
  color: string
  infill: number
  layer_height: number
  supports: boolean
  quantity?: number
  material_cost?: number | string | null
  machine_cost?: number | string | null
  post_processing_charges?: number | string | null
  subtotal?: number | string | null
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
  final_price: number | null
  grand_total: number | null
  price: number
  price_per_unit: number | null
  discount: number | null
  cart_discount: number | null
  cart_discount_percent: number | null
  coupon_discount: number | null
  offer_discount: number | null
  offer_name: string | null
  overhead_percent: number | null
  overhead_amount: number | null
  margin_percent: number | null
  margin_amount: number | null
  coupon_code: string | null
  coupon_id: string | null
  discount_type: string | null
  estimated_time: number
  status: string
  notes: string | null
  created_at: string
}

function numberToWords(value: number) {
  const ones = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

  function underThousand(n: number) {
    const parts: string[] = []
    const hundreds = Math.floor(n / 100)
    const rest = n % 100

    if (hundreds > 0) {
      parts.push(`${ones[hundreds]} hundred`)
    }

    if (rest >= 10 && rest < 20) {
      parts.push(teens[rest - 10])
    } else if (rest >= 20) {
      const ten = Math.floor(rest / 10)
      const unit = rest % 10
      parts.push(unit > 0 ? `${tens[ten]} ${ones[unit]}` : tens[ten])
    } else if (rest > 0) {
      parts.push(ones[rest])
    }

    return parts.join(' ').trim()
  }

  const n = Math.max(0, Math.round(value))
  if (n === 0) return 'zero rupees only'

  const crore = Math.floor(n / 10000000)
  const lakh = Math.floor((n % 10000000) / 100000)
  const thousand = Math.floor((n % 100000) / 1000)
  const remainder = n % 1000
  const parts: string[] = []

  if (crore) parts.push(`${underThousand(crore)} crore`)
  if (lakh) parts.push(`${underThousand(lakh)} lakh`)
  if (thousand) parts.push(`${underThousand(thousand)} thousand`)
  if (remainder) parts.push(underThousand(remainder))

  return `${parts.join(' ').replace(/\s+/g, ' ').trim()} rupees only`
}

async function generatePdf(
  order: InvoiceRow,
  items: InvoiceRow[],
  settings: BusinessSettings,
): Promise<Buffer> {
  const invoiceDateObj = new Date(order.created_at)
  const invoiceDate = invoiceDateObj.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const subtotal = items.reduce((s, i) => s + Number(i.subtotal ?? i.price), 0)
  const addressLines = formatAddressSummary({
    addressLine1: order.address_line1,
    addressLine2: order.address_line2 ?? '',
    city: order.city,
    state: order.state,
    pincode: order.pincode,
    landmark: order.landmark ?? '',
  })
  const companyName = settings.businessName || settings.brandName || 'Flux3D'
  const tagline = settings.tagline || 'Premium manufacturing solutions'
  const websiteValue = settings.websiteUrl || settings.canonicalUrl || ''
  const contactEmail = (settings.primaryEmail || '').replace(/hello@fux3d\.com/gi, 'hello@flux3d.com')
  const totalPrice = items.reduce((sum, item) => sum + Number(item.total_price), 0)
  const cartDiscountAmount = items.reduce((sum, item) => sum + Number(item.cart_discount ?? 0), 0)
  const couponDiscountAmount = items.reduce((sum, item) => sum + Number(item.coupon_discount ?? 0), 0)
  const offerDiscountAmount = items.reduce((sum, item) => sum + Number(item.offer_discount ?? 0), 0)
  const overheadAmount = items.reduce((sum, item) => sum + Number(item.overhead_amount ?? 0), 0)
  const marginAmount = items.reduce((sum, item) => sum + Number(item.margin_amount ?? 0), 0)
  const postProcessingCharges = items.reduce((sum, item) => sum + Number(item.post_processing_charges ?? 0), 0)
  const finalPrice = items.reduce((sum, item) => sum + Number(item.final_price ?? Number(item.total_price) - Number(item.discount ?? 0)), 0)
  const deliveryCharge = items.reduce((sum, item) => sum + Number(item.delivery_charge), 0)
  const cgstPercent = settings.gstEnabled ? Number(settings.cgstPercent ?? 0) : 0
  const sgstPercent = settings.gstEnabled ? Number(settings.sgstPercent ?? 0) : 0
  const cgstAmount = (finalPrice * cgstPercent) / 100
  const sgstAmount = (finalPrice * sgstPercent) / 100
  const invoiceTotal = finalPrice + cgstAmount + sgstAmount + deliveryCharge
  const separateDiscountAmount = cartDiscountAmount + couponDiscountAmount + offerDiscountAmount
  const fallbackDiscountAmount = separateDiscountAmount > 0
    ? 0
    : items.reduce((sum, item) => sum + Number(item.discount ?? 0), 0)
  const amountWords = numberToWords(invoiceTotal)
  const [regularFont, boldFont] = await Promise.all([
    readFile(INVOICE_FONT_REGULAR_PATH),
    readFile(INVOICE_FONT_BOLD_PATH),
  ])

  const doc = new PDFDocument({ size: 'A4', margin: 0 })
  doc.registerFont(INVOICE_FONT_REGULAR, regularFont)
  doc.registerFont(INVOICE_FONT_BOLD, boldFont)
  doc.font(INVOICE_FONT_REGULAR)
  const buffers: Buffer[] = []
  doc.on('data', (chunk: Buffer) => buffers.push(chunk))
  const pdf = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)))
    doc.on('error', reject)
  })

  const pageW = doc.page.width
  const pageH = doc.page.height
  const sidebarW = 6
  const headerH = 130
  const footerH = 32
  const contentLeft = 24
  const contentRight = 24
  const contentX = sidebarW + contentLeft
  const contentW = pageW - contentX - contentRight
  const bottomLimit = pageH - footerH - 16
  const colors = {
    page: '#F8FAFD',
    navy: '#0D1B2A',
    accent: '#1E90FF',
    accentDark: '#0A6EBD',
    row: '#F4F7FB',
    label: '#8A9BB0',
    text: '#1A2B3C',
    border: '#D6E4F0',
    paid: '#00B67A',
    contact: '#A8C8E8',
    separator: '#1E3A52',
  }

  let y = headerH + 14
  let inTable = false

  function drawBase() {
    doc.save()
    doc.rect(0, 0, pageW, pageH).fill(colors.page)
    doc.rect(0, 0, sidebarW, pageH).fill(colors.navy)
    doc.restore()
  }

  function drawHeader() {
    doc.save()
    doc.rect(sidebarW, 0, pageW - sidebarW, headerH).fill(colors.navy)

    const sliceStart = sidebarW + (pageW - sidebarW) * 0.56
    const sliceEnd = sidebarW + (pageW - sidebarW) * 0.74
    doc.moveTo(sliceStart, 0)
      .lineTo(sliceEnd, 0)
      .lineTo(sliceEnd + 48, headerH)
      .lineTo(sliceStart - 36, headerH)
      .closePath()
      .fill(colors.accentDark)

    doc.fillColor('#FFFFFF').font(INVOICE_FONT_BOLD).fontSize(26)
    doc.text(companyName, contentX, 22)
    doc.fillColor(colors.accent).font(INVOICE_FONT_REGULAR).fontSize(9)
    doc.text(tagline, contentX, 54)
    doc.moveTo(contentX, 68).lineTo(contentX + 170, 68).strokeColor(colors.accent).lineWidth(0.8).stroke()
    doc.fillColor(colors.contact).font(INVOICE_FONT_REGULAR).fontSize(8)
    doc.text(`${websiteValue} | ${contactEmail || settings.businessName?.toLowerCase() || ''}`.trim(), contentX, 76)
    doc.text(`${settings.primaryPhone || ''} | ${settings.city || ''}`.trim(), contentX, 88)

    const invoiceRight = pageW - contentRight
    doc.fillColor('#FFFFFF').font(INVOICE_FONT_BOLD).fontSize(36)
    doc.text('INVOICE', invoiceRight - 210, 20, { width: 210, align: 'right' })
    doc.fillColor(colors.accent).font(INVOICE_FONT_REGULAR).fontSize(9)
    doc.text(`#${order.order_number ?? order.id}`, invoiceRight - 210, 63, { width: 210, align: 'right' })

    const badgeW = 88
    const badgeH = 20
    const badgeX = invoiceRight - badgeW
    const badgeY = headerH - badgeH - 10
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 5).fill(colors.paid)
    doc.fillColor('#FFFFFF').font(INVOICE_FONT_BOLD).fontSize(9)
    doc.text('PAID', badgeX, badgeY + 5, { width: badgeW, align: 'center' })
    doc.restore()
  }

  function startPage() {
    if (doc.page) {
      drawBase()
      drawHeader()
      y = headerH + 14
    }
  }

  function ensureSpace(needed: number) {
    if (y + needed <= bottomLimit) return
    doc.addPage({ size: 'A4', margin: 0 })
    startPage()
    if (inTable) {
      y = drawTableHeader(y)
    }
  }

  function drawCard(x: number, cardY: number, w: number, h: number, fill: string, stroke: string) {
    doc.save()
    doc.roundedRect(x, cardY, w, h, 5)
    doc.fillColor(fill)
    doc.strokeColor(stroke)
    doc.lineWidth(1)
    doc.fillAndStroke()
    doc.restore()
  }

  function drawPartyCard(x: number, cardY: number, w: number, title: string, lines: string[]) {
    const h = Math.max(90, doc.heightOfString(lines.join('\n'), { width: w - 20, lineGap: 2 }) + 38)
    drawCard(x, cardY, w, h, '#FFFFFF', colors.border)
    doc.fillColor(colors.accent).font(INVOICE_FONT_BOLD).fontSize(7)
    doc.text(title, x + 16, cardY + 12)
    doc.fillColor(colors.text).font(INVOICE_FONT_BOLD).fontSize(11)
    doc.text(lines[0] ?? '', x + 16, cardY + 25, { width: w - 32 })
    doc.fillColor(colors.label).font(INVOICE_FONT_REGULAR).fontSize(8.5)
    const body = lines.slice(1).join('\n')
    if (body) {
      doc.text(body, x + 16, cardY + 41, { width: w - 32, lineGap: 2 })
    }
    return h
  }

  function drawMetaCard(x: number, cardY: number, w: number) {
    const h = 66
    drawCard(x, cardY, w, h, colors.navy, colors.navy)
    const rows = [
      { label: 'Invoice Date', value: invoiceDate },
      { label: 'Payment', value: 'PAID' },
    ]
    const rowH = h / rows.length
    rows.forEach((row, index) => {
      const ry = cardY + index * rowH
      if (index > 0) {
        doc.moveTo(x + 14, ry).lineTo(x + w - 14, ry).strokeColor(colors.separator).lineWidth(0.6).stroke()
      }
      doc.fillColor('#7EA8CC').font(INVOICE_FONT_REGULAR).fontSize(7)
      doc.text(row.label.toUpperCase(), x + 14, ry + 10, { width: w - 85 })
      doc.fillColor('#FFFFFF').font(INVOICE_FONT_BOLD).fontSize(9)
      doc.text(row.value, x + 14, ry + 8, { width: w - 28, align: 'right' })
    })
  }

  function drawTableHeader(tableY: number) {
    const cols = [
      { key: '#', x: 0, w: 18, align: 'center' as const },
      { key: 'DESCRIPTION', x: 18, w: 328, align: 'left' as const },
      { key: 'QTY', x: 346, w: 38, align: 'center' as const },
      { key: 'UNIT PRICE', x: 384, w: 84, align: 'right' as const },
      { key: 'AMOUNT', x: 468, w: 73, align: 'right' as const },
    ]
    doc.save()
    doc.roundedRect(contentX, tableY, contentW, 26, 5)
    doc.fillColor(colors.navy)
    doc.fill()
    doc.restore()
    doc.fillColor(colors.accent).font(INVOICE_FONT_BOLD).fontSize(7.5)
    cols.forEach((col) => {
      doc.text(col.key, contentX + col.x + 6, tableY + 8, { width: col.w - 12, align: col.align })
    })
    return tableY + 30
  }

  function drawTableRow(rowY: number, item: InvoiceRow, index: number) {
    const cols = [
      { x: 0, w: 18, align: 'center' as const },
      { x: 18, w: 328, align: 'left' as const },
      { x: 346, w: 38, align: 'center' as const },
      { x: 384, w: 84, align: 'right' as const },
      { x: 468, w: 73, align: 'right' as const },
    ]
    const rowH = 30
    const fill = index % 2 === 0 ? '#FFFFFF' : colors.row
    doc.save()
    doc.rect(contentX, rowY, contentW, rowH).fill(fill)
    doc.restore()
    const fileName = item.file_url ? (item.file_url.split('/').pop() ?? 'File') : 'File'
    const displayAmount = `₹${Number(item.total_price).toLocaleString('en-IN')}`
    const values = [
      String(index + 1),
      fileName,
      String(item.quantity ?? 1),
      `₹${Number(item.price_per_unit ?? item.total_price / Math.max(1, item.quantity ?? 1)).toLocaleString('en-IN')}`,
      displayAmount,
    ]

    doc.fillColor(colors.label).font(INVOICE_FONT_REGULAR).fontSize(7.5)
    doc.text(values[0], contentX + cols[0].x, rowY + 10, { width: cols[0].w, align: cols[0].align })

    doc.fillColor(colors.text).font(INVOICE_FONT_BOLD).fontSize(8.5)
    doc.text(values[1], contentX + cols[1].x + 6, rowY + 6, { width: cols[1].w - 12, ellipsis: true })
    doc.fillColor(colors.label).font(INVOICE_FONT_REGULAR).fontSize(7)
    doc.text(`${item.material} · ${item.color}`, contentX + cols[1].x + 6, rowY + 17, { width: cols[1].w - 12, ellipsis: true })

    doc.fillColor(colors.text).font(INVOICE_FONT_REGULAR).fontSize(8.5)
    doc.text(values[2], contentX + cols[2].x, rowY + 10, { width: cols[2].w, align: cols[2].align })
    doc.text(values[3], contentX + cols[3].x, rowY + 10, { width: cols[3].w - 6, align: cols[3].align })
    doc.text(values[4], contentX + cols[4].x, rowY + 10, { width: cols[4].w - 6, align: cols[4].align })
    doc.font(INVOICE_FONT_BOLD)

    doc.moveTo(contentX, rowY + rowH).lineTo(contentX + contentW, rowY + rowH).strokeColor(colors.border).lineWidth(0.4).stroke()
    return rowY + rowH
  }

  function drawTotalsBlock(blockY: number) {
    const blockW = 230
    const blockX = contentX + contentW - blockW
    const rowH = 20
    const rows = [
      { label: 'Subtotal', value: `₹${subtotal.toLocaleString('en-IN')}` },
      { label: 'Post-processing', value: `₹${postProcessingCharges.toLocaleString('en-IN')}` },
      { label: 'Overhead', value: `₹${overheadAmount.toLocaleString('en-IN')}` },
      { label: 'Margin', value: `₹${marginAmount.toLocaleString('en-IN')}` },
      { label: 'Total price', value: `₹${totalPrice.toLocaleString('en-IN')}` },
      ...(cartDiscountAmount > 0 ? [{ label: `Cart discount ${Number(order.cart_discount_percent ?? 0).toLocaleString('en-IN')}%`, value: `-₹${cartDiscountAmount.toLocaleString('en-IN')}` }] : []),
      ...(couponDiscountAmount > 0 ? [{ label: `Coupon${order.coupon_code ? ` (${order.coupon_code})` : ''}`, value: `-₹${couponDiscountAmount.toLocaleString('en-IN')}` }] : []),
      ...(offerDiscountAmount > 0 ? [{ label: `Offer${order.offer_name ? ` (${order.offer_name})` : ''}`, value: `-₹${offerDiscountAmount.toLocaleString('en-IN')}` }] : []),
      ...(fallbackDiscountAmount > 0 ? [{ label: 'Discount', value: `-₹${fallbackDiscountAmount.toLocaleString('en-IN')}` }] : []),
      { label: 'Final price', value: `₹${finalPrice.toLocaleString('en-IN')}` },
      ...(cgstAmount > 0 ? [{ label: `CGST (${cgstPercent}%)`, value: `₹${cgstAmount.toLocaleString('en-IN')}` }] : []),
      ...(sgstAmount > 0 ? [{ label: `SGST (${sgstPercent}%)`, value: `₹${sgstAmount.toLocaleString('en-IN')}` }] : []),
      { label: 'Delivery', value: deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge.toLocaleString('en-IN')}` },
    ]

    rows.forEach((row, index) => {
      const ry = blockY + index * rowH
      doc.fillColor(colors.label).font(INVOICE_FONT_REGULAR).fontSize(8.5)
      doc.text(row.label, blockX + 8, ry + 5, { width: blockW - 100, align: 'right' })
      doc.fillColor(colors.text).font(INVOICE_FONT_REGULAR).fontSize(8.5)
      doc.text(row.value, blockX + 92, ry + 5, { width: blockW - 100, align: 'right' })
      doc.moveTo(blockX + 8, ry + rowH - 1).lineTo(blockX + blockW - 8, ry + rowH - 1).strokeColor(colors.border).lineWidth(0.3).stroke()
    })

    const bandY = blockY + rows.length * rowH + 8
    doc.roundedRect(blockX, bandY, blockW, 34, 5).fill(colors.navy)
    doc.fillColor('#FFFFFF').font(INVOICE_FONT_BOLD).fontSize(10)
    doc.text('TOTAL', blockX + 12, bandY + 11)
    doc.fillColor(colors.accent).font(INVOICE_FONT_BOLD).fontSize(13)
    doc.text(`₹${invoiceTotal.toLocaleString('en-IN')}`, blockX + 12, bandY + 8, { width: blockW - 24, align: 'right' })
    doc.fillColor(colors.label).font(INVOICE_FONT_REGULAR).fontSize(7.5)
    doc.text(`₹${invoiceTotal.toLocaleString('en-IN')} (${amountWords})`, blockX, bandY + 42, { width: blockW, align: 'right' })
    return bandY + 58
  }

  function drawNotesAndTerms(blockY: number) {
    const boxX = contentX
    const boxW = contentW
    const bullets = [
      'This is a computer-generated invoice and does not require a physical signature.',
      'Please review the order details carefully before approval or dispatch.',
      'Minor variations in finish or color may occur due to the 3D printing process.',
      'Once produced or dispatched, orders are subject to the applicable service terms.',
    ]
    const leftHeight = Math.max(90, bullets.length * 16 + 26)
    drawCard(boxX, blockY, boxW, leftHeight, '#FFFFFF', colors.border)
    doc.fillColor(colors.navy).font(INVOICE_FONT_BOLD).fontSize(7.5)
    doc.text('NOTES & TERMS', boxX + 14, blockY + 12)
    doc.moveTo(boxX + 14, blockY + 25).lineTo(boxX + 162, blockY + 25).strokeColor(colors.accent).lineWidth(1.2).stroke()
    doc.fillColor(colors.label).font(INVOICE_FONT_REGULAR).fontSize(7.5)
    bullets.slice(0, 6).forEach((line, index) => {
      doc.text(`• ${line}`, boxX + 14, blockY + 34 + index * 14, { width: boxW - 28, lineGap: 1.5 })
    })
    return blockY + leftHeight + 14
  }

  function drawSignatureArea(blockY: number) {
    const lineY = blockY + 12
    doc.moveTo(contentX + contentW - 180, lineY).lineTo(contentX + contentW, lineY).strokeColor(colors.navy).lineWidth(0.7).stroke()
    doc.fillColor(colors.label).font(INVOICE_FONT_REGULAR).fontSize(7.5)
    doc.text('Authorised Signatory', contentX + contentW - 180, lineY + 6, { width: 180, align: 'right' })
    doc.fillColor(colors.navy).font(INVOICE_FONT_BOLD).fontSize(8)
    doc.text(companyName, contentX + contentW - 180, lineY + 18, { width: 180, align: 'right' })
    return lineY + 30
  }

  function drawFooter() {
    const footerY = pageH - footerH
    doc.save()
    doc.rect(sidebarW, footerY, pageW - sidebarW, footerH).fill(colors.navy)
    doc.rect(sidebarW, footerY, pageW - sidebarW, 2).fill(colors.accent)
    doc.restore()
    doc.fillColor('#7EA8CC').font(INVOICE_FONT_REGULAR).fontSize(7)
    doc.text(
      `${settings.gstNumber || 'GSTIN: —'} | ${settings.cinNumber || 'CIN: —'} | ${websiteValue.replace(/^https?:\/\//, '')}`,
      sidebarW,
      footerY + 8,
      { width: pageW - sidebarW, align: 'center' }
    )
    doc.fillColor('#4A6A80').font(INVOICE_FONT_REGULAR).fontSize(6.5)
    doc.text('computer-generated invoice', sidebarW, footerY + 18, { width: pageW - sidebarW, align: 'center' })
  }

  drawBase()
  drawHeader()

  const partyGap = 12
  const cardW = (contentW - partyGap * 2) / 3
  const cardY = y
  const addressBlock = [
    ...addressLines,
    settings.gstNumber ? `GSTIN: ${settings.gstNumber}` : 'GSTIN: —',
  ]
  const billH = drawPartyCard(contentX, cardY, cardW, 'BILL TO', [order.full_name, ...addressBlock])
  drawPartyCard(contentX + cardW + partyGap, cardY, cardW, 'SHIP TO', [order.full_name, ...addressBlock])
  drawMetaCard(contentX + (cardW + partyGap) * 2, cardY, cardW)
  y = cardY + Math.max(billH, 66) + 14

  inTable = true
  y = drawTableHeader(y)
  items.forEach((item, index) => {
    ensureSpace(30)
    y = drawTableRow(y, item, index)
  })
  inTable = false
  y += 10
  ensureSpace(170)
  y = drawTotalsBlock(y)

  ensureSpace(170)
  y = drawNotesAndTerms(y)

  ensureSpace(40)
  y = drawSignatureArea(y)

  drawFooter()

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
    const isAdmin = await isCurrentUserAdmin()
    const orderSupabase = isAdmin ? createAdminSupabaseClient() : supabase

    const selectColumns =
      'id, user_id, order_number, group_id, file_url, material, color, infill, layer_height, supports, quantity, full_name, phone, address_line1, address_line2, city, state, pincode, landmark, delivery_charge, material_cost, machine_cost, post_processing_charges, subtotal, total_price, final_price, grand_total, price, price_per_unit, discount, cart_discount, cart_discount_percent, coupon_discount, offer_discount, offer_name, overhead_percent, overhead_amount, margin_percent, margin_amount, coupon_code, coupon_id, discount_type, estimated_time, status, notes, created_at'

    let order
    let error
    try {
      let query = orderSupabase
        .from('orders')
        .select(selectColumns)
        .eq('id', orderId)
      if (!isAdmin) {
        query = query.eq('user_id', user.id)
      }
      const result = await query.maybeSingle()
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
      let groupQuery = orderSupabase
        .from('orders')
        .select(selectColumns)
        .eq('group_id', row.group_id)
      if (!isAdmin) {
        groupQuery = groupQuery.eq('user_id', user.id)
      }
      const { data: groupData } = await groupQuery.order('created_at', { ascending: true })
      if (groupData && groupData.length > 0) {
        items = groupData as InvoiceRow[]
      }
    }

    const settings = await getSettings()
    let pdf
    try {
      pdf = await generatePdf(
        row,
        items,
        settings,
      )
    } catch (e) {
      return NextResponse.json({ error: 'PDF generation failed: ' + (e instanceof Error ? e.message : String(e)) }, { status: 500 })
    }

    const filename = `${order.id}.pdf`

    void trackFeatureUsage(row.user_id ?? user.id, 'invoice_downloaded', {
      orderId: row.id,
      orderNumber: row.order_number,
      itemCount: items.length,
    }).catch(() => {})

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
