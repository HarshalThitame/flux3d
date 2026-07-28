import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { rateLimitResponse } from '@/lib/rate-limit'
import {
  buildShopPricingSnapshot,
  calculateCouponDiscount,
  calculateShopSubtotal,
  calculateShopTax,
  calculateShopTotal,
  roundMoney,
  type ShopCouponResult,
} from '@/lib/shop/pricing'
import { calculateShippingFromRules } from '@/lib/shop/shipping'
import type { ShopOrderItem, ShopShippingAddress } from '@/lib/shop/orders'


export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_ORDER_NUMBER_RETRIES = 5

type CreateShopOrderBody = {
  items?: unknown
  couponCode?: unknown
  appliedCouponId?: unknown
  appliedOfferId?: unknown
  shippingAddress?: unknown
}

type SkuSnapshot = {
  id: string
  product_id: string
  price: number | string
  stock_quantity: number | string
  is_available: boolean | null
  weight_grams: number | string | null
  variant_combination?: Record<string, string | boolean> | null
  variant_label?: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeOrderItems(value: unknown): { productId: string; skuId: string; quantity: number; customizationText: string | null }[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Your cart is empty.')
  }

  return value.map((entry) => {
    if (!isRecord(entry)) throw new Error('Invalid cart item.')

    const productId = normalizeText(entry.productId)
    const skuId = normalizeText(entry.skuId)
    const quantity = Number(entry.quantity)

    if (!productId || !skuId) throw new Error('Invalid cart item.')
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Invalid item quantity.')

    return {
      productId,
      skuId,
      quantity,
      customizationText: typeof entry.customizationText === 'string'
        ? entry.customizationText.trim() || null
        : null,
    }
  })
}

function normalizeShippingAddress(value: unknown): ShopShippingAddress {
  if (!isRecord(value)) throw new Error('Delivery address is required.')

  const address: ShopShippingAddress = {
    name: normalizeText(value.name),
    phone: normalizeText(value.phone).replace(/\D/g, ''),
    line1: normalizeText(value.line1),
    line2: normalizeText(value.line2) || null,
    city: normalizeText(value.city),
    state: normalizeText(value.state),
    pincode: normalizeText(value.pincode).replace(/\D/g, ''),
  }

  if (!address.name || !address.line1 || !address.city || !address.state) {
    throw new Error('Complete delivery address is required.')
  }

  if (!/^\d{10}$/.test(address.phone)) {
    throw new Error('Enter a valid 10 digit phone number.')
  }

  if (!/^\d{6}$/.test(address.pincode)) {
    throw new Error('Enter a valid 6 digit pincode.')
  }

  return address
}

function isLimitReached(limit: unknown, used: unknown) {
  const usageLimit = Number(limit)
  if (!Number.isFinite(usageLimit) || usageLimit <= 0) return false
  return Number(used ?? 0) >= usageLimit
}

