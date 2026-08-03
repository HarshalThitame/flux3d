import PDFDocument from 'pdfkit/js/pdfkit.standalone'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { BusinessSettings } from '@/lib/admin/business-settings'
import { getSettings } from '@/lib/settings'

const FONT_REGULAR = 'InvoiceSans'
const FONT_BOLD = 'InvoiceSans-Bold'
const FONT_REGULAR_PATH = path.join(process.cwd(), 'public/fonts/NotoSans-Regular.ttf')
const FONT_BOLD_PATH = path.join(process.cwd(), 'public/fonts/NotoSans-Bold.ttf')

export type ReceiptLineItem = {
  name: string
  variant?: string | null
  quantity: number
  unitPrice: number
  thumbnail?: string | null
}

export type ReceiptAddress = {
  name: string
  line1: string
  line2?: string | null
  city: string
  state: string
  pincode: string
  landmark?: string | null
  phone?: string | null
}

export type ReceiptOrder = {
  orderNumber: string
  placedAt: string
  items: ReceiptLineItem[]
  subtotalAmountPaise: number
  discountAmountPaise: number
  shippingChargePaise: number
  totalAmountPaise: number
  currency: string
  symbol: string
  paymentMethod: string
  paymentVerifiedAt: string | null
  providerOrderId: string | null
  providerPaymentId: string | null
  address: ReceiptAddress
}

