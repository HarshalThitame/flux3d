import { describe, expect, it } from 'vitest'
import {
  calculateCouponDiscount,
  calculateShopSubtotal,
  calculateShopTax,
  calculateShopTotal,
  roundMoney,
  buildShopPricingSnapshot,
  type ShopCouponResult,
} from '../pricing'
import type { ShopOrderItem } from '@/lib/shop/orders'
import type { BusinessSettings } from '@/lib/admin/business-settings'

const defaultSettings = {
  gstEnabled: true,
  cgstPercent: 9,
  sgstPercent: 9,
} as BusinessSettings

const noGstSettings = {
  gstEnabled: false,
  cgstPercent: 0,
  sgstPercent: 0,
} as BusinessSettings

const sampleItems: ShopOrderItem[] = [
  { productId: 'p1', productName: 'Item A', productThumbnail: '', skuId: 's1', skuCode: 'SKU-A', variantCombination: {}, variantLabel: 'Red', quantity: 2, unitPrice: 500, customizationText: null },
  { productId: 'p2', productName: 'Item B', productThumbnail: '', skuId: 's2', skuCode: 'SKU-B', variantCombination: {}, variantLabel: 'Blue', quantity: 1, unitPrice: 1200, customizationText: null },
]

describe('roundMoney', () => {
  it('rounds to two decimal places', () => {
    expect(roundMoney(10.456)).toBe(10.46)
    expect(roundMoney(10.454)).toBe(10.45)
  })

  it('handles whole numbers', () => {
    expect(roundMoney(10)).toBe(10)
    expect(roundMoney(0)).toBe(0)
  })

  it('handles floating point edge cases', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3)
  })
})

describe('calculateCouponDiscount', () => {
  it('computes percentage discount', () => {
    const result = calculateCouponDiscount(1000, { discount_type: 'percentage', discount_value: 10 })
    expect(result).toBe(100)
  })

  it('caps percentage discount at max_discount', () => {
    const result = calculateCouponDiscount(1000, { discount_type: 'percentage', discount_value: 10, max_discount: 50 })
    expect(result).toBe(50)
  })

  it('computes fixed amount discount', () => {
    const result = calculateCouponDiscount(1000, { discount_type: 'fixed_amount', discount_value: 200 })
    expect(result).toBe(200)
  })

  it('caps fixed amount at subtotal', () => {
    const result = calculateCouponDiscount(100, { discount_type: 'fixed_amount', discount_value: 200 })
    expect(result).toBe(100)
  })

  it('returns 0 for free_shipping coupons', () => {
    const result = calculateCouponDiscount(1000, { discount_type: 'free_shipping', discount_value: 0 })
    expect(result).toBe(0)
  })

  it('returns 0 for buy_x_get_y coupons', () => {
    const result = calculateCouponDiscount(1000, { discount_type: 'buy_x_get_y', discount_value: 0 })
    expect(result).toBe(0)
  })

  it('returns 0 for zero discount value', () => {
    const result = calculateCouponDiscount(1000, { discount_type: 'percentage', discount_value: 0 })
    expect(result).toBe(0)
  })

  it('returns 0 for zero subtotal', () => {
    const result = calculateCouponDiscount(0, { discount_type: 'percentage', discount_value: 10 })
    expect(result).toBe(0)
  })

  it('handles flat discount type (legacy)', () => {
    const result = calculateCouponDiscount(1000, { discount_type: 'flat', discount_value: 50 })
    expect(result).toBe(50)
  })

  it('handles percent discount type (legacy)', () => {
    const result = calculateCouponDiscount(1000, { discount_type: 'percent', discount_value: 15 })
    expect(result).toBe(150)
  })

  it('ignores max_discount when it is 0 or null', () => {
    const result = calculateCouponDiscount(1000, { discount_type: 'percentage', discount_value: 10, max_discount: null })
    expect(result).toBe(100)
    const resultZeroMax = calculateCouponDiscount(1000, { discount_type: 'percentage', discount_value: 10, max_discount: 0 })
    expect(resultZeroMax).toBe(100)
  })
})

