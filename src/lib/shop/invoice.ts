import PDFDocument from 'pdfkit/js/pdfkit.standalone'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { BusinessSettings } from '@/lib/admin/business-settings'
import { numberToWords } from '@/lib/invoice/number-to-words'
import { formatMoney } from '@/lib/invoice/currency'
import type { ShopOrder, ShopOrderItem } from '@/lib/shop/orders'
import { isShopOrderPaid } from '@/lib/shop/orders'

const FONT_REGULAR = 'InvoiceSans'
const FONT_BOLD = 'InvoiceSans-Bold'
const FONT_REGULAR_PATH = path.join(process.cwd(), 'public/fonts/NotoSans-Regular.ttf')
const FONT_BOLD_PATH = path.join(process.cwd(), 'public/fonts/NotoSans-Bold.ttf')

type ShopInvoiceOptions = {
  invoiceNumber: string
  providerPaymentId?: string | null
}

function normalizeMoney(value: number | null | undefined) {
  const next = Number(value ?? 0)
  return Number.isFinite(next) ? next : 0
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
  const money = (value: number) => formatMoney(value, settings)
  const amountWords = numberToWords(invoiceTotal)

  const companyAddress = [
    settings.addressLine1,
    settings.addressLine2,
    [settings.city, settings.state, settings.postalCode].filter(Boolean).join(', '),
    settings.country,
  ].filter(Boolean).join(', ')

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
    readFile(FONT_REGULAR_PATH),
    readFile(FONT_BOLD_PATH),
  ])

  const doc = new PDFDocument({ size: 'A4', margin: 0 })
  doc.registerFont(FONT_REGULAR, regularFont)
  doc.registerFont(FONT_BOLD, boldFont)
  doc.font(FONT_REGULAR)
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

  function drawBase() {
    doc.save()
    doc.rect(0, 0, pageW, pageH).fill(brand.page)
    doc.restore()
  }

  async function drawHeader() {
    doc.save()
    doc.rect(0, 0, pageW, headerH).fill(brand.page)

    const logoY = 20
    let logoPlaced = false
    if (invoiceLogo) {
      try {
        const baseUrl = (settings.websiteUrl || 'https://flux3d.in').replace(/\/+$/, '')
        const logoUrl = invoiceLogo.startsWith('http') ? invoiceLogo : `${baseUrl}${invoiceLogo.startsWith('/') ? '' : '/'}${invoiceLogo}`
        const resp = await fetch(logoUrl)
        if (resp.ok) {
          const arrayBuf = await resp.arrayBuffer()
          doc.image(Buffer.from(arrayBuf), contentX, logoY, { height: 46, fit: [210, 46] })
          logoPlaced = true
        }
      } catch {
        logoPlaced = false
      }
    }

    if (!logoPlaced) {
      doc.fillColor(brand.ink).font(FONT_BOLD).fontSize(22)
      doc.text(companyName, contentX, logoY + 8)
    }

    doc.fillColor(brand.muted).font(FONT_REGULAR).fontSize(8.5)
    doc.text(tagline, contentX, logoY + 52)

    doc.fillColor(brand.ink).font(FONT_BOLD).fontSize(9)
    doc.text(companyName, contentX, 78)
    if (companyAddress) {
      doc.fillColor(brand.muted).font(FONT_REGULAR).fontSize(7.5)
      doc.text(companyAddress, contentX, 92, { width: 330, lineGap: 1.5 })
    }
    const contactLine = [settings.primaryPhone, contactEmail, websiteValue.replace(/^https?:\/\//, '')].filter(Boolean).join('  |  ')
    if (contactLine) {
      doc.fillColor(brand.muted).font(FONT_REGULAR).fontSize(7.5)
      doc.text(contactLine, contentX, 116, { width: 340, lineGap: 1.5 })
    }

    const invoiceRight = pageW - contentRight
    doc.fillColor(brand.primary).font(FONT_BOLD).fontSize(30)
    doc.text(invoiceLabel, invoiceRight - 250, 16, { width: 250, align: 'right' })
    doc.fillColor(brand.muted).font(FONT_REGULAR).fontSize(8.5)
    doc.text(`Order #${order.order_number}`, invoiceRight - 250, 58, { width: 250, align: 'right' })
    doc.fillColor(brand.ink).font(FONT_BOLD).fontSize(11)
    doc.text(invoiceNumber, invoiceRight - 250, 72, { width: 250, align: 'right' })
    doc.fillColor(brand.muted).font(FONT_REGULAR).fontSize(8.5)
    doc.text(`Invoice date: ${invoiceDate}`, invoiceRight - 250, 90, { width: 250, align: 'right' })

    const badgeW = 96
    const badgeH = 22
    const badgeX = invoiceRight - badgeW
    const badgeY = 112
    const badgeFill = isPaid ? brand.paid : brand.pending
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 11).fill(badgeFill)
    doc.fillColor('#FFFFFF').font(FONT_BOLD).fontSize(10)
    doc.text(isPaid ? 'PAID' : 'UNPAID', badgeX, badgeY + 6, { width: badgeW, align: 'center' })

    doc.moveTo(contentX, headerH - 6).lineTo(pageW - contentRight, headerH - 6).lineWidth(3).strokeColor(brand.primary).stroke()
    doc.restore()
  }

  function startPage() {
    if (doc.page) {
      drawBase()
      void drawHeader()
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

  function drawPartyCard(x: number, cardY: number, w: number, title: string, lines: string[]) {
    const h = Math.max(92, doc.heightOfString(lines.join('\n'), { width: w - 24, lineGap: 2 }) + 40)
    drawCard(x, cardY, w, h)
    doc.fillColor(brand.primary).font(FONT_BOLD).fontSize(7)
    doc.text(title.toUpperCase(), x + 18, cardY + 14)
    doc.fillColor(brand.ink).font(FONT_BOLD).fontSize(11)
    doc.text(lines[0] ?? '', x + 18, cardY + 27, { width: w - 36 })
    doc.fillColor(brand.muted).font(FONT_REGULAR).fontSize(8.5)
    const body = lines.slice(1).join('\n')
    if (body) {
      doc.text(body, x + 18, cardY + 45, { width: w - 36, lineGap: 2 })
    }
    return h
  }

  function drawMetaCard(x: number, cardY: number, w: number) {
    const h = 92
    drawCard(x, cardY, w, h)
    doc.fillColor(brand.primary).font(FONT_BOLD).fontSize(7)
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
      doc.fillColor(brand.lightMuted).font(FONT_REGULAR).fontSize(7)
      doc.text(row.label.toUpperCase(), x + 18, ry + 4, { width: w - 90 })
      doc.fillColor(brand.ink).font(FONT_BOLD).fontSize(9)
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
    doc.fillColor('#FFFFFF').font(FONT_BOLD).fontSize(7.5)
    cols.forEach((col) => {
      doc.text(col.key, contentX + col.x + 6, tableY + 9, { width: col.w - 12, align: col.align })
    })
    return tableY + 32
  }

  function drawTableRow(rowY: number, item: ShopOrderItem, index: number) {
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
    const unitPrice = normalizeMoney(item.unitPrice)
    const quantity = normalizeMoney(item.quantity)
    const lineTotal = unitPrice * quantity
    const values = [
      String(index + 1),
      item.productName,
      String(quantity),
      money(unitPrice),
      money(lineTotal),
    ]

    doc.fillColor(brand.muted).font(FONT_REGULAR).fontSize(8)
    doc.text(values[0], contentX + cols[0].x, rowY + 11, { width: cols[0].w, align: cols[0].align })

    doc.fillColor(brand.ink).font(FONT_BOLD).fontSize(9)
    doc.text(values[1], contentX + cols[1].x + 6, rowY + 6, { width: cols[1].w - 12, ellipsis: true })
    doc.fillColor(brand.muted).font(FONT_REGULAR).fontSize(7)
    const variantText = item.variantLabel
      ? `${item.variantLabel}${item.customizationText ? ` · ${item.customizationText}` : ''}`
      : item.customizationText || ''
    if (variantText) {
      doc.text(variantText, contentX + cols[1].x + 6, rowY + 18, { width: cols[1].w - 12, ellipsis: true })
    }

    doc.fillColor(brand.ink).font(FONT_REGULAR).fontSize(8.5)
    doc.text(values[2], contentX + cols[2].x, rowY + 11, { width: cols[2].w, align: cols[2].align })
    doc.text(values[3], contentX + cols[3].x, rowY + 11, { width: cols[3].w - 6, align: cols[3].align })
    doc.text(values[4], contentX + cols[4].x, rowY + 11, { width: cols[4].w - 6, align: cols[4].align })
    doc.font(FONT_BOLD)

    doc.moveTo(contentX, rowY + rowH).lineTo(contentX + contentW, rowY + rowH).strokeColor(brand.border).lineWidth(0.5).stroke()
    return rowY + rowH
  }

  function drawTotalsBlock(blockY: number) {
    const blockW = 236
    const blockX = contentX + contentW - blockW
    const rowH = 20
    const rows = [
      { label: 'Subtotal', value: money(subtotal) },
      ...(discountAmount > 0 ? [{ label: `Discount${order.coupon_code ? ` (${order.coupon_code})` : ''}`, value: `-${money(discountAmount)}` }] : []),
      { label: 'Final price', value: money(finalPrice) },
      ...(cgstAmount > 0 ? [{ label: `CGST (${cgstPercent}%)`, value: money(cgstAmount) }] : []),
      ...(sgstAmount > 0 ? [{ label: `SGST (${sgstPercent}%)`, value: money(sgstAmount) }] : []),
      { label: 'Delivery', value: deliveryCharge === 0 ? 'FREE' : money(deliveryCharge) },
    ]

    rows.forEach((row, index) => {
      const ry = blockY + index * rowH
      doc.fillColor(brand.muted).font(FONT_REGULAR).fontSize(8.5)
      doc.text(row.label, blockX + 8, ry + 5, { width: blockW - 100, align: 'right' })
      doc.fillColor(brand.ink).font(FONT_REGULAR).fontSize(8.5)
      doc.text(row.value, blockX + 92, ry + 5, { width: blockW - 100, align: 'right' })
      doc.moveTo(blockX + 8, ry + rowH - 1).lineTo(blockX + blockW - 8, ry + rowH - 1).strokeColor(brand.border).lineWidth(0.3).stroke()
    })

    const bandY = blockY + rows.length * rowH + 10
    doc.roundedRect(blockX, bandY, blockW, 36, 5).fill(brand.ink)
    doc.fillColor('#FFFFFF').font(FONT_BOLD).fontSize(10)
    doc.text('TOTAL', blockX + 14, bandY + 12)
    doc.fillColor(brand.primary).font(FONT_BOLD).fontSize(14)
    doc.text(money(invoiceTotal), blockX + 14, bandY + 9, { width: blockW - 28, align: 'right' })
    doc.fillColor(brand.lightMuted).font(FONT_REGULAR).fontSize(7.5)
    doc.text(`${amountWords}`, blockX, bandY + 46, { width: blockW, align: 'right' })
    return bandY + 62
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
    const leftHeight = Math.max(92, bullets.length * 15 + 26)
    drawCard(boxX, blockY, boxW, leftHeight)
    doc.fillColor(brand.ink).font(FONT_BOLD).fontSize(7.5)
    doc.text('NOTES & TERMS', boxX + 16, blockY + 13)
    doc.moveTo(boxX + 16, blockY + 26).lineTo(boxX + 150, blockY + 26).strokeColor(brand.primary).lineWidth(1.4).stroke()
    doc.fillColor(brand.muted).font(FONT_REGULAR).fontSize(7.5)
    bullets.slice(0, 6).forEach((line, index) => {
      doc.text(`•  ${line}`, boxX + 16, blockY + 36 + index * 14, { width: boxW - 32, lineGap: 1.5 })
    })
    return blockY + leftHeight + 14
  }

  function drawSignatureArea(blockY: number) {
    const lineY = blockY + 12
    doc.moveTo(contentX + contentW - 190, lineY).lineTo(contentX + contentW, lineY).strokeColor(brand.ink).lineWidth(0.7).stroke()
    doc.fillColor(brand.muted).font(FONT_REGULAR).fontSize(7.5)
    doc.text('Authorised Signatory', contentX + contentW - 190, lineY + 6, { width: 190, align: 'right' })
    doc.fillColor(brand.ink).font(FONT_BOLD).fontSize(8)
    doc.text(companyName, contentX + contentW - 190, lineY + 18, { width: 190, align: 'right' })
    return lineY + 30
  }

  function drawFooter() {
    const footerY = pageH - footerH
    doc.save()
    doc.rect(0, footerY, pageW, footerH).fill('#FFFFFF')
    doc.rect(0, footerY, pageW, 2).fill(brand.primary)
    doc.restore()
    doc.fillColor(brand.muted).font(FONT_REGULAR).fontSize(7)
    doc.text(
      `${settings.gstNumber ? `GSTIN: ${settings.gstNumber}` : ''} | ${settings.panNumber ? `PAN: ${settings.panNumber}` : ''} | ${settings.sacHsnCode ? `SAC: ${settings.sacHsnCode}` : ''} | ${settings.cinNumber ? `CIN: ${settings.cinNumber}` : ''} | ${settings.msmeNumber ? `MSME: ${settings.msmeNumber}` : ''} | ${websiteValue.replace(/^https?:\/\//, '')}`,
      0,
      footerY + 9,
      { width: pageW, align: 'center' }
    )
    doc.fillColor(brand.lightMuted).font(FONT_REGULAR).fontSize(6.5)
    doc.text('computer-generated invoice · Flux3D', 0, footerY + 21, { width: pageW, align: 'center' })
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
  y = cardY + Math.max(billH, 92) + 14

  inTable = true
  y = drawTableHeader(y)
  items.forEach((item, index) => {
    ensureSpace(32)
    y = drawTableRow(y, item, index)
  })
  inTable = false
  y += 10
  ensureSpace(175)
  y = drawTotalsBlock(y)

  ensureSpace(175)
  y = drawNotesAndTerms(y)

  ensureSpace(40)
  y = drawSignatureArea(y)

  drawFooter()

  doc.end()
  return pdf
}
