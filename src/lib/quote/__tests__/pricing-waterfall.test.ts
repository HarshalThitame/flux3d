import { describe, expect, it } from 'vitest'
import {
  calculateDeliveryChargeFromSettings,
  getHighestCartDiscountTier,
  calculatePromotionDiscount,
  calculatePostProcessingCharge,
  calculatePricingWaterfall,
  roundMoney,
} from '../pricing-waterfall'
import type { BusinessSettings, CartDiscountTier, PostProcessingMultipliers } from '@/lib/admin/business-settings'

describe('roundMoney (waterfall)', () => {
  it('rounds to 2 decimals', () => {
    expect(roundMoney(10.456)).toBe(10.46)
  })
  it('returns 0 for non-finite values', () => {
    expect(roundMoney(Infinity)).toBe(0)
    expect(roundMoney(NaN)).toBe(0)
  })
})

describe('calculateDeliveryChargeFromSettings', () => {
  const settings = { deliveryChargeThreshold: 499, defaultDeliveryCharge: 50 } as BusinessSettings

  it('returns 0 when price is above threshold', () => {
    expect(calculateDeliveryChargeFromSettings(500, settings)).toBe(0)
  })

  it('returns default charge when price is below threshold', () => {
    expect(calculateDeliveryChargeFromSettings(300, settings)).toBe(50)
  })

  it('returns 0 when price equals threshold', () => {
    expect(calculateDeliveryChargeFromSettings(499, settings)).toBe(0)
  })

  it('uses default fallbacks for missing settings', () => {
    const empty = {} as BusinessSettings
    expect(calculateDeliveryChargeFromSettings(300, empty)).toBe(50)
    expect(calculateDeliveryChargeFromSettings(500, empty)).toBe(0)
  })

  it('handles zero threshold', () => {
    const free = { deliveryChargeThreshold: 0, defaultDeliveryCharge: 50 } as BusinessSettings
    expect(calculateDeliveryChargeFromSettings(0, free)).toBe(0)
  })
})

describe('getHighestCartDiscountTier', () => {
  const tiers: CartDiscountTier[] = [
    { minCartValue: 500, discountPercent: 5 },
    { minCartValue: 1000, discountPercent: 10 },
    { minCartValue: 2000, discountPercent: 15 },
  ]

  it('returns highest applicable tier', () => {
    expect(getHighestCartDiscountTier(1500, tiers, true)?.discountPercent).toBe(10)
    expect(getHighestCartDiscountTier(2500, tiers, true)?.discountPercent).toBe(15)
    expect(getHighestCartDiscountTier(600, tiers, true)?.discountPercent).toBe(5)
  })

  it('returns null when cart value is below all tiers', () => {
    expect(getHighestCartDiscountTier(100, tiers, true)).toBeNull()
  })

  it('returns null when disabled', () => {
    expect(getHighestCartDiscountTier(2500, tiers, false)).toBeNull()
  })

  it('returns null when tiers array is empty', () => {
    expect(getHighestCartDiscountTier(2500, [], true)).toBeNull()
  })

  it('returns null when tiers is undefined or null', () => {
    expect(getHighestCartDiscountTier(2500, undefined as unknown as CartDiscountTier[], true)).toBeNull()
  })

  it('handles single tier', () => {
    expect(getHighestCartDiscountTier(1000, [{ minCartValue: 100, discountPercent: 5 }], true)?.discountPercent).toBe(5)
  })
})

describe('calculatePromotionDiscount', () => {
  it('applies percentage discount', () => {
    expect(calculatePromotionDiscount(1000, { discountType: 'percentage', discountValue: 10 })).toBe(100)
  })

  it('caps percentage discount at maxDiscount', () => {
    expect(calculatePromotionDiscount(1000, { discountType: 'percentage', discountValue: 10, maxDiscount: 50 })).toBe(50)
  })

  it('applies fixed amount discount', () => {
    expect(calculatePromotionDiscount(1000, { discountType: 'fixed_amount', discountValue: 200 })).toBe(200)
  })

  it('caps fixed amount at base amount', () => {
    expect(calculatePromotionDiscount(50, { discountType: 'fixed_amount', discountValue: 200 })).toBe(50)
  })

  it('returns 0 for null/undefined promotion', () => {
    expect(calculatePromotionDiscount(1000, null)).toBe(0)
    expect(calculatePromotionDiscount(1000, undefined)).toBe(0)
  })

  it('returns 0 for free_shipping type', () => {
    expect(calculatePromotionDiscount(1000, { discountType: 'free_shipping', discountValue: 0 })).toBe(0)
  })

  it('returns 0 when base amount is 0', () => {
    expect(calculatePromotionDiscount(0, { discountType: 'percentage', discountValue: 10 })).toBe(0)
  })

  it('handles non-finite values gracefully', () => {
    expect(calculatePromotionDiscount(NaN, { discountType: 'percentage', discountValue: 10 })).toBe(0)
    expect(calculatePromotionDiscount(1000, { discountType: 'percentage', discountValue: NaN })).toBe(0)
  })
})