async function validateCouponCode(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  couponCode: string,
  subtotal: number,
  userId: string
): Promise<ShopCouponResult | null> {
  const code = couponCode.trim().toUpperCase()
  if (!code) return null

  const today = new Date().toISOString().slice(0, 10)
  const { data: shopCoupon, error: shopCouponError } = await supabase
    .from('shelf_coupons')
    .select('*')
    .eq('code', code)
    .maybeSingle()

  if (shopCouponError) throw new Error(shopCouponError.message)

  if (shopCoupon) {
    if (!shopCoupon.is_active) throw new Error('This coupon is no longer active.')
    if (shopCoupon.valid_from && today < shopCoupon.valid_from) throw new Error('This coupon is not yet valid.')
    if (shopCoupon.valid_until && today > shopCoupon.valid_until) throw new Error('This coupon has expired.')
    if (isLimitReached(shopCoupon.max_uses, shopCoupon.used_count)) {
      throw new Error('This coupon has reached its usage limit.')
    }
    if (subtotal < Number(shopCoupon.min_order_value ?? 0)) {
      throw new Error(`Minimum order value of ₹${Number(shopCoupon.min_order_value ?? 0).toFixed(0)} required.`)
    }

    const discountType = String(shopCoupon.discount_type).toLowerCase() as 'percentage' | 'fixed_amount' | 'free_shipping'
    const discountValue = Number(shopCoupon.discount_value ?? 0)
    const freeShipping = discountType === 'free_shipping'
    const calculatedDiscount = freeShipping ? 0 : calculateCouponDiscount(subtotal, {
      discount_type: discountType,
      discount_value: discountValue,
      max_discount: shopCoupon.max_discount ?? null,
    })

    return {
      code,
      discountType: freeShipping ? 'free_shipping' : discountType,
      discountValue,
      maxDiscount: shopCoupon.max_discount ?? null,
      calculatedDiscount,
      freeShipping,
      couponId: shopCoupon.id,
    }
  }

  const { data: coupon, error: couponError } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code)
    .maybeSingle()

  if (couponError) throw new Error(couponError.message)
  if (!coupon) throw new Error('Invalid coupon code.')

  const now = new Date().toISOString()
  if (!coupon.is_active) throw new Error('This coupon is no longer active.')
  if (coupon.starts_at && now < coupon.starts_at) throw new Error('This coupon is not yet valid.')
  if (coupon.expires_at && now > coupon.expires_at) throw new Error('This coupon has expired.')
  if (isLimitReached(coupon.usage_limit, coupon.used_count)) {
    throw new Error('This coupon has reached its usage limit.')
  }
  if (subtotal < Number(coupon.min_order_value ?? 0)) {
    throw new Error(`Minimum order value of ₹${Number(coupon.min_order_value ?? 0).toFixed(0)} required.`)
  }

  if (coupon.usage_per_user) {
    const { count } = await supabase
      .from('redemptions')
      .select('*', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id)
      .eq('user_id', userId)

    if (count && count >= Number(coupon.usage_per_user)) {
      throw new Error('You have already used this coupon the maximum number of times.')
    }
  }

  if (coupon.first_order_only) {
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (count && count > 0) throw new Error('This coupon is for first-time orders only.')
  }

  const discountType = String(coupon.discount_type).toLowerCase() as 'percentage' | 'fixed_amount' | 'free_shipping'
  const discountValue = Number(coupon.discount_value ?? 0)
  const freeShipping = discountType === 'free_shipping'
  const calculatedDiscount = freeShipping ? 0 : calculateCouponDiscount(subtotal, {
    discount_type: discountType,
    discount_value: discountValue,
    max_discount: coupon.max_discount ?? null,
  })

  return {
    code,
    discountType: freeShipping ? 'free_shipping' : discountType,
    discountValue,
    maxDiscount: coupon.max_discount ?? null,
    calculatedDiscount,
    freeShipping,
    couponId: coupon.id,
  }
}

async function validateOfferId(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  offerId: string,
  orderAmount: number,
  userId: string
): Promise<ShopCouponResult | null> {
  const id = offerId.trim()
  if (!id) return null

  const now = new Date().toISOString()
  const { data: offer, error } = await supabase
    .from('offers')
    .select('id, offer_type, discount_value, max_discount, min_order_value, starts_at, ends_at, is_active, usage_limit, usage_per_user, used_count')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!offer) throw new Error('Invalid offer code.')

  if (!offer.is_active) throw new Error('This offer is no longer active.')
  if (offer.starts_at && now < offer.starts_at) throw new Error('This offer is not yet valid.')
  if (offer.ends_at && now > offer.ends_at) throw new Error('This offer has expired.')
  if (isLimitReached(offer.usage_limit, offer.used_count)) {
    throw new Error('This offer has reached its usage limit.')
  }
  if (orderAmount < Number(offer.min_order_value ?? 0)) {
    throw new Error(`Minimum order value of ₹${Number(offer.min_order_value ?? 0).toFixed(0)} required.`)
  }

  if (offer.usage_per_user) {
    const { count } = await supabase
      .from('redemptions')
      .select('*', { count: 'exact', head: true })
      .eq('offer_id', offer.id)
      .eq('user_id', userId)

    if (count && count >= Number(offer.usage_per_user)) {
      throw new Error('You have already used this offer the maximum number of times.')
    }
  }

  const discountType = String(offer.offer_type).toLowerCase() as 'percentage' | 'fixed_amount' | 'free_shipping' | 'buy_x_get_y'
  const discountValue = Number(offer.discount_value ?? 0)
  const freeShipping = discountType === 'free_shipping'
  const calculatedDiscount = freeShipping || discountType === 'buy_x_get_y'
    ? 0
    : calculateCouponDiscount(orderAmount, {
        discount_type: discountType,
        discount_value: discountValue,
        max_discount: offer.max_discount ?? null,
      })

  return {
    code: id,
    discountType: freeShipping ? 'free_shipping' : discountType,
    discountValue,
    maxDiscount: offer.max_discount ?? null,
    calculatedDiscount,
    freeShipping,
    offerId: offer.id,
  }
}

