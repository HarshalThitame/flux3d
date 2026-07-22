'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/server'
import {
  formatOrderNumber,
  normalizePhone,
  validateAddressFields,
} from '@/lib/orders'
import { getSettings } from '@/lib/settings'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import {
  isMissingSupabaseTableError,
  ORDERS_TABLE_UNAVAILABLE_MESSAGE,
} from '@/lib/quote/supabase-errors'
import { normalizeOwnedStoragePath } from '@/lib/quote/storage-path'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  calculatePricingWaterfall,
  getHighestCartDiscountTier,
  roundMoney,
  type PromotionInput,
} from '@/lib/quote/pricing-waterfall'
import { fetchMaterialForQuote } from '@/lib/quote/server-pricing'
import { trackFeatureUsage } from '@/lib/tracking/featureTracker'
import { redactSensitiveValues } from '@/lib/security/redact'
import { verifyModelVolume } from '@/lib/storage/verify-metadata'

type CartOrderItem = {
  quoteId: string
  fileUrl: string
  fileName: string
  material: string
  color: string
  quantity?: number
  infill: number
  layerHeight: number
  postProcessingLevel: 'none' | 'sanded' | 'sanded-painted'
  supports: boolean
  postProcessingCharges?: number
  materialCost?: number
  machineCost?: number
  subtotal?: number
  overheadPercentage?: number
  overheadAmount?: number
  marginPercentage?: number
  marginAmount?: number
  totalPrice?: number
  cartDiscountAmount?: number
  cartDiscountPercent?: number
  finalPrice?: number
  deliveryCharge?: number
  grandTotal?: number
  price: number
  estimatedTime: number
  weight: number
  modelVolumeMm3?: number
  difficultyFactor?: number
  dimensions: {
    x: number
    y: number
    z: number
  }
}

type CreateCartOrderInput = {
  items: CartOrderItem[]
  subtotal: number
  itemsTotal?: number
  cartDiscountAmount?: number
  cartDiscountPercent?: number
  couponDiscountAmount?: number
  couponCode?: string | null
  couponId?: string | null
  couponDiscountType?: string | null
  offerId?: string | null
  offerDiscountAmount?: number
  offerName?: string | null
  offerCode?: string | null
  offerDiscountType?: string | null
  finalPrice?: number
  deliveryCharge?: number
  grandTotal?: number
  fullName: string
  phone: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  pincode: string
  landmark: string
  discount?: number
}