describe('calculatePostProcessingCharge', () => {
  const multipliers: PostProcessingMultipliers = {
    none: 0,
    sanded: 0.25,
    'sanded-painted': 0.6,
  }

  const baseAmount = 100
  const difficultyFactor = 1.2

  it('returns 0 for "none" level', () => {
    expect(calculatePostProcessingCharge('none', baseAmount, difficultyFactor, multipliers)).toBe(0)
  })

  it('calculates sanded charge', () => {
    const result = calculatePostProcessingCharge('sanded', baseAmount, difficultyFactor, multipliers)
    expect(result).toBe(30)
  })

  it('calculates sanded-painted charge', () => {
    const result = calculatePostProcessingCharge('sanded-painted', baseAmount, difficultyFactor, multipliers)
    expect(result).toBe(72)
  })

  it('uses difficulty factor', () => {
    const low = calculatePostProcessingCharge('sanded', baseAmount, 1, multipliers)
    const high = calculatePostProcessingCharge('sanded', baseAmount, 2, multipliers)
    expect(high).toBe(low * 2)
  })

  it('returns 0 for unknown level', () => {
    expect(calculatePostProcessingCharge('none' as 'sanded', baseAmount, 1, {} as PostProcessingMultipliers)).toBe(0)
  })
})

describe('calculatePricingWaterfall', () => {
  const baseInput = {
    materialCost: 250,
    machineCost: 150,
    quantity: 1,
    overheadPercent: 15,
    marginPercent: 30,
  }

  it('calculates basic waterfall without discounts', () => {
    const result = calculatePricingWaterfall({ ...baseInput, deliveryThreshold: 999, defaultDeliveryCharge: 50 })
    expect(result.materialCost).toBe(250)
    expect(result.machineCost).toBe(150)
    expect(result.subtotal).toBe(400)
    expect(result.overheadAmount).toBe(60)
    expect(result.marginAmount).toBe(138)
    expect(result.totalPrice).toBe(598)
    expect(result.cartDiscountAmount).toBe(0)
    expect(result.finalPrice).toBe(598)
    expect(result.deliveryCharge).toBe(50)
    expect(result.grandTotal).toBe(648)
  })

  it('applies cart discount', () => {
    const result = calculatePricingWaterfall({ ...baseInput, cartDiscountPercent: 10 })
    expect(result.cartDiscountPercent).toBe(10)
    expect(result.cartDiscountAmount).toBe(59.8)
    expect(result.finalPrice).toBeLessThan(result.totalPrice)
  })

  it('applies coupon discount', () => {
    const result = calculatePricingWaterfall({
      ...baseInput,
      coupon: { discountType: 'percentage', discountValue: 20 },
    })
    expect(result.couponDiscountAmount).toBe(119.6)
    expect(result.finalPrice).toBe(478.4)
  })

  it('applies offer discount', () => {
    const result = calculatePricingWaterfall({
      ...baseInput,
      offer: { discountType: 'fixed_amount', discountValue: 100 },
    })
    expect(result.offerDiscountAmount).toBe(100)
    expect(result.finalPrice).toBe(498)
  })

  it('stacks cart + coupon + offer discounts', () => {
    const result = calculatePricingWaterfall({
      ...baseInput,
      cartDiscountPercent: 5,
      coupon: { discountType: 'percentage', discountValue: 10 },
      offer: { discountType: 'fixed_amount', discountValue: 50 },
    })
    expect(result.cartDiscountAmount).toBeGreaterThan(0)
    expect(result.couponDiscountAmount).toBeGreaterThan(0)
    expect(result.offerDiscountAmount).toBeGreaterThan(0)
    expect(result.discount).toBe(result.cartDiscountAmount + result.couponDiscountAmount + result.offerDiscountAmount)
  })

  it('never lets finalPrice go below 0', () => {
    const result = calculatePricingWaterfall({
      ...baseInput,
      coupon: { discountType: 'fixed_amount', discountValue: 10000 },
    })
    expect(result.finalPrice).toBe(0)
  })

  it('uses provided delivery charge when given', () => {
    const result = calculatePricingWaterfall({ ...baseInput, deliveryCharge: 100 })
    expect(result.deliveryCharge).toBe(100)
    expect(result.grandTotal).toBe(result.finalPrice + 100)
  })

  it('calculates free delivery when price is above threshold', () => {
    const result = calculatePricingWaterfall({ ...baseInput, deliveryThreshold: 0, defaultDeliveryCharge: 50 })
    expect(result.deliveryCharge).toBe(0)
  })

  it('applies post-processing charges to subtotal', () => {
    const result = calculatePricingWaterfall({ ...baseInput, postProcessingCharges: 200 })
    expect(result.subtotal).toBe(600)
  })

  it('computes pricePerUnit correctly', () => {
    const multiQty = calculatePricingWaterfall({ ...baseInput, deliveryThreshold: 999, defaultDeliveryCharge: 50, quantity: 3 })
    expect(multiQty.pricePerUnit).toBeCloseTo(multiQty.totalPrice / 3, 2)
  })

  it('handles zero overhead and margin', () => {
    const result = calculatePricingWaterfall({ materialCost: 100, machineCost: 0, quantity: 1, overheadPercent: 0, marginPercent: 0 })
    expect(result.subtotal).toBe(100)
    expect(result.overheadAmount).toBe(0)
    expect(result.marginAmount).toBe(0)
    expect(result.totalPrice).toBe(100)
  })
})
