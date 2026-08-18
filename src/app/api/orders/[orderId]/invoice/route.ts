import { NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatAddressSummary } from '@/lib/orders'
import { getSettings } from '@/lib/settings'
import type { BusinessSettings } from '@/lib/admin/business-settings'
import { createAdminSupabaseClient, isCurrentUserAdmin } from '@/lib/admin/server'
import { trackFeatureUsage } from '@/lib/tracking/featureTracker'
import { rateLimitResponse } from '@/lib/rate-limit'
import { numberToWords } from '@/lib/invoice/number-to-words'
import { formatMoney } from '@/lib/invoice/currency'
import { loadInvoiceLogo } from '@/lib/invoice/logo'

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
  payment_status: string | null
  notes: string | null
  invoice_number: string | null
  created_at: string
}

async function generatePdf(
  order: InvoiceRow,
  items: InvoiceRow[],
  settings: BusinessSettings,
  options: { isPaid: boolean; providerPaymentId?: string | null; invoiceNumber: string },
): Promise<Buffer> {
  const { isPaid, providerPaymentId, invoiceNumber } = options
  const invoiceLabel = isPaid ? 'TAX INVOICE' : 'PROFORMA INVOICE'
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
  const invoiceLogo = settings.invoiceLogoUrl || settings.logoUrl || ''
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
  const money = (value: number) => formatMoney(value, settings)

  const companyAddress = [
    settings.addressLine1,
    settings.addressLine2,
    [settings.city, settings.state, settings.postalCode].filter(Boolean).join(', '),
    settings.country,
  ].filter(Boolean).join(', ')

  const logoBuffer = invoiceLogo ? await loadInvoiceLogo(settings) : null

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
  const headerH = 138
  const footerH = 34
  const contentLeft = 26
  const contentRight = 26
  const contentX = contentLeft
  const contentW = pageW - contentLeft - contentRight
  const bottomLimit = pageH - footerH - 18
  const brand = {
    primary: settings.primaryColor || '#FF5C1A',
    secondary: settings.secondaryColor || '#39BDF8',
    ink: '#111827',
    muted: '#6B7280',
    lightMuted: '#9CA3AF',
    page: '#FFFFFF',
    soft: '#FFF4EC',
    border: '#F3D5C2',
    rowAlt: '#FDF6F0',
    paid: '#16A34A',
    pending: '#9CA3AF',
    navy: '#0F172A',
  }

  let y = headerH + 16
  let inTable = false
  let footerDrawn = false

  function drawBase() {
    doc.save()
    doc.rect(0, 0, pageW, pageH).fill(brand.page)
    doc.restore()
  }

  function drawHeader(logo?: Buffer | null) {
    doc.save()
    doc.rect(0, 0, pageW, headerH).fill(brand.page)

    const logoY = 20
    const leftW = 280
    let logoPlaced = false
    if (logo) {
      try {
        doc.image(logo, contentX, logoY, { fit: [210, 46] })
        logoPlaced = true
      } catch {
        logoPlaced = false
      }
    }

    if (!logoPlaced) {
      doc.fillColor(brand.ink).font(INVOICE_FONT_BOLD).fontSize(22)
      doc.text(companyName, contentX, logoY + 6, { width: leftW, ellipsis: true })
    }

    const maxInfoBottom = headerH - 10
    let infoY = logoPlaced ? 70 : 76

    const infoFields: Array<{ text: string; font: string; size: number; color: string }> = [
      { text: tagline, font: INVOICE_FONT_REGULAR, size: 8.5, color: brand.muted },
      { text: companyName, font: INVOICE_FONT_BOLD, size: 9, color: brand.ink },
    ]
    if (companyAddress) {
      infoFields.push({ text: companyAddress, font: INVOICE_FONT_REGULAR, size: 7.5, color: brand.muted })
    }
    const contactLine = [settings.primaryPhone, contactEmail, websiteValue.replace(/^https?:\/\//, '')].filter(Boolean).join('  |  ')
    if (contactLine) {
      infoFields.push({ text: contactLine, font: INVOICE_FONT_REGULAR, size: 7.5, color: brand.muted })
    }

    for (const field of infoFields) {
      const remaining = maxInfoBottom - infoY
      if (remaining <= 0) break
      doc.fillColor(field.color).font(field.font).fontSize(field.size)
      const height = doc.heightOfString(field.text, { width: leftW, lineGap: 1.5 })
      if (infoY + height > maxInfoBottom) {
        if (doc.currentLineHeight() <= remaining) {
          doc.text(field.text, contentX, infoY, { width: leftW, lineGap: 1.5, height: remaining, ellipsis: true })
        }
        break
      }
      doc.text(field.text, contentX, infoY, { width: leftW, lineGap: 1.5 })
      infoY += height + 3
    }

    const invoiceRight = pageW - contentRight
    const labelW = 250
    doc.fillColor(brand.primary).font(INVOICE_FONT_BOLD)
    doc.fontSize(30)
    if (doc.widthOfString(invoiceLabel) > 236) {
      doc.fontSize(22)
    }
    doc.text(invoiceLabel, invoiceRight - labelW, 16, { width: labelW, align: 'right' })
    doc.fillColor(brand.muted).font(INVOICE_FONT_REGULAR).fontSize(8.5)
    doc.text(`Order #${order.order_number ?? order.id}`, invoiceRight - labelW, 58, { width: labelW, align: 'right' })
    doc.fillColor(brand.ink).font(INVOICE_FONT_BOLD).fontSize(11)
    doc.text(invoiceNumber, invoiceRight - labelW, 72, { width: labelW, align: 'right' })
    doc.fillColor(brand.muted).font(INVOICE_FONT_REGULAR).fontSize(8.5)
    doc.text(`Invoice date: ${invoiceDate}`, invoiceRight - labelW, 90, { width: labelW, align: 'right' })

    const badgeW = 96
    const badgeH = 22
    const badgeX = invoiceRight - badgeW
    const badgeY = 106
    const badgeFill = isPaid ? brand.paid : brand.pending
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 11).fill(badgeFill)
    doc.fillColor('#FFFFFF').font(INVOICE_FONT_BOLD).fontSize(10)
    doc.text(isPaid ? 'PAID' : 'UNPAID', badgeX, badgeY + 7, { width: badgeW, align: 'center' })

    doc.moveTo(contentX, headerH - 6).lineTo(pageW - contentRight, headerH - 6).lineWidth(3).strokeColor(brand.primary).stroke()
    doc.restore()
  }

  function startPage() {
    if (doc.page) {
      drawBase()
      drawHeader(logoBuffer)
      footerDrawn = false
      drawFooter()
      y = headerH + 16
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

  function drawCard(x: number, cardY: number, w: number, h: number) {
    doc.save()
    doc.roundedRect(x, cardY, w, h, 6)
    doc.fillColor('#FFFFFF')
    doc.strokeColor(brand.border)
    doc.lineWidth(1)
    doc.fillAndStroke()
    doc.restore()
  }

  function measurePartyCard(w: number, lines: string[]) {
    const name = lines[0] ?? ''
    const body = lines.slice(1).join('\n')
    doc.font(INVOICE_FONT_BOLD).fontSize(11)
    const nameH = doc.heightOfString(name, { width: w - 36 })
    doc.font(INVOICE_FONT_REGULAR).fontSize(8.5)
    const bodyH = body ? doc.heightOfString(body, { width: w - 36, lineGap: 2 }) : 0
    return Math.max(92, 27 + nameH + 6 + bodyH + 14)
  }

  function drawPartyCard(x: number, cardY: number, w: number, title: string, lines: string[]) {
    const name = lines[0] ?? ''
    const body = lines.slice(1).join('\n')
    const h = measurePartyCard(w, lines)
    const nameH = (() => {
      doc.font(INVOICE_FONT_BOLD).fontSize(11)
      return doc.heightOfString(name, { width: w - 36 })
    })()
    const bodyY = cardY + 27 + nameH + 6
    drawCard(x, cardY, w, h)
    doc.fillColor(brand.primary).font(INVOICE_FONT_BOLD).fontSize(7)
    doc.text(title.toUpperCase(), x + 18, cardY + 14)
    doc.fillColor(brand.ink).font(INVOICE_FONT_BOLD).fontSize(11)
    doc.text(name, x + 18, cardY + 27, { width: w - 36 })
    doc.fillColor(brand.muted).font(INVOICE_FONT_REGULAR).fontSize(8.5)
    if (body) {
      doc.text(body, x + 18, bodyY, { width: w - 36, lineGap: 2 })
    }
    return h
  }

  function drawMetaCard(x: number, cardY: number, w: number) {
    const h = 92
    drawCard(x, cardY, w, h)
    doc.fillColor(brand.primary).font(INVOICE_FONT_BOLD).fontSize(7)
    doc.text('PAYMENT'.toUpperCase(), x + 18, cardY + 14)
    const paymentLabel = isPaid
      ? `PAID${providerPaymentId ? ` (${providerPaymentId.slice(-8)})` : ''}`
      : 'PROFORMA'
    const rows = [
      { label: 'Invoice date', value: invoiceDate },
      { label: 'Payment', value: paymentLabel },
    ]
    const rowH = (h - 30) / rows.length
    rows.forEach((row, index) => {
      const ry = cardY + 30 + index * rowH
      doc.fillColor(brand.lightMuted).font(INVOICE_FONT_REGULAR).fontSize(7)
      doc.text(row.label.toUpperCase(), x + 18, ry + 4, { width: w - 90 })
      doc.fillColor(brand.ink).font(INVOICE_FONT_BOLD).fontSize(9)
      doc.text(row.value, x + 18, ry + 2, { width: w - 36, align: 'right' })
    })
  }

  function drawTableHeader(tableY: number) {
    const cols = [
      { key: '#', x: 0, w: 20, align: 'center' as const },
      { key: 'DESCRIPTION', x: 20, w: 322, align: 'left' as const },
      { key: 'QTY', x: 342, w: 40, align: 'center' as const },
      { key: 'UNIT PRICE', x: 382, w: 88, align: 'right' as const },
      { key: 'AMOUNT', x: 470, w: 72, align: 'right' as const },
    ]
    doc.save()
    doc.roundedRect(contentX, tableY, contentW, 28, 5)
    doc.fillColor(brand.primary)
    doc.fill()
    doc.restore()
    doc.fillColor('#FFFFFF').font(INVOICE_FONT_BOLD).fontSize(7.5)
    cols.forEach((col) => {
      doc.text(col.key, contentX + col.x + 6, tableY + 9, { width: col.w - 12, align: col.align })
    })
    return tableY + 32
  }

  function drawTableRow(rowY: number, item: InvoiceRow, index: number) {
    const cols = [
      { x: 0, w: 20, align: 'center' as const },
      { x: 20, w: 322, align: 'left' as const },
      { x: 342, w: 40, align: 'center' as const },
      { x: 382, w: 88, align: 'right' as const },
      { x: 470, w: 72, align: 'right' as const },
    ]
    const rowH = 32
    const fill = index % 2 === 0 ? '#FFFFFF' : brand.rowAlt
    doc.save()
    doc.rect(contentX, rowY, contentW, rowH).fill(fill)
    doc.restore()
    const fileName = item.file_url ? (item.file_url.split('/').pop() ?? 'File') : 'File'
    const quantity = item.quantity ?? 1
    const unitPrice = item.price_per_unit ?? item.total_price / Math.max(1, quantity)
    const lineTotal = item.total_price
    const values = [
      String(index + 1),
      fileName,
      String(quantity),
      money(unitPrice),
      money(lineTotal),
    ]

    doc.fillColor(brand.muted).font(INVOICE_FONT_REGULAR).fontSize(8)
    doc.text(values[0], contentX + cols[0].x, rowY + 11, { width: cols[0].w, align: cols[0].align })

    doc.fillColor(brand.ink).font(INVOICE_FONT_BOLD).fontSize(9)
    doc.text(values[1], contentX + cols[1].x + 6, rowY + 6, { width: cols[1].w - 12, ellipsis: true })
    doc.fillColor(brand.muted).font(INVOICE_FONT_REGULAR).fontSize(7)
    doc.text(`${item.material} · ${item.color}`, contentX + cols[1].x + 6, rowY + 18, { width: cols[1].w - 12, ellipsis: true })

    doc.fillColor(brand.ink).font(INVOICE_FONT_REGULAR).fontSize(8.5)
    doc.text(values[2], contentX + cols[2].x, rowY + 11, { width: cols[2].w, align: cols[2].align })
    doc.text(values[3], contentX + cols[3].x, rowY + 11, { width: cols[3].w - 6, align: cols[3].align })
    doc.text(values[4], contentX + cols[4].x, rowY + 11, { width: cols[4].w - 6, align: cols[4].align })
    doc.font(INVOICE_FONT_BOLD)

    doc.moveTo(contentX, rowY + rowH).lineTo(contentX + contentW, rowY + rowH).strokeColor(brand.border).lineWidth(0.5).stroke()
    return rowY + rowH
  }

  function drawTotalsBlock(blockY: number, measure = false) {
    const blockW = 236
    const blockX = contentX + contentW - blockW
    const rowH = 20
    const rows = [
      { label: 'Subtotal', value: money(subtotal) },
      { label: 'Post-processing', value: money(postProcessingCharges) },
      { label: 'Overhead', value: money(overheadAmount) },
      { label: 'Margin', value: money(marginAmount) },
      { label: 'Total price', value: money(totalPrice) },
      ...(cartDiscountAmount > 0 ? [{ label: `Cart discount ${Number(order.cart_discount_percent ?? 0).toLocaleString('en-IN')}%`, value: `-${money(cartDiscountAmount)}` }] : []),
      ...(couponDiscountAmount > 0 ? [{ label: `Coupon${order.coupon_code ? ` (${order.coupon_code})` : ''}`, value: `-${money(couponDiscountAmount)}` }] : []),
      ...(offerDiscountAmount > 0 ? [{ label: `Offer${order.offer_name ? ` (${order.offer_name})` : ''}`, value: `-${money(offerDiscountAmount)}` }] : []),
      ...(fallbackDiscountAmount > 0 ? [{ label: 'Discount', value: `-${money(fallbackDiscountAmount)}` }] : []),
      { label: 'Final price', value: money(finalPrice) },
      ...(cgstAmount > 0 ? [{ label: `CGST (${cgstPercent}%)`, value: money(cgstAmount) }] : []),
      ...(sgstAmount > 0 ? [{ label: `SGST (${sgstPercent}%)`, value: money(sgstAmount) }] : []),
      { label: 'Delivery', value: deliveryCharge === 0 ? 'FREE' : money(deliveryCharge) },
    ]
    const labelW = 140
    const valueX = blockX + 156
    const valueW = 72
    const bandY = blockY + rows.length * rowH + 10

    doc.font(INVOICE_FONT_REGULAR).fontSize(7.5)
    const wordsH = doc.heightOfString(`${amountWords}`, { width: blockW })
    const resultY = bandY + 46 + wordsH + 4
    if (measure) return resultY

    rows.forEach((row, index) => {
      const ry = blockY + index * rowH
      doc.fillColor(brand.muted).font(INVOICE_FONT_REGULAR).fontSize(8.5)
      doc.text(row.label, blockX + 8, ry + 5, { width: labelW, align: 'right', ellipsis: true, height: doc.currentLineHeight() })
      doc.fillColor(brand.ink).font(INVOICE_FONT_REGULAR).fontSize(8.5)
      doc.text(row.value, valueX, ry + 5, { width: valueW, align: 'right', ellipsis: true, height: doc.currentLineHeight() })
      doc.moveTo(blockX + 8, ry + rowH - 1).lineTo(blockX + blockW - 8, ry + rowH - 1).strokeColor(brand.border).lineWidth(0.3).stroke()
    })

    doc.roundedRect(blockX, bandY, blockW, 36, 5).fill(brand.navy)
    doc.fillColor('#FFFFFF').font(INVOICE_FONT_BOLD).fontSize(10)
    doc.text('TOTAL', blockX + 14, bandY + 12)
    doc.fillColor(brand.primary).font(INVOICE_FONT_BOLD).fontSize(14)
    doc.text(money(invoiceTotal), blockX + 14, bandY + 9, { width: blockW - 28, align: 'right' })
    doc.fillColor(brand.lightMuted).font(INVOICE_FONT_REGULAR).fontSize(7.5)
    doc.text(`${amountWords}`, blockX, bandY + 46, { width: blockW, align: 'right' })
    return resultY
  }

  function drawNotesAndTerms(blockY: number, measure = false) {
    const boxX = contentX
    const boxW = contentW
    const bankInfo = settings.bankAccountName && settings.bankName
      ? `Bank: ${settings.bankName} | A/C: ${settings.accountNumber || '—'} | IFSC: ${settings.ifscCode || '—'}${settings.upiId ? ` | UPI: ${settings.upiId}` : ''}`
      : ''
    const bullets = [
      'This is a computer-generated invoice and does not require a physical signature.',
      'Please review the order details carefully before approval or dispatch.',
      'Minor variations in finish or color may occur due to the 3D printing process.',
      ...(settings.paymentTerms ? [settings.paymentTerms] : []),
      ...(bankInfo ? [bankInfo] : []),
    ].slice(0, 6)

    doc.font(INVOICE_FONT_REGULAR).fontSize(7.5)
    const bulletHeights = bullets.map((line) => doc.heightOfString(`•  ${line}`, { width: boxW - 32, lineGap: 1.5 }))
    const bulletTotal = bulletHeights.reduce((sum, h) => sum + h + 6, 0)
    const leftHeight = Math.max(92, 26 + bulletTotal + 16)
    const resultY = blockY + leftHeight + 14
    if (measure) return resultY

    drawCard(boxX, blockY, boxW, leftHeight)
    doc.fillColor(brand.ink).font(INVOICE_FONT_BOLD).fontSize(7.5)
    doc.text('NOTES & TERMS', boxX + 16, blockY + 13)
    doc.moveTo(boxX + 16, blockY + 26).lineTo(boxX + 150, blockY + 26).strokeColor(brand.primary).lineWidth(1.4).stroke()
    doc.fillColor(brand.muted).font(INVOICE_FONT_REGULAR).fontSize(7.5)
    let bulletY = blockY + 36
    bullets.forEach((line, index) => {
      doc.text(`•  ${line}`, boxX + 16, bulletY, { width: boxW - 32, lineGap: 1.5 })
      bulletY += bulletHeights[index] + 6
    })
    return resultY
  }

  function drawSignatureArea(blockY: number) {
    const lineY = blockY + 12
    doc.moveTo(contentX + contentW - 190, lineY).lineTo(contentX + contentW, lineY).strokeColor(brand.ink).lineWidth(0.7).stroke()
    doc.fillColor(brand.muted).font(INVOICE_FONT_REGULAR).fontSize(7.5)
    doc.text('Authorised Signatory', contentX + contentW - 190, lineY + 6, { width: 190, align: 'right' })
    doc.fillColor(brand.ink).font(INVOICE_FONT_BOLD).fontSize(8)
    doc.text(companyName, contentX + contentW - 190, lineY + 18, { width: 190, align: 'right' })
    return lineY + 30
  }

  function drawFooter() {
    if (footerDrawn) return
    footerDrawn = true
    const footerY = pageH - footerH
    doc.save()
    doc.rect(0, footerY, pageW, footerH).fill('#FFFFFF')
    doc.rect(0, footerY, pageW, 2).fill(brand.primary)
    doc.restore()
    doc.fillColor(brand.muted).font(INVOICE_FONT_REGULAR).fontSize(7)
    doc.text(
      `${settings.gstNumber ? `GSTIN: ${settings.gstNumber}` : ''} | ${settings.panNumber ? `PAN: ${settings.panNumber}` : ''} | ${settings.sacHsnCode ? `SAC: ${settings.sacHsnCode}` : ''} | ${settings.cinNumber ? `CIN: ${settings.cinNumber}` : ''} | ${settings.msmeNumber ? `MSME: ${settings.msmeNumber}` : ''} | ${websiteValue.replace(/^https?:\/\//, '')}`,
      20,
      footerY + 9,
      { width: pageW - 40, align: 'center', ellipsis: true, height: doc.currentLineHeight() }
    )
    doc.fillColor(brand.lightMuted).font(INVOICE_FONT_REGULAR).fontSize(6.5)
    doc.text('computer-generated invoice · Flux3D', 0, footerY + 21, { width: pageW, align: 'center' })
  }

  drawBase()
  drawHeader(logoBuffer)
  drawFooter()

  const partyGap = 12
  const cardW = (contentW - partyGap * 2) / 3
  const addressBlock = [
    ...addressLines,
    settings.gstNumber ? `GST: ${settings.gstNumber}` : null,
    settings.panNumber ? `PAN: ${settings.panNumber}` : null,
    settings.msmeNumber ? `MSME: ${settings.msmeNumber}` : null,
  ].filter(Boolean) as string[]
  const cardH = Math.max(92, measurePartyCard(cardW, [order.full_name, ...addressBlock]))
  ensureSpace(cardH + 14)
  const cardY = y
  const billH = drawPartyCard(contentX, cardY, cardW, 'BILL TO', [order.full_name, ...addressBlock])
  drawPartyCard(contentX + cardW + partyGap, cardY, cardW, 'SHIP TO', [order.full_name, ...addressBlock])
  drawMetaCard(contentX + (cardW + partyGap) * 2, cardY, cardW)
  y = cardY + Math.max(billH, cardH) + 14

  inTable = true
  y = drawTableHeader(y)
  items.forEach((item, index) => {
    ensureSpace(32)
    y = drawTableRow(y, item, index)
  })
  inTable = false
  y += 10
  ensureSpace(drawTotalsBlock(y, true) - y)
  y = drawTotalsBlock(y)

  ensureSpace(drawNotesAndTerms(y, true) - y)
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

    const limit = await rateLimitResponse(_request, {
      prefix: 'invoice',
      windowSeconds: 60,
      maxRequests: 10,
      userId: user.id,
    })
    if (!limit.success) {
      return NextResponse.json({ error: 'Too many invoice requests' }, { status: 429 })
    }

    const isAdmin = await isCurrentUserAdmin()
    const orderSupabase = isAdmin ? createAdminSupabaseClient() : supabase

    const selectColumns =
      'id, user_id, order_number, group_id, file_url, material, color, infill, layer_height, supports, quantity, full_name, phone, address_line1, address_line2, city, state, pincode, landmark, delivery_charge, material_cost, machine_cost, post_processing_charges, subtotal, total_price, final_price, grand_total, price, price_per_unit, discount, cart_discount, cart_discount_percent, coupon_discount, offer_discount, offer_name, overhead_percent, overhead_amount, margin_percent, margin_amount, coupon_code, coupon_id, discount_type, estimated_time, status, payment_status, notes, invoice_number, created_at'

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

    const settings = await getSettings()

    const allowedPaymentStatuses = new Set(['captured', 'paid', 'succeeded'])
    const isPaid = allowedPaymentStatuses.has(row.payment_status ?? '')

    if (!isAdmin && !isPaid) {
      return NextResponse.json(
        { error: 'Invoice is only available after payment is confirmed.' },
        { status: 403 }
      )
    }

    // Fetch provider payment reference if paid
    let providerPaymentId: string | null = null
    if (isPaid) {
      const { data: attempt } = await orderSupabase
        .from('payment_attempts')
        .select('provider_payment_id')
        .eq('internal_order_id', orderId)
        .in('status', ['captured', 'paid', 'succeeded'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      providerPaymentId = attempt?.provider_payment_id ?? null
    }

    // Generate and persist invoice number on first download
    let invoiceNumber = row.invoice_number ?? ''
    if (!invoiceNumber && isPaid) {
      const year = new Date(row.created_at).getFullYear()
      const { count } = await orderSupabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', `${year}-01-01T00:00:00.000Z`)
        .lt('created_at', `${year + 1}-01-01T00:00:00.000Z`)
      const serial = (settings.invoiceStartNumber || 1001) + (count ?? 0)
      const prefix = settings.invoicePrefix || 'INV-'
      invoiceNumber = `${prefix}${year}-${String(serial).padStart(5, '0')}`
      await orderSupabase
        .from('orders')
        .update({
          invoice_number: invoiceNumber,
          invoice_generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
    }

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

    let pdf
    try {
      pdf = await generatePdf(
        row,
        items,
        settings,
        { isPaid, providerPaymentId, invoiceNumber },
      )
    } catch (e) {
      return NextResponse.json({ error: 'PDF generation failed: ' + (e instanceof Error ? e.message : String(e)) }, { status: 500 })
    }

    const filename = invoiceNumber
      ? `${invoiceNumber}.pdf`
      : `${order.id}.pdf`

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
