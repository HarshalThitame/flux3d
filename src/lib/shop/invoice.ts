import PDFDocument from 'pdfkit/js/pdfkit.standalone'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { BusinessSettings } from '@/lib/admin/business-settings'
import { numberToWords } from '@/lib/invoice/number-to-words'
import type { ShopOrder, ShopOrderItem } from '@/lib/shop/orders'
import { isShopOrderPaid } from '@/lib/shop/orders'

const INVOICE_FONT_REGULAR = 'InvoiceSans'
const INVOICE_FONT_BOLD = 'InvoiceSans-Bold'
const INVOICE_FONT_REGULAR_PATH = path.join(process.cwd(), 'public/fonts/NotoSans-Regular.ttf')
const INVOICE_FONT_BOLD_PATH = path.join(process.cwd(), 'public/fonts/NotoSans-Bold.ttf')

type ShopInvoiceOptions = {
  invoiceNumber: string
  providerPaymentId?: string | null
}

function normalizeMoney(value: number | null | undefined) {
  const next = Number(value ?? 0)
  return Number.isFinite(next) ? next : 0
}

function money(value: number, currencySymbol: string) {
  return `${currencySymbol}${Math.round(value).toLocaleString('en-IN')}`
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export async function generateShopInvoicePdf(
  order: ShopOrder,
  items: ShopOrderItem[],
  settings: BusinessSettings,
  options: ShopInvoiceOptions,
): Promise<Buffer> {
  const { invoiceNumber, providerPaymentId } = options
  const isPaid = isShopOrderPaid(order.payment_status)
  const invoiceLabel = isPaid ? 'TAX INVOICE' : 'PROFORMA INVOICE'
  const invoiceDate = formatDate(order.placed_at)

  const subtotal = items.reduce((sum, item) => sum + normalizeMoney(item.unitPrice) * normalizeMoney(item.quantity), 0)
  const discountAmount = normalizeMoney(order.discount_amount)
  const deliveryCharge = normalizeMoney(order.shipping_charge)
  const finalPrice = Math.max(0, subtotal - discountAmount)
  const cgstPercent = settings.gstEnabled ? Number(settings.cgstPercent ?? 0) : 0
  const sgstPercent = settings.gstEnabled ? Number(settings.sgstPercent ?? 0) : 0
  const cgstAmount = (finalPrice * cgstPercent) / 100
  const sgstAmount = (finalPrice * sgstPercent) / 100
  const invoiceTotal = finalPrice + cgstAmount + sgstAmount + deliveryCharge

  const companyName = settings.businessName || settings.brandName || 'Flux3D'
  const invoiceLogo = settings.invoiceLogoUrl || settings.logoUrl || ''
  const tagline = settings.tagline || 'Premium manufacturing solutions'
  const websiteValue = settings.websiteUrl || settings.canonicalUrl || ''
  const contactEmail = (settings.primaryEmail || '').replace(/hello@fux3d\.com/gi, 'hello@flux3d.com')
  const currencySym = settings.currencySymbol || '₹'
  const amountWords = numberToWords(invoiceTotal)

  const customerName = order.shipping_address.name || 'Customer'
  const addressLines = [
    order.shipping_address.line1,
    order.shipping_address.line2,
    order.shipping_address.city && order.shipping_address.state
      ? `${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.pincode}`.trim()
      : '',
    order.shipping_address.phone,
  ].filter(Boolean) as string[]

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

  async function drawHeader() {
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

    const logoY = 18
    if (invoiceLogo) {
      try {
        const baseUrl = (settings.websiteUrl || 'https://flux3d.in').replace(/\/+$/, '')
        const logoUrl = invoiceLogo.startsWith('http') ? invoiceLogo : `${baseUrl}${invoiceLogo.startsWith('/') ? '' : '/'}${invoiceLogo}`
        const resp = await fetch(logoUrl)
        const arrayBuf = await resp.arrayBuffer()
        doc.image(Buffer.from(arrayBuf), contentX, 14, { width: 120 })
      } catch {
        doc.fillColor('#FFFFFF').font(INVOICE_FONT_BOLD).fontSize(26)
        doc.text(companyName, contentX, logoY)
      }
    } else {
      doc.fillColor('#FFFFFF').font(INVOICE_FONT_BOLD).fontSize(26)
      doc.text(companyName, contentX, logoY)
    }
    doc.fillColor(colors.accent).font(INVOICE_FONT_REGULAR).fontSize(9)
    doc.text(tagline, contentX, logoY + 36)
    doc.moveTo(contentX, 68).lineTo(contentX + 170, 68).strokeColor(colors.accent).lineWidth(0.8).stroke()
    doc.fillColor(colors.contact).font(INVOICE_FONT_REGULAR).fontSize(8)
    doc.text(`${websiteValue} | ${contactEmail || settings.businessName?.toLowerCase() || ''}`.trim(), contentX, 76)
    doc.text(`${settings.primaryPhone || ''} | ${settings.city || ''}`.trim(), contentX, 88)
    const ids = [settings.gstNumber ? `GST: ${settings.gstNumber}` : '', settings.panNumber ? `PAN: ${settings.panNumber}` : '', settings.msmeNumber ? `MSME: ${settings.msmeNumber}` : ''].filter(Boolean).join(' | ')
    if (ids) {
      doc.fillColor(colors.contact).font(INVOICE_FONT_REGULAR).fontSize(7)
      doc.text(ids, contentX, 100)
    }

    const invoiceRight = pageW - contentRight
    doc.fillColor('#FFFFFF').font(INVOICE_FONT_BOLD).fontSize(36)
    doc.text(invoiceLabel, invoiceRight - 210, 20, { width: 210, align: 'right' })
    doc.fillColor(colors.accent).font(INVOICE_FONT_REGULAR).fontSize(9)
    doc.text(`#${order.order_number}`, invoiceRight - 210, 63, { width: 210, align: 'right' })
    doc.fillColor('#FFFFFF').font(INVOICE_FONT_BOLD).fontSize(10)
    doc.text(invoiceNumber, invoiceRight - 210, 80, { width: 210, align: 'right' })

    const badgeW = 88
    const badgeH = 20
    const badgeX = invoiceRight - badgeW
    const badgeY = headerH - badgeH - 10
    if (isPaid) {
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 5).fill(colors.paid)
      doc.fillColor('#FFFFFF').font(INVOICE_FONT_BOLD).fontSize(9)
      doc.text('PAID', badgeX, badgeY + 5, { width: badgeW, align: 'center' })
    } else {
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 5).fill('#A0A0A0')
      doc.fillColor('#FFFFFF').font(INVOICE_FONT_BOLD).fontSize(9)
      doc.text('UNPAID', badgeX, badgeY + 5, { width: badgeW, align: 'center' })
    }
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
    const paymentLabel = isPaid
      ? `PAID${providerPaymentId ? ` (${providerPaymentId.slice(-8)})` : ''}`
      : 'PROFORMA'
    const rows = [
      { label: 'Invoice Date', value: invoiceDate },
      { label: 'Payment', value: paymentLabel },
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

  function drawTableRow(rowY: number, item: ShopOrderItem, index: number) {
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
    const unitPrice = normalizeMoney(item.unitPrice)
    const quantity = normalizeMoney(item.quantity)
    const lineTotal = unitPrice * quantity
    const values = [
      String(index + 1),
      item.productName,
      String(quantity),
      money(unitPrice, currencySym),
      money(lineTotal, currencySym),
    ]

    doc.fillColor(colors.label).font(INVOICE_FONT_REGULAR).fontSize(7.5)
    doc.text(values[0], contentX + cols[0].x, rowY + 10, { width: cols[0].w, align: cols[0].align })

    doc.fillColor(colors.text).font(INVOICE_FONT_BOLD).fontSize(8.5)
    doc.text(values[1], contentX + cols[1].x + 6, rowY + 6, { width: cols[1].w - 12, ellipsis: true })
    doc.fillColor(colors.label).font(INVOICE_FONT_REGULAR).fontSize(7)
    const variantText = item.variantLabel
      ? `${item.variantLabel}${item.customizationText ? ` · ${item.customizationText}` : ''}`
      : item.customizationText || ''
    doc.text(variantText, contentX + cols[1].x + 6, rowY + 17, { width: cols[1].w - 12, ellipsis: true })

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
      { label: 'Subtotal', value: money(subtotal, currencySym) },
      ...(discountAmount > 0 ? [{ label: `Discount${order.coupon_code ? ` (${order.coupon_code})` : ''}`, value: `-${money(discountAmount, currencySym)}` }] : []),
      { label: 'Final price', value: money(finalPrice, currencySym) },
      ...(cgstAmount > 0 ? [{ label: `CGST (${cgstPercent}%)`, value: money(cgstAmount, currencySym) }] : []),
      ...(sgstAmount > 0 ? [{ label: `SGST (${sgstPercent}%)`, value: money(sgstAmount, currencySym) }] : []),
      { label: 'Delivery', value: deliveryCharge === 0 ? 'FREE' : money(deliveryCharge, currencySym) },
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
    doc.text(money(invoiceTotal, currencySym), blockX + 12, bandY + 8, { width: blockW - 24, align: 'right' })
    doc.fillColor(colors.label).font(INVOICE_FONT_REGULAR).fontSize(7.5)
    doc.text(`${money(invoiceTotal, currencySym)} (${amountWords})`, blockX, bandY + 42, { width: blockW, align: 'right' })
    return bandY + 58
  }

  function drawNotesAndTerms(blockY: number) {
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
      `${settings.gstNumber || 'GSTIN: —'} | ${settings.panNumber || 'PAN: —'} | ${settings.sacHsnCode ? `SAC: ${settings.sacHsnCode}` : ''} | ${settings.cinNumber || 'CIN: —'} | ${websiteValue.replace(/^https?:\/\//, '')}`,
      sidebarW,
      footerY + 8,
      { width: pageW - sidebarW, align: 'center' }
    )
    doc.fillColor('#4A6A80').font(INVOICE_FONT_REGULAR).fontSize(6.5)
    doc.text('computer-generated invoice', sidebarW, footerY + 18, { width: pageW - sidebarW, align: 'center' })
  }

  drawBase()
  await drawHeader()

  const partyGap = 12
  const cardW = (contentW - partyGap * 2) / 3
  const cardY = y
  const addressBlock = [
    ...addressLines,
    order.coupon_code ? `Coupon: ${order.coupon_code}` : null,
  ].filter(Boolean) as string[]
  const billH = drawPartyCard(contentX, cardY, cardW, 'BILL TO', [customerName, ...addressBlock])
  drawPartyCard(contentX + cardW + partyGap, cardY, cardW, 'SHIP TO', [customerName, ...addressBlock])
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