function normalizeNumber(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid ${field}.`)
  }

  return value
}

function allocateAmount(total: number, bases: number[]) {
  if (bases.length === 0) {
    return []
  }

  const safeTotal = roundMoney(total)
  const safeBases = bases.map((base) => Math.max(0, base))
  const baseSum = safeBases.reduce((sum, value) => sum + value, 0)

  if (safeTotal === 0) {
    return bases.map(() => 0)
  }

  if (baseSum === 0) {
    const equalShare = roundMoney(safeTotal / safeBases.length)
    let remaining = safeTotal
    return safeBases.map((_, index) => {
      if (index === safeBases.length - 1) {
        return roundMoney(remaining)
      }
      const share = equalShare
      remaining = roundMoney(remaining - share)
      return share
    })
  }

  let remaining = safeTotal

  return safeBases.map((base, index) => {
    if (index === safeBases.length - 1) {
      return roundMoney(remaining)
    }

    const share = roundMoney(safeTotal * (base / baseSum))
    remaining = roundMoney(remaining - share)
    return share
  })
}

type PreparedCartOrderItem = CartOrderItem & {
  normalizedQuantity: number
  materialCost: number
  machineCost: number
  subtotal: number
  postProcessingCharges: number
  overheadPercent: number
  overheadAmount: number
  marginPercent: number
  marginAmount: number
  totalPrice: number
}

export async function createCartOrderAction(input: CreateCartOrderInput): Promise<{
  orderId: string
  orderNumber: string
  itemCount: number
}> {
  const auth = await requireUser('/cart/delivery')
  const supabase = await createServerSupabaseClient()
  const adminSupabase = createAdminSupabaseClient()

  if (input.items.length === 0) {
    throw new Error('Your cart is empty. Add items before ordering.')
  }

  const addressErrors = validateAddressFields({
    fullName: input.fullName,
    phone: input.phone,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2,
    city: input.city,
    state: input.state,
    pincode: input.pincode,
    landmark: input.landmark,
  })

  for (const item of input.items) {
    if (!item.fileUrl.trim()) {
      throw new Error(`Item "${item.fileName}" is missing a file upload.`)
    }
    if (!item.material.trim() || !item.color.trim()) {
      throw new Error(`Item "${item.fileName}" is missing material or color selection.`)
    }
  }

  if (Object.keys(addressErrors).length > 0) {
    throw new Error('Complete the delivery address before placing the order.')
  }

  const normalizedPhone = normalizePhone(input.phone)
  const trimmedAddress = {
    full_name: input.fullName.trim(),
    phone: normalizedPhone,
    address_line1: input.addressLine1.trim(),
    address_line2: input.addressLine2?.trim() ? input.addressLine2.trim() : null,
    city: input.city.trim(),
    state: input.state.trim(),
    pincode: input.pincode.trim(),
    landmark: input.landmark?.trim() ? input.landmark.trim() : null,
  }
  const savedAddress = {
    full_name: trimmedAddress.full_name,
    phone: trimmedAddress.phone,
    address_line_1: trimmedAddress.address_line1,
    address_line_2: trimmedAddress.address_line2,
    city: trimmedAddress.city,
    state: trimmedAddress.state,
    pincode: trimmedAddress.pincode,
    landmark: trimmedAddress.landmark,
    country: 'India',
    is_default: true,
    updated_at: new Date().toISOString(),
  }

  const { data: existingAddress } = await supabase
    .from('addresses')
    .select('id')
    .eq('user_id', auth.user.id)
    .eq('full_name', savedAddress.full_name)
    .eq('phone', savedAddress.phone)
    .eq('address_line_1', savedAddress.address_line_1)
    .eq('city', savedAddress.city)
    .eq('state', savedAddress.state)
    .eq('pincode', savedAddress.pincode)
    .maybeSingle()

  const { error: clearDefaultAddressError } = await supabase
    .from('addresses')
    .update({ is_default: false })
    .eq('user_id', auth.user.id)

  if (clearDefaultAddressError) {
    console.error('[orders] Failed to clear default delivery addresses:', clearDefaultAddressError)
  }

  if (existingAddress) {
    const { error: addressUpdateError } = await supabase
      .from('addresses')
      .update(savedAddress)
      .eq('id', existingAddress.id)
      .eq('user_id', auth.user.id)

    if (addressUpdateError) {
      console.error('[orders] Failed to update delivery address:', addressUpdateError)
    }
  } else {
    const { error: addressInsertError } = await supabase.from('addresses').insert({
      user_id: auth.user.id,
      ...savedAddress,
    })

    if (addressInsertError) {
      console.error('[orders] Failed to insert delivery address:', addressInsertError)
    }
  }

  const groupId = crypto.randomUUID()
  const settings = await getSettings()
  const preparedItems: PreparedCartOrderItem[] = []

  for (const item of input.items) {
    const normalizedQuantity = Math.max(1, Math.floor(Number(item.quantity ?? 1)))

    if (item.modelVolumeMm3 && item.modelVolumeMm3 > 0 && item.fileUrl) {
      const safeFileUrl = normalizeOwnedStoragePath(item.fileUrl, auth.user.id)
      const volumeCheck = await verifyModelVolume(safeFileUrl, item.modelVolumeMm3)
      if (!volumeCheck.valid) {
        throw new Error(volumeCheck.error ?? `Volume verification failed for "${item.fileName}".`)
      }
    }

    const material = item.modelVolumeMm3
      ? await fetchMaterialForQuote(item.material)
      : null

    let itemMaterialCost: number
    let itemMachineCost: number
    let estimatedMinutes: number

    if (material && item.modelVolumeMm3 && item.modelVolumeMm3 > 0) {
      const weightGrams = (item.modelVolumeMm3 * material.density) / 1000
      const totalWeight = weightGrams * normalizedQuantity
      itemMaterialCost = normalizeNumber(totalWeight * material.pricePerGram, 'material cost')
      estimatedMinutes = (totalWeight / (settings.printSpeedGramsPerHour || 20)) * 60
      itemMachineCost = normalizeNumber((estimatedMinutes / 60) * material.machineRate, 'machine cost')
    } else {
      itemMaterialCost = normalizeNumber(item.materialCost ?? 0, 'material cost')
      itemMachineCost = normalizeNumber(item.machineCost ?? 0, 'machine cost')
      estimatedMinutes = item.estimatedTime * 60
    }

    const postProcessingCharges = normalizeNumber(item.postProcessingCharges ?? 0, 'post processing charges')
    const providedOverheadPercent = Number(item.overheadPercentage ?? 0)
    const overheadPercent = normalizeNumber(
      providedOverheadPercent > 0 ? providedOverheadPercent : settings.overheadPercentage,
      'overhead percent'
    )
    const providedMarginPercent = Number(item.marginPercentage ?? 0)
    const marginPercent = normalizeNumber(
      providedMarginPercent > 0 ? providedMarginPercent : settings.marginPercentage,
      'margin percent'
    )
    const itemWaterfall = calculatePricingWaterfall({
      materialCost: itemMaterialCost,
      machineCost: itemMachineCost,
      postProcessingCharges,
      quantity: normalizedQuantity,
      overheadPercent,
      marginPercent,
      deliveryCharge: 0,
      deliveryThreshold: settings.deliveryChargeThreshold,
      defaultDeliveryCharge: settings.defaultDeliveryCharge,
    })

    preparedItems.push({
      ...item,
      normalizedQuantity,
      materialCost: itemMaterialCost,
      machineCost: itemMachineCost,
      subtotal: itemWaterfall.subtotal,
      postProcessingCharges,
      overheadPercent,
      overheadAmount: itemWaterfall.overheadAmount,
      marginPercent,
      marginAmount: itemWaterfall.marginAmount,
      totalPrice: itemWaterfall.priceBeforeDiscount,
    })
  }
  const basePrices = preparedItems.map((item) => item.totalPrice)
  const totalPriceTotal = roundMoney(basePrices.reduce((sum, price) => sum + price, 0))
  const cartTier = getHighestCartDiscountTier(
    totalPriceTotal,
    settings.cartDiscountTiers,
    settings.cartDiscountEnabled
  )
  const cartDiscountPercent = normalizeNumber(cartTier?.discountPercent ?? 0, 'cart discount percent')
  const cartWaterfall = calculatePricingWaterfall({
    materialCost: totalPriceTotal,
    machineCost: 0,
    postProcessingCharges: 0,
    quantity: preparedItems.reduce((sum, item) => sum + item.normalizedQuantity, 0),
    overheadPercent: 0,
    marginPercent: 0,
    cartDiscountPercent,
    deliveryCharge: 0,
    deliveryThreshold: settings.deliveryChargeThreshold,
    defaultDeliveryCharge: settings.defaultDeliveryCharge,
  })
  const cartDiscountAmount = cartWaterfall.cartDiscountAmount
  const afterCartTotal = cartWaterfall.afterCart

  let couponPromotion: PromotionInput | null = null
  let couponDiscountType = input.couponDiscountType ?? null
  let couponId = input.couponId ?? null
  let couponCode = input.couponCode ?? null
  let couponFreeShipping = false

  if (couponId || couponCode) {
    let couponQuery = adminSupabase
      .from('coupons')
      .select('id, code, discount_type, discount_value, max_discount, min_order_value, starts_at, expires_at, is_active, usage_limit, usage_per_user, used_count, first_order_only')

    couponQuery = couponId ? couponQuery.eq('id', couponId) : couponQuery.eq('code', couponCode)
    const { data: coupon, error: couponError } = await couponQuery.maybeSingle()

    if (couponError) throw new Error(couponError.message)
    if (!coupon) throw new Error('Coupon no longer exists. Remove it and try again.')

    const now = new Date()
    const startsAt = new Date(String(coupon.starts_at))
    const expiresAt = new Date(String(coupon.expires_at))
    if (!coupon.is_active) throw new Error('This coupon is no longer active.')
    if (Number.isFinite(startsAt.getTime()) && now < startsAt) throw new Error('This coupon is not active yet.')
    if (Number.isFinite(expiresAt.getTime()) && now > expiresAt) throw new Error('This coupon has expired.')
    if (coupon.usage_limit != null && Number(coupon.used_count ?? 0) >= Number(coupon.usage_limit)) {
      throw new Error('This coupon has reached its usage limit.')
    }
    if (afterCartTotal < Number(coupon.min_order_value ?? 0)) {
      throw new Error(`Minimum order value of ₹${Number(coupon.min_order_value ?? 0).toLocaleString('en-IN')} required for this coupon.`)
    }
    if (coupon.usage_per_user != null) {
      const { count, error: usageError } = await supabase
        .from('redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id)
        .eq('user_id', auth.user.id)

      if (usageError) throw new Error(usageError.message)
      if ((count ?? 0) >= Number(coupon.usage_per_user)) {
        throw new Error('You have already used this coupon the maximum number of times.')
      }
    }
    if (coupon.first_order_only) {
      const { count, error: firstOrderError } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', auth.user.id)

      if (firstOrderError) throw new Error(firstOrderError.message)
      if ((count ?? 0) > 0) throw new Error('This coupon is for first-time orders only.')
    }

    couponId = coupon.id as string
    couponCode = coupon.code as string
    couponDiscountType = String(coupon.discount_type)
    couponFreeShipping = couponDiscountType === 'free_shipping'
    couponPromotion = couponFreeShipping
      ? null
      : {
          discountType: couponDiscountType,
          discountValue: Number(coupon.discount_value ?? 0),
          maxDiscount: coupon.max_discount == null ? null : Number(coupon.max_discount),
        }
  }

  let offerDiscountType = input.offerDiscountType ?? null
  let offerName = input.offerName ?? null
  let offerId = input.offerId ?? null
  let offerPromotion: PromotionInput | null = null
  let offerFreeShipping = false

  if (offerId) {
    const { data: offer, error: offerError } = await adminSupabase
      .from('offers')
      .select('id, title, badge_text, sale_label, offer_type, discount_value, max_discount, starts_at, ends_at, is_active, usage_limit, used_count')
      .eq('id', offerId)
      .maybeSingle()

    if (offerError) throw new Error(offerError.message)

    const now = new Date()
    const startsAt = offer ? new Date(String(offer.starts_at)) : null
    const endsAt = offer ? new Date(String(offer.ends_at)) : null
    const isOfferValid = Boolean(
      offer &&
      offer.is_active &&
      (!startsAt || !Number.isFinite(startsAt.getTime()) || now >= startsAt) &&
      (!endsAt || !Number.isFinite(endsAt.getTime()) || now <= endsAt) &&
      (offer.usage_limit == null || Number(offer.used_count ?? 0) < Number(offer.usage_limit))
    )

    if (isOfferValid && offer) {
      offerId = offer.id as string
      offerDiscountType = offer.offer_type === 'buy_x_get_y' ? 'percentage' : String(offer.offer_type)
      offerName = String(offer.title ?? offer.badge_text ?? offer.sale_label ?? input.offerCode ?? 'Offer')
      offerFreeShipping = offerDiscountType === 'free_shipping'
      offerPromotion = offerFreeShipping
        ? null
        : {
            discountType: offerDiscountType,
            discountValue: Number(offer.discount_value ?? 0),
            maxDiscount: offer.max_discount == null ? null : Number(offer.max_discount),
          }
    } else {
      offerId = null
      offerDiscountType = null
      offerName = null
    }
  }

  const groupWaterfall = calculatePricingWaterfall({
    materialCost: totalPriceTotal,
    machineCost: 0,
    postProcessingCharges: 0,
    quantity: preparedItems.reduce((sum, item) => sum + item.normalizedQuantity, 0),
    overheadPercent: 0,
    marginPercent: 0,
    cartDiscountPercent,
    coupon: couponPromotion,
    offer: offerPromotion,
    deliveryCharge: couponFreeShipping || offerFreeShipping ? 0 : null,
    deliveryThreshold: settings.deliveryChargeThreshold,
    defaultDeliveryCharge: settings.defaultDeliveryCharge,
  })
  const couponDiscountAmount = groupWaterfall.couponDiscountAmount
  const offerDiscountAmount = groupWaterfall.offerDiscountAmount
  const resolvedDeliveryChargeTotal = groupWaterfall.deliveryCharge
  const afterCouponTotal = groupWaterfall.afterCoupon
  const cartDiscountShares = allocateAmount(cartDiscountAmount, basePrices)
  const couponDiscountShares = allocateAmount(couponDiscountAmount, basePrices)
  const offerDiscountShares = allocateAmount(offerDiscountAmount, basePrices)
  const afterAllDiscounts = basePrices.map((base, index) =>
    roundMoney(base - cartDiscountShares[index] - couponDiscountShares[index] - offerDiscountShares[index])
  )
  const deliveryShares = allocateAmount(resolvedDeliveryChargeTotal, afterAllDiscounts)

  const orderItems = preparedItems.map((item, index) => {
    const normalizedQuantity = item.normalizedQuantity
    const itemMaterialCost = item.materialCost
    const itemMachineCost = item.machineCost
    const itemSubtotal = item.subtotal
    const postProcessingCharges = item.postProcessingCharges
    const totalPrice = normalizeNumber(basePrices[index], 'total price')
    const overheadPercent = item.overheadPercent
    const overheadAmount = item.overheadAmount
    const marginPercent = item.marginPercent
    const marginAmount = item.marginAmount
    const cartDiscountForItem = cartDiscountShares[index] ?? 0
    const couponDiscountForItem = couponDiscountShares[index] ?? 0
    const offerDiscountForItem = offerDiscountShares[index] ?? 0
    const finalPrice = Math.max(0, afterAllDiscounts[index] ?? 0)
    const itemDelivery = deliveryShares[index] ?? 0
    const grandTotal = Math.max(0, finalPrice + itemDelivery)
    return {
      user_id: auth.user.id,
      group_id: groupId,
      file_url: normalizeOwnedStoragePath(item.fileUrl, auth.user.id),
      material: item.material.trim(),
      color: item.color.trim(),
      infill: Math.round(normalizeNumber(item.infill, 'infill')),
      layer_height: normalizeNumber(item.layerHeight, 'layer height'),
      post_processing_level: item.postProcessingLevel,
      supports: item.supports,
      quantity: normalizedQuantity,
      weight: roundMoney(item.weight ?? 0),
      difficulty_factor: normalizeNumber(item.difficultyFactor ?? 1, 'difficulty factor'),
      material_cost: itemMaterialCost,
      machine_cost: itemMachineCost,
      subtotal: itemSubtotal,
      post_processing_charges: postProcessingCharges,
      overhead_percent: overheadPercent,
      overhead_amount: overheadAmount,
      margin_percent: marginPercent,
      margin_amount: marginAmount,
      ...trimmedAddress,
      delivery_charge: itemDelivery,
      total_price: totalPrice,
      cart_discount_percent: cartDiscountPercent,
      cart_discount: cartDiscountForItem,
      coupon_discount: couponDiscountForItem,
      offer_discount: offerDiscountForItem,
      final_price: finalPrice,
      grand_total: grandTotal,
      price: finalPrice,
      price_per_unit: roundMoney(totalPrice / normalizedQuantity),
      estimated_time: normalizeNumber(item.estimatedTime, 'estimated time'),
      status: 'pending',
      discount: roundMoney(cartDiscountForItem + couponDiscountForItem + offerDiscountForItem),
      coupon_code: couponCode,
      coupon_id: couponId,
      offer_id: offerId,
      offer_name: offerName,
      discount_type: couponDiscountType ?? offerDiscountType ?? null,
      notes: `Cart order - ${input.items.length} item(s), ${normalizedQuantity} pcs. File: ${item.fileName}`,
    }
  })

  const { data: insertedOrders, error: insertError } = await supabase
    .from('orders')
    .insert(orderItems)
    .select('id, serial_number, order_number, group_id, status, created_at')

  if (insertError) {
    if (isMissingSupabaseTableError(insertError, 'orders')) {
      throw new Error(ORDERS_TABLE_UNAVAILABLE_MESSAGE)
    }

    throw new Error(insertError.message)
  }

  if (!insertedOrders || insertedOrders.length === 0) {
    throw new Error('Order submission did not return a confirmation. Please try again.')
  }

  for (let i = 0; i < insertedOrders.length; i++) {
    const order = insertedOrders[i]
    const cartItem = input.items[i]

    if (order.serial_number == null || !order.created_at) {
      throw new Error('Order submission returned incomplete confirmation details. Please try again.')
    }

    const orderNumber = formatOrderNumber(order.serial_number, order.created_at)
    const { error: updateError } = await adminSupabase
      .from('orders')
      .update({
        order_number: orderNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    if (updateError) {
      throw new Error(updateError.message)
    }

    const fileName = cartItem?.fileName ?? `item-${order.id.slice(0, 8)}.stl`

    const { error: modelFileError } = await adminSupabase.from('model_files').upsert(
      {
        user_id: auth.user.id,
        file_name: fileName,
        file_url: cartItem?.fileUrl ?? '',
        material: cartItem?.material?.trim() ?? '',
        status: 'ordered',
        uploaded_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,file_url', ignoreDuplicates: false }
    )

    if (modelFileError) {
      console.error('[cart-orders] Failed to track model file:', modelFileError)
    }

    const { error: quoteVersionError } = await adminSupabase.from('quote_versions').insert({
      quote_id: `F3D-${orderNumber}`,
      order_id: order.id,
      user_id: auth.user.id,
      version_number: 1,
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: auth.user.id,
      pricing_snapshot: redactSensitiveValues({
        totalPrice: cartItem?.totalPrice ?? 0,
        finalPrice: cartItem?.finalPrice ?? 0,
        grandTotal: cartItem?.grandTotal ?? 0,
        materialCost: cartItem?.materialCost ?? 0,
        machineCost: cartItem?.machineCost ?? 0,
        postProcessingCharges: cartItem?.postProcessingCharges ?? 0,
      }),
      material_id: cartItem?.material?.trim() ?? '',
      config: {},
      model_metadata: redactSensitiveValues({
        fileName: cartItem?.fileName ?? '',
        fileSize: 0,
        extension: cartItem?.fileName?.split('.').pop() ?? '',
        dimensions: cartItem?.dimensions ?? { x: 0, y: 0, z: 0 },
      }),
    })

    if (quoteVersionError) {
      console.error('[cart-orders] Failed to create quote version:', quoteVersionError)
    }
  }

  if (couponId) {
    const firstOrder = insertedOrders[0]
    const orderNumber = formatOrderNumber(firstOrder.serial_number, firstOrder.created_at)

    const { error: redemptionError } = await adminSupabase
      .from('redemptions')
      .insert({
        user_id: auth.user.id,
        order_id: orderNumber,
        coupon_id: couponId,
        discount_type: couponDiscountType ?? 'percentage',
        discount_value: couponDiscountAmount,
        discount_applied: couponDiscountAmount,
        order_amount: afterCartTotal,
      })

    if (redemptionError) {
      throw new Error(redemptionError.message)
    }

    const { error: incrementError } = await adminSupabase.rpc('increment_coupon_used_count', { coupon_id: couponId })
    if (incrementError) throw new Error(incrementError.message)
  }

  if (offerId) {
    const firstOrder = insertedOrders[0]
    const orderNumber = formatOrderNumber(firstOrder.serial_number, firstOrder.created_at)

    const { error: redemptionError } = await adminSupabase
      .from('redemptions')
      .insert({
        user_id: auth.user.id,
        order_id: orderNumber,
        offer_id: offerId,
        discount_type: offerDiscountType ?? 'percentage',
        discount_value: offerDiscountAmount,
        discount_applied: offerDiscountAmount,
        order_amount: afterCouponTotal,
      })

    if (redemptionError) {
      throw new Error(redemptionError.message)
    }

    const { error: incrementError } = await adminSupabase.rpc('increment_offer_used_count', { offer_id: offerId })
    if (incrementError) throw new Error(incrementError.message)
  }

  void trackFeatureUsage(auth.user.id, 'order_placed', {
    source: 'cart',
    groupId,
    orderId: insertedOrders[0].id,
    itemCount: input.items.length,
    unitCount: input.items.reduce((sum, item) => sum + Math.max(1, Math.floor(item.quantity ?? 1)), 0),
    couponCode,
    offerId,
    grandTotal: groupWaterfall.grandTotal,
  }).catch(() => {})

  revalidatePath('/my-orders')
  revalidatePath('/cart')

  return {
    orderId: insertedOrders[0].id,
    orderNumber: formatOrderNumber(insertedOrders[0].serial_number, insertedOrders[0].created_at),
    itemCount: input.items.reduce((sum, item) => sum + Math.max(1, Math.floor(item.quantity ?? 1)), 0),
  }
}
