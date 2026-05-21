import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { ShopOrderItem, ShopShippingAddress } from '@/lib/shop/orders'

export const dynamic = 'force-dynamic'

const MONEY_TOLERANCE = 1
const MAX_ORDER_NUMBER_RETRIES = 5

type CreateShopOrderBody = {
  items?: unknown
  subtotal?: unknown
  discountAmount?: unknown
  couponCode?: unknown
  shippingCharge?: unknown
  totalAmount?: unknown
  shippingAddress?: unknown
}

type SkuSnapshot = {
  id: string
  product_id: string
  price: number | string
  stock_quantity: number | string
  is_available: boolean | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function normalizeMoney(value: unknown) {
  const next = Number(value)
  return Number.isFinite(next) ? Number(next.toFixed(2)) : NaN
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function itemFailureLabel(item: Pick<ShopOrderItem, 'productName' | 'variantLabel' | 'skuCode'>) {
  return `${item.productName} (${item.variantLabel || item.skuCode})`
}

function normalizeOrderItems(value: unknown): ShopOrderItem[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Your cart is empty.')
  }

  return value.map((entry) => {
    if (!isRecord(entry)) throw new Error('Invalid cart item.')

    const productId = normalizeText(entry.productId)
    const productName = normalizeText(entry.productName)
    const productThumbnail = normalizeText(entry.productThumbnail)
    const productSlug = normalizeText(entry.productSlug)
    const skuId = normalizeText(entry.skuId)
    const skuCode = normalizeText(entry.skuCode)
    const variantLabel = normalizeText(entry.variantLabel)
    const quantity = Number(entry.quantity)
    const unitPrice = normalizeMoney(entry.unitPrice)

    if (!productId || !productName || !skuId || !skuCode) throw new Error('Invalid cart item.')
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Invalid item quantity.')
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error('Invalid item price.')

    return {
      productId,
      productName,
      productThumbnail,
      productSlug: productSlug || null,
      skuId,
      skuCode,
      variantCombination: isRecord(entry.variantCombination)
        ? entry.variantCombination as Record<string, string | boolean>
        : {},
      variantLabel,
      quantity,
      unitPrice,
      customizationText: typeof entry.customizationText === 'string'
        ? entry.customizationText.trim() || null
        : null,
    }
  })
}

function normalizeShippingAddress(value: unknown): ShopShippingAddress {
  if (!isRecord(value)) throw new Error('Delivery address is required.')

  const address = {
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
  orderAmount: number,
  userId: string
) {
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
    if (orderAmount < Number(shopCoupon.min_order_value ?? 0)) {
      throw new Error(`Minimum order value of ₹${Number(shopCoupon.min_order_value ?? 0).toFixed(0)} required.`)
    }
    return code
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
  if (orderAmount < Number(coupon.min_order_value ?? 0)) {
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

  return code
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

  try {
    const body = (await request.json()) as CreateShopOrderBody
    const items = normalizeOrderItems(body.items)
    const shippingAddress = normalizeShippingAddress(body.shippingAddress)
    const subtotal = normalizeMoney(body.subtotal)
    const discountAmount = normalizeMoney(body.discountAmount ?? 0)
    const shippingCharge = normalizeMoney(body.shippingCharge ?? 0)
    const totalAmount = normalizeMoney(body.totalAmount)
    const couponCode = typeof body.couponCode === 'string' && body.couponCode.trim()
      ? body.couponCode.trim().toUpperCase()
      : null

    if (![subtotal, discountAmount, shippingCharge, totalAmount].every(Number.isFinite)) {
      return NextResponse.json({ error: 'Order totals are invalid.' }, { status: 400 })
    }

    if (discountAmount < 0 || discountAmount > subtotal || shippingCharge < 0) {
      return NextResponse.json({ error: 'Order totals are invalid.' }, { status: 400 })
    }

    const lineSubtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const expectedTotal = Math.max(0, subtotal - discountAmount) + shippingCharge
    if (
      Math.abs(lineSubtotal - subtotal) > MONEY_TOLERANCE ||
      Math.abs(expectedTotal - totalAmount) > MONEY_TOLERANCE
    ) {
      return NextResponse.json({ error: 'Order totals could not be verified. Please refresh your cart.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const skuIds = Array.from(new Set(items.map((item) => item.skuId)))
    const { data: skuRows, error: skuError } = await supabase
      .from('shelf_skus')
      .select('id, product_id, price, stock_quantity, is_available')
      .in('id', skuIds)

    if (skuError) throw new Error(skuError.message)

    const skusById = new Map((skuRows ?? []).map((sku) => [sku.id, sku as SkuSnapshot]))

    for (const item of items) {
      const sku = skusById.get(item.skuId)
      if (!sku || sku.is_available === false || Number(sku.stock_quantity ?? 0) < item.quantity) {
        return NextResponse.json(
          { error: `Sorry, ${itemFailureLabel(item)} is no longer available in the requested quantity.` },
          { status: 400 }
        )
      }

      if (Math.abs(Number(sku.price) - item.unitPrice) > MONEY_TOLERANCE) {
        return NextResponse.json(
          { error: `Price has changed for ${item.productName}. Please refresh your cart.` },
          { status: 400 }
        )
      }
    }

    if (couponCode) {
      try {
        await validateCouponCode(supabase, couponCode, subtotal, authData.user.id)
      } catch (couponError) {
        return NextResponse.json(
          { error: couponError instanceof Error ? couponError.message : 'Invalid coupon code.' },
          { status: 400 }
        )
      }
    }

    for (let attempt = 0; attempt < MAX_ORDER_NUMBER_RETRIES; attempt += 1) {
      const orderNumber = await generateOrderNumber(supabase, attempt)
      const { data, error } = await supabase.rpc('create_shelf_order_atomic', {
        p_user_id: authData.user.id,
        p_order_number: orderNumber,
        p_items: items,
        p_subtotal: subtotal,
        p_discount_amount: discountAmount,
        p_coupon_code: couponCode,
        p_shipping_charge: shippingCharge,
        p_total_amount: totalAmount,
        p_shipping_address: shippingAddress,
      })

      if (!error) {
        const result = isRecord(data) ? data : {}
        const orderId = String(result.orderId ?? '')
        if (orderId) {
          const { error: sourceError } = await supabase
            .from('shelf_orders')
            .update({ order_source: 'shop' })
            .eq('id', orderId)

          if (sourceError) {
            console.error('[3d-shop] Failed to update order source', sourceError)
          }
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