function numberToWords(value: number): string {
  const ones = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'eighteen', 'nineteen']
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

  const underThousand = (n: number): string => {
    const parts: string[] = []
    const hundreds = Math.floor(n / 100)
    const rest = n % 100
    if (hundreds > 0) parts.push(`${ones[hundreds]} hundred`)
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

function paiseToRupees(p: number): string {
  const v = Math.round(p) / 100
  return v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export async function generateReceiptPdf(order: ReceiptOrder, settings: BusinessSettings): Promise<Buffer> {
  const [regularFont, boldFont] = await Promise.all([readFile(FONT_REGULAR_PATH), readFile(FONT_BOLD_PATH)])

  const doc = new PDFDocument({ size: 'A4', margin: 60 })
  doc.registerFont(FONT_REGULAR, regularFont)
  doc.registerFont(FONT_BOLD, boldFont)

  const buffers: Buffer[] = []
  doc.on('data', (chunk: Buffer) => buffers.push(chunk))
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)))
    doc.on('error', reject)
  })

  const pageW = doc.page.width
  const { symbol, currency } = order

  // Header
  doc.font(FONT_BOLD).fontSize(22).fillColor('#111827')
  const companyName = settings.businessName || settings.brandName || 'Flux3D'
  doc.text(companyName.toUpperCase(), { align: 'center' })
  doc.font(FONT_REGULAR).fontSize(10).fillColor('#6b7280')
  if (settings.tagline) doc.text(settings.tagline, { align: 'center' })
  doc.moveDown(1.2)

  doc.font(FONT_BOLD).fontSize(13).fillColor('#111827')
  const invoiceDate = new Date(order.placedAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  doc.text('TAX INVOICE', { align: 'center' })
  doc.font(FONT_REGULAR).fontSize(9.5).fillColor('#4b5563')
  doc.text(`Invoice date: ${invoiceDate}`, { align: 'center' })
  doc.text(`Order #: ${order.orderNumber}`, { align: 'center' })
  doc.moveDown(1.4)

  // Bill to
  doc.font(FONT_BOLD).fontSize(10).fillColor('#111827')
  doc.text('Bill to:', { continued: true })
  doc.font(FONT_REGULAR).fillColor('#4b5563')
  doc.text(`  ${order.address.name}`)
  doc.text(order.address.name)
  doc.font(FONT_REGULAR).fillColor('#4b5563')
  doc.fontSize(9.5)
  doc.text(order.address.line1)
  if (order.address.line2) doc.text(order.address.line2)
  if (order.address.landmark) doc.text(`Landmark: ${order.address.landmark}`)
  doc.text(`${order.address.city}, ${order.address.state} ${order.address.pincode}`)
  if (order.address.phone) doc.text(`Phone: ${order.address.phone}`)
  doc.moveDown(1.4)

  // Line items
  doc.font(FONT_BOLD).fontSize(9).fillColor('#111827')
  const tableTop = doc.y
  let y = tableTop
  const rowH = 16
  const colDesc = 220
  const colVariant = 160
  const colQty = 50
  const colPrice = 70
  const colTotal = 70
  const startX = 60

  // header row
  doc.font(FONT_BOLD)
  doc.text('Particulars', startX, y)
  doc.text('Variant', startX + colDesc, y)
  doc.text('Qty', startX + colDesc + colVariant, y)
  doc.text('Unit price', startX + colDesc + colVariant + colQty, y)
  doc.text('Total', pageW - colTotal - 30, y, { align: 'right' })
  y += rowH

  doc.font(FONT_REGULAR).fontSize(9)
  for (const item of order.items) {
    const unitPrice = Number(item.unitPrice ?? 0)
    const qty = Number(item.quantity ?? 1)
    const total = unitPrice * qty
    doc.text(item.name, startX, y)
    doc.text(item.variant ?? '', startX + colDesc, y)
    doc.text(String(qty), startX + colDesc + colVariant, y)
    doc.text(`${symbol}${paiseToRupees(unitPrice * 100)}`, startX + colDesc + colVariant + colQty, y)
    doc.text(`${symbol}${paiseToRupees(total * 100)}`, pageW - colTotal - 30, y, { align: 'right' })
    y += rowH
    // don't let a row split awkwardly at page bottom
    if (y > doc.page.height - 140) {
      doc.addPage()
      y = 60
    }
  }

  // tall line under items
  y += 6
  doc.moveTo(startX, y).lineTo(pageW - 30, y).strokeColor('#d1d5db').lineWidth(0.5).stroke()
  y += 12

  // Totals
  const right = pageW - 30
  const labelX = startX + colDesc + colVariant + colQty
  doc.font(FONT_REGULAR).fontSize(9)
  const label = (t: string, v: string) => {
    doc.text(t, labelX, y)
    doc.text(v, right, y, { align: 'right' })
    y += rowH
  }
  label('Subtotal', `${symbol}${paiseToRupees(order.subtotalAmountPaise)}`)
  if (order.discountAmountPaise > 0) {
    label('Discount', `-${symbol}${paiseToRupees(order.discountAmountPaise)}`)
  }
  label('Shipping & handling', `${symbol}${paiseToRupees(order.shippingChargePaise)}`)
  if (settings.gstEnabled) {
    const cgst = (order.totalAmountPaise * Number(settings.cgstPercent ?? 0)) / 10000
    const sgst = (order.totalAmountPaise * Number(settings.sgstPercent ?? 0)) / 10000
    label(`CGST (${settings.cgstPercent ?? 0}%)`, `${symbol}${paiseToRupees(cgst * 100)}`)
    label(`SGST (${settings.sgstPercent ?? 0}%)`, `${symbol}${paiseToRupees(sgst * 100)}`)
  }
  doc.font(FONT_BOLD)
  label('TOTAL', `${symbol}${paiseToRupees(order.totalAmountPaise)}`)
  y += 6

  doc.font(FONT_REGULAR).fontSize(9).fillColor('#111827')
  doc.text(`Amount in words: ${numberToWords(order.totalAmountPaise).replace(/ rupees only$/, '')} ${currency} ${paiseToRupees(order.totalAmountPaise)}`, startX, y + 6)
  y += rowH * 2

  // Payment info
  doc.font(FONT_BOLD).fontSize(9.5).fillColor('#111827')
  doc.text('Payment details', startX, y)
  doc.font(FONT_REGULAR).fontSize(9).fillColor('#4b5563')
  y += rowH
  const pm = (order.paymentMethod || 'N/A').replace(/_/g, ' ')
  doc.text(`Mode: ${pm}`, startX, y)
  y += rowH
  doc.text(`Status: ${order.paymentVerifiedAt ? 'Paid' : 'Pending'}`, startX, y)
  y += rowH
  if (order.paymentVerifiedAt) {
    doc.text(`Paid on: ${new Date(order.paymentVerifiedAt).toLocaleString('en-IN')}`, startX, y)
    y += rowH
  }
  if (order.providerPaymentId) {
    doc.text(`Txn / payment id: ${order.providerPaymentId}`, startX, y)
    y += rowH
  }
  if (order.providerOrderId) {
    doc.text(`Razorpay order id: ${order.providerOrderId}`, startX, y)
    y += rowH
  }
  y += 6

  // Terms / footer
  y = doc.page.height - 120
  doc.font(FONT_REGULAR).fontSize(8).fillColor('#6b7280')
  const terms = settings.paymentTerms || 'All taxes included as applicable. E&O accepted with order.'
  doc.text(`Terms: ${terms}`, startX, y)
  y += 12
  const foot = settings.primaryEmail || 'accounts@flux3d.in'
  const phoneFoot = settings.whatsappNumber || ''
  doc.text(`Questions? Reach us at ${foot}${phoneFoot ? ` / ${phoneFoot}` : ''}`, startX, y)
  y += 12
  doc.text(`© ${new Date().getFullYear()} ${companyName}. This is a computer-generated tax invoice.`, startX, y)

  // logo (top-right, small)
  if (settings.invoiceLogoUrl || settings.logoUrl) {
    try {
      const logoRes = await fetch(settings.invoiceLogoUrl || settings.logoUrl).then(r => r.arrayBuffer())
      doc.switchToPage(0)
      doc.image(Buffer.from(logoRes), pageW - 100, 50, { width: 80 })
    } catch {
      // logo fetch best-effort; ignore on failure
    }
  }

  doc.end()
  return done
}

export async function generateReceiptPdfFromOrder(order: ReceiptOrder): Promise<Buffer> {
  const settings = await getSettings()
  return generateReceiptPdf(order, settings)
}