describe('calculateShopSubtotal', () => {
  it('sums unitPrice * quantity for all items', () => {
    expect(calculateShopSubtotal(sampleItems)).toBe(2200)
  })

  it('returns 0 for empty items', () => {
    expect(calculateShopSubtotal([])).toBe(0)
  })

  it('handles single item', () => {
    const items: ShopOrderItem[] = [{ productId: 'p1', productName: 'Test', productThumbnail: '', skuId: 's1', skuCode: 'SKU', variantCombination: {}, variantLabel: '', quantity: 3, unitPrice: 99.99, customizationText: null }]
    expect(calculateShopSubtotal(items)).toBe(299.97)
  })
})

describe('calculateShopTax', () => {
  it('calculates combined CGST+SGST percentage', () => {
    const result = calculateShopTax(1000, defaultSettings)
    expect(result).toBe(180)
  })

  it('returns 0 when GST is disabled', () => {
    const result = calculateShopTax(1000, noGstSettings)
    expect(result).toBe(0)
  })

  it('handles fractional tax amounts', () => {
    const fractional: BusinessSettings = { gstEnabled: true, cgstPercent: 5.5, sgstPercent: 5.5 } as BusinessSettings
    const result = calculateShopTax(999, fractional)
    expect(result).toBe(109.89)
  })

  it('handles zero taxable amount', () => {
    const result = calculateShopTax(0, defaultSettings)
    expect(result).toBe(0)
  })
})

describe('calculateShopTotal', () => {
  it('computes total as subtotal - discount + shipping + tax', () => {
    expect(calculateShopTotal(1000, 100, 50, 180)).toBe(1130)
  })

  it('never goes below 0', () => {
    expect(calculateShopTotal(50, 100, 0, 0)).toBe(0)
  })

  it('handles free shipping scenario', () => {
    expect(calculateShopTotal(1000, 100, 0, 162)).toBe(1062)
  })

  it('handles zero values', () => {
    expect(calculateShopTotal(0, 0, 0, 0)).toBe(0)
  })
})

describe('buildShopPricingSnapshot', () => {
  const coupon: ShopCouponResult = {
    code: 'SAVE10',
    discountType: 'percentage',
    discountValue: 10,
    maxDiscount: null,
    calculatedDiscount: 220,
    freeShipping: false,
  }

  it('builds full snapshot with coupon', () => {
    const snapshot = buildShopPricingSnapshot(sampleItems, coupon, 2200, 50, 180, 2210)
    expect(snapshot.subtotal).toBe(2200)
    expect(snapshot.discount).toBe(220)
    expect(snapshot.shipping).toBe(50)
    expect(snapshot.tax).toBe(180)
    expect(snapshot.total).toBe(2210)
    expect(snapshot.coupon_code).toBe('SAVE10')
    expect(snapshot.items).toHaveLength(2)
    expect(snapshot.items[0].line_total).toBe(1000)
    expect(snapshot.items[1].line_total).toBe(1200)
  })

  it('builds snapshot without coupon', () => {
    const snapshot = buildShopPricingSnapshot(sampleItems, null, 2200, 50, 180, 2430)
    expect(snapshot.discount).toBe(0)
    expect(snapshot.coupon_code).toBeNull()
    expect(snapshot.applied_offer_id).toBeNull()
  })

  it('computes tax_percent from subtotal', () => {
    const snapshot = buildShopPricingSnapshot(sampleItems, null, 1000, 0, 180, 1180)
    expect(snapshot.tax_percent).toBe(18)
  })

  it('handles zero subtotal for tax_percent', () => {
    const snapshot = buildShopPricingSnapshot([], null, 0, 0, 0, 0)
    expect(snapshot.tax_percent).toBe(0)
  })

  it('includes calculated_at as a valid ISO timestamp', () => {
    const snapshot = buildShopPricingSnapshot(sampleItems, null, 2200, 0, 0, 2200)
    expect(() => new Date(snapshot.calculated_at)).not.toThrow()
    expect(new Date(snapshot.calculated_at).getTime()).not.toBeNaN()
  })
})
