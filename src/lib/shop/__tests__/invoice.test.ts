import { describe, expect, it } from 'vitest'
import { generateShopInvoicePdf } from '../invoice'
import type { ShopOrder, ShopOrderItem } from '@/lib/shop/orders'
import type { BusinessSettings } from '@/lib/admin/business-settings'

const items: ShopOrderItem[] = [
  {
    productId: 'p1', productName: 'Articulated Dragon', productThumbnail: '', skuId: 's1', skuCode: 'SKU-DRAGON',
    variantCombination: { color: 'Silver' }, variantLabel: 'Silver · PLA', quantity: 2, unitPrice: 1250, customizationText: 'Make it extra shiny',
  },
  {
    productId: 'p2', productName: 'Phone Stand', productThumbnail: '', skuId: 's2', skuCode: 'SKU-STAND',
    variantCombination: { color: 'Black' }, variantLabel: 'Black · PETG', quantity: 1, unitPrice: 400, customizationText: null,
  },
]

const order: ShopOrder = {
  id: 'order-123', order_number: 'SHOP-2026-00001', user_id: 'user-1', items,
  subtotal: 2900, discount_amount: 290, coupon_code: 'SAVE10', shipping_charge: 0,
  total_amount: 3078, subtotal_paise: 290000, discount_amount_paise: 29000, shipping_charge_paise: 0, total_amount_paise: 307800,
  shipping_address: { name: 'Rutik Thitame', phone: '+919999999999', line1: '42 Maker Lane', line2: null, city: 'Pune', state: 'Maharashtra', pincode: '411001' },
  payment_provider: 'razorpay', payment_purpose: 'shop_order', payment_method: 'upi',
  payment_status: 'captured', payment_id: 'pay_123', provider_order_id: 'order_xyz', provider_payment_id: 'pay_AbCdEfGhIjKl',
  payment_amount_paise: 307800, payment_currency: 'INR', payment_snapshot: {},
  payment_verified_at: '2026-08-17T10:00:00.000Z', payment_failed_at: null,
  payment_refund_status: null, payment_refund_amount_paise: 0,
  order_status: 'placed', fulfilment_status: 'pending', tracking_number: null, courier_name: null, tracking_url: null,
  estimated_delivery: null, order_source: 'shop', cancellation_reason: null,
  placed_at: '2026-08-17T09:30:00.000Z', updated_at: '2026-08-17T09:30:00.000Z',
}

const settings = {
  businessName: 'Flux3D',
  brandName: 'Flux3D',
  tagline: 'Premium 3D printed products',
  websiteUrl: 'https://flux3d.in',
  canonicalUrl: 'https://flux3d.in',
  primaryEmail: 'hello@flux3d.com',
  primaryPhone: '+91-9876543210',
  city: 'Pune',
  gstNumber: '27AABCF1234F1Z5',
  panNumber: 'AABCF1234F',
  msmeNumber: 'UDYAM-MH-00-0000001',
  cinNumber: 'U72900MH2020PTC000000',
  sacHsnCode: '998314',
  gstEnabled: true,
  cgstPercent: 9,
  sgstPercent: 9,
  paymentTerms: 'Payment via Razorpay on checkout.',
  currencySymbol: '₹',
  invoiceLogoUrl: '',
  logoUrl: '',
} as BusinessSettings

describe('generateShopInvoicePdf', () => {
  it('produces a valid PDF buffer for a paid order', async () => {
    const pdf = await generateShopInvoicePdf(order, items, settings, { invoiceNumber: 'SHP-2026-01001', providerPaymentId: 'pay_AbCdEfGhIjKl' })
    expect(Buffer.isBuffer(pdf)).toBe(true)
    expect(pdf.length).toBeGreaterThan(1000)
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(pdf.toString().includes('FlateDecode')).toBe(true)
  })

  it('renders proforma layout for unpaid orders', async () => {
    const unpaidOrder = { ...order, payment_status: 'created' as const, provider_payment_id: null }
    const pdf = await generateShopInvoicePdf(unpaidOrder, items, settings, { invoiceNumber: 'SHP-2026-01001' })
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(pdf.length).toBeGreaterThan(1000)
  })

  it('paginates across multiple pages when there are many items', async () => {
    const manyItems: ShopOrderItem[] = Array.from({ length: 25 }, (_, i) => ({
      ...items[0],
      productId: `p-${i}`,
      skuId: `s-${i}`,
      skuCode: `SKU-${i}`,
      productName: `Model ${i + 1}`,
    }))
    const pdf = await generateShopInvoicePdf(order, manyItems, settings, {
      invoiceNumber: 'SHP-2026-01001',
      providerPaymentId: 'pay_AbCdEfGhIjKl',
    })
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    const text = pdf.toString()
    const pageCount = (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length
    expect(pageCount).toBeGreaterThan(1)
  })

  it('renders the logo image when a webp logo is configured', async () => {
    const withLogo = { ...settings, invoiceLogoUrl: '/logo.webp' } as BusinessSettings
    const pdf = await generateShopInvoicePdf(order, items, withLogo, {
      invoiceNumber: 'SHP-2026-01001',
      providerPaymentId: 'pay_AbCdEfGhIjKl',
    })
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(pdf.length).toBeGreaterThan(1000)
  })
})