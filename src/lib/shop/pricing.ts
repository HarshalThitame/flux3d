import type { BusinessSettings } from '@/lib/admin/business-settings'
import type { ShopOrderItem } from '@/lib/shop/orders'

export type ShopPricingSnapshot = {
  items: Array<{
    sku_id: string
    product_id: string
    product_name: string
    sku_code: string
    variant_label: string
    quantity: number
    unit_price: number
    line_total: number
  }>
  subtotal: number
  discount: number
  shipping: number
  tax: number
  tax_percent: number
  total: number
  coupon_code: string | null
  applied_offer_id: string | null
  calculated_at: string
}

export type ShopCouponResult = {
  code: string | null
  discountType: 'percentage' | 'fixed_amount' | 'free_shipping' | 'buy_x_get_y' | null
  discountValue: number
  maxDiscount: number | null
  calculatedDiscount: number
  freeShipping: boolean
  couponId?: string | null
  offerId?: string | null
}

export function calculateCouponDiscount(
  subtotal: number,
  coupon: {
    discount_type: string | 'percentage' | 'fixed_amount' | 'free_shipping' | 'buy_x_get_y'
    discount_value: number
    max_discount?: number | null
  }
): number {
  const discountValue = Number(coupon.discount_value ?? 0)
  const maxDiscount = coupon.max_discount ?? null

  if (discountValue <= 0 || subtotal <= 0) return 0

  if (coupon.discount_type === 'percentage' || coupon.discount_type === 'percent') {
    const calculated = (subtotal * discountValue) / 100
    return roundMoney(maxDiscount && maxDiscount > 0 ? Math.min(calculated, maxDiscount) : calculated)
  }

  if (coupon.discount_type === 'fixed_amount' || coupon.discount_type === 'flat') {
    return roundMoney(Math.min(discountValue, subtotal))
  }

  return 0
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculateShopSubtotal(items: ShopOrderItem[]): number {
  return roundMoney(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))
}

export function calculateShopTax(amount: number, settings: BusinessSettings): number {
  if (!settings.gstEnabled) return 0
  const cgst = Number(settings.cgstPercent ?? 0)
  const sgst = Number(settings.sgstPercent ?? 0)
  return roundMoney((amount * (cgst + sgst)) / 100)
}

export function calculateShopTotal(
  subtotal: number,
  discount: number,
  shipping: number,
  tax: number
): number {
  return roundMoney(Math.max(0, subtotal - discount) + shipping + tax)
}

export function buildShopPricingSnapshot(
  items: ShopOrderItem[],
  coupon: ShopCouponResult | null,
  subtotal: number,
  shipping: number,
  tax: number,
  total: number
): ShopPricingSnapshot {
  return {
    items: items.map((item) => ({
      sku_id: item.skuId,
      product_id: item.productId,
      product_name: item.productName,
      sku_code: item.skuCode,
      variant_label: item.variantLabel,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_total: roundMoney(item.unitPrice * item.quantity),
    })),
    subtotal,
    discount: coupon?.calculatedDiscount ?? 0,
    shipping,
    tax,
    tax_percent: Number((tax / Math.max(1, subtotal)) * 100),
    total,
    coupon_code: coupon?.code ?? null,
    applied_offer_id: coupon?.offerId ?? null,
    calculated_at: new Date().toISOString(),
  }
}