async function generateOrderNumber(supabase: ReturnType<typeof createAdminSupabaseClient>, offset = 0) {
  const now = new Date()
  const year = now.getFullYear()
  const start = `${year}-01-01T00:00:00.000Z`
  const end = `${year + 1}-01-01T00:00:00.000Z`
  const { count, error } = await supabase
    .from('shelf_orders')
    .select('id', { count: 'exact', head: true })
    .gte('placed_at', start)
    .lt('placed_at', end)

  if (error) throw new Error(error.message)

  return `SHOP-${year}-${String((count ?? 0) + 1 + offset).padStart(5, '0')}`
}

function isDuplicateOrderNumberError(error: unknown) {
  if (!isRecord(error)) return false
  const code = typeof error.code === 'string' ? error.code : ''
  const message = typeof error.message === 'string' ? error.message : ''
  return code === '23505' || message.toLowerCase().includes('duplicate key')
}

export async function POST(request: Request) {
  const authSupabase = await createServerSupabaseClient()
  const { data: authData, error: authError } = await authSupabase.auth.getUser()

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = authData.user.id

  const rateLimit = await rateLimitResponse(request, {
    prefix: 'shop_checkout',
    windowSeconds: 60,
    maxRequests: 10,
    userId,
  })

  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  try {
    const body = (await request.json()) as CreateShopOrderBody
    const rawItems = normalizeOrderItems(body.items)
    const shippingAddress = normalizeShippingAddress(body.shippingAddress)
    const couponCode = typeof body.couponCode === 'string' && body.couponCode.trim()
      ? body.couponCode.trim().toUpperCase()
      : null
    const appliedCouponId = typeof body.appliedCouponId === 'string' && body.appliedCouponId.trim()
      ? body.appliedCouponId.trim()
      : null
    const appliedOfferId = typeof body.appliedOfferId === 'string' && body.appliedOfferId.trim()
      ? body.appliedOfferId.trim()
      : null

    const supabase = createAdminSupabaseClient()
    const settings = await getSettings()

    const skuIds = Array.from(new Set(rawItems.map((item) => item.skuId)))
    const { data: skuRows, error: skuError } = await supabase
      .from('shelf_skus')
      .select('id, product_id, sku_code, variant_combination, price, stock_quantity, is_available, weight_grams')
      .in('id', skuIds)

    if (skuError) throw new Error(skuError.message)

    const skusById = new Map((skuRows ?? []).map((sku) => [sku.id, sku as SkuSnapshot]))

    const items: ShopOrderItem[] = []
    let totalWeightGrams = 0

    for (const rawItem of rawItems) {
      const sku = skusById.get(rawItem.skuId)
      if (!sku || sku.is_available === false || Number(sku.stock_quantity ?? 0) < rawItem.quantity) {
        return NextResponse.json(
          { error: `Sorry, ${rawItem.skuId} is no longer available in the requested quantity.` },
          { status: 400 }
        )
      }

      const unitPrice = roundMoney(Number(sku.price))
      const weight = Number(sku.weight_grams ?? 0)
      totalWeightGrams += weight * rawItem.quantity

      items.push({
        productId: rawItem.productId,
        productName: '',
        productThumbnail: '',
        productSlug: null,
        skuId: rawItem.skuId,
        skuCode: '',
        variantCombination: {},
        variantLabel: '',
        quantity: rawItem.quantity,
        unitPrice,
        customizationText: rawItem.customizationText,
      })
    }

    // Enrich items with product details
    const productIds = Array.from(new Set(items.map((item) => item.productId)))
    const { data: productRows } = await supabase
      .from('shelf_products')
      .select('id, name, slug, thumbnail_url')
      .in('id', productIds)

    const productsById = new Map((productRows ?? []).map((p) => [p.id, p as Record<string, unknown>]))

    for (const item of items) {
      const product = productsById.get(item.productId)
      item.productName = typeof product?.name === 'string' ? product.name : 'Product'
      item.productSlug = typeof product?.slug === 'string' ? product.slug : null
      item.productThumbnail = typeof product?.thumbnail_url === 'string' ? product.thumbnail_url : ''

      const sku = skusById.get(item.skuId)
      item.skuCode = typeof sku && typeof (sku as SkuSnapshot).id === 'string' ? String(item.skuId).slice(0, 8) : ''
      const variant = sku && typeof (sku as SkuSnapshot).variant_combination === 'object' && (sku as SkuSnapshot).variant_combination !== null
        ? (sku as SkuSnapshot).variant_combination
        : {}
      item.variantCombination = variant as Record<string, string | boolean>
      item.variantLabel = Object.entries(item.variantCombination)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
    }

    const subtotal = calculateShopSubtotal(items)

    const validatedCoupon = couponCode
      ? await validateCouponCode(supabase, couponCode, subtotal, userId)
      : null
    const validatedOffer = appliedOfferId
      ? await validateOfferId(supabase, appliedOfferId, subtotal, userId)
      : null

    const discountSource = validatedCoupon ?? validatedOffer
    const discountAmount = discountSource?.calculatedDiscount ?? 0

    const shippingResult = await calculateShippingFromRules({
      pincode: shippingAddress.pincode,
      state: shippingAddress.state,
      subtotal,
      weightGrams: totalWeightGrams,
      settings,
    })

    if (!shippingResult.available) {
      return NextResponse.json({ error: shippingResult.reason || 'Delivery not available.' }, { status: 400 })
    }

    const shippingChargePaise = discountSource?.freeShipping ? 0 : shippingResult.chargePaise
    const shippingCharge = shippingChargePaise / 100
    const taxableAmount = Math.max(0, subtotal - discountAmount)
    const tax = calculateShopTax(taxableAmount, settings)
    const totalAmount = calculateShopTotal(subtotal, discountAmount, shippingCharge, tax)

    const pricingSnapshot = buildShopPricingSnapshot(
      items,
      discountSource,
      subtotal,
      shippingCharge,
      tax,
      totalAmount
    )

    const toPaise = (value: number) => Math.round(value * 100)

    for (let attempt = 0; attempt < MAX_ORDER_NUMBER_RETRIES; attempt += 1) {
      const orderNumber = await generateOrderNumber(supabase, attempt)
      const { data, error } = await supabase.rpc('create_shelf_order_atomic', {
        p_user_id: userId,
        p_order_number: orderNumber,
        p_items: items,
        p_subtotal_paise: toPaise(subtotal),
        p_discount_amount_paise: toPaise(discountAmount),
        p_coupon_code: discountSource?.code ?? couponCode,
        p_shipping_charge_paise: shippingChargePaise,
        p_total_amount_paise: toPaise(totalAmount),
        p_shipping_address: shippingAddress,
      })

      if (!error) {
        const result = isRecord(data) ? data : {}
        const orderId = String(result.orderId ?? '')
        if (orderId) {
          const { error: sourceError } = await supabase
            .from('shelf_orders')
            .update({
              order_source: 'shop',
              payment_provider: 'razorpay',
              payment_status: 'pending',
              payment_purpose: 'shop_order',
              payment_amount_paise: toPaise(totalAmount),
              payment_currency: 'INR',
              payment_snapshot: {
                subtotal,
                discountAmount,
                shippingCharge,
                totalAmount,
                items,
                shippingAddress,
                appliedCouponId,
                appliedOfferId,
              },
              order_price_snapshot: pricingSnapshot,
            })
            .eq('id', orderId)

          if (sourceError) {
            console.error('[3d-shop] Failed to update order source', sourceError)
          }

          // NOTE: Emails are now sent only after successful payment capture,
          // triggered from the payment verification flow and webhook handler.
          // We do NOT send order-placed emails at creation time anymore.
        }

        return NextResponse.json({
          success: true,
          orderId,
          orderNumber: String(result.orderNumber ?? orderNumber),
        })
      }

      if (isDuplicateOrderNumberError(error) && attempt < MAX_ORDER_NUMBER_RETRIES - 1) {
        continue
      }

      const message = error.message || 'Failed to place order.'
      const status = message.includes('Item went out of stock') || message.includes('Invalid item') ? 400 : 500
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json({ error: 'Could not generate an order number. Please try again.' }, { status: 500 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to place order.' },
      { status: 400 }
    )
  }
}
