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
import { trackFeatureUsage } from '@/lib/tracking/featureTracker'
import { logQuoteEvent } from '@/lib/quote/audit'
import { redactSensitiveValues } from '@/lib/security/redact'
import { verifyModelVolume } from '@/lib/storage/verify-metadata'
import { sendOrderPlacedCustomer, sendOrderPlacedAdmin } from '@/lib/email/triggers'
import { notifyWhatsAppOrderConfirmed } from '@/lib/whatsapp/notifications'
import { reportError } from '@/lib/error-handling'
import {
  createQuoteCapture,
  getQuoteCapture,
  markQuoteCapturePaid,
} from '@/lib/quote/capture'
import {
  createRazorpayOrder,
  getRazorpayConfig,
  makeReceipt,
  verifyRazorpayCheckoutSignature,
  fetchRazorpayPayment,
  getPublicRazorpayKeyId,
} from '@/lib/payments/razorpay'
import {
  upsertPaymentAttempt,
  insertPaymentAuditLog,
} from '@/lib/payments/repository'
import { updatePaymentAttemptStatus } from '@/lib/payments/state'
import { notifyPaymentCaptured } from '@/lib/payments/email-triggers'
import { buildPublicBusinessProfile } from '@/lib/public-business'
import { sendCapiEvents, buildPurchaseEvent } from '@/lib/meta/conversions-api'
import { generateEventId } from '@/lib/meta/event-utils'

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

    let itemMaterialCost: number
    let itemMachineCost: number
    let estimatedMinutes: number

    // Price locked at quote time — do not recalculate from raw inputs
    itemMaterialCost = normalizeNumber(item.materialCost ?? 0, 'material cost')
    itemMachineCost = normalizeNumber(item.machineCost ?? 0, 'machine cost')
    estimatedMinutes = item.estimatedTime * 60

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
      .select('id, title, badge_text, sale_label, offer_type, discount_value, max_discount, starts_at, ends_at, is_active, usage_limit, usage_per_user, used_count')
      .eq('id', offerId)
      .maybeSingle()

    if (offerError) throw new Error(offerError.message)

    const now = new Date()
    const startsAt = offer ? new Date(String(offer.starts_at)) : null
    const endsAt = offer ? new Date(String(offer.ends_at)) : null

    if (offer && offer.usage_per_user != null) {
      const { count: offerUsage, error: offerUsageErr } = await supabase
        .from('redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('offer_id', offer.id)
        .eq('user_id', auth.user.id)
      if (offerUsageErr) throw new Error(offerUsageErr.message)
      if ((offerUsage ?? 0) >= Number(offer.usage_per_user)) {
        throw new Error('You have already used this offer the maximum number of times.')
      }
    }

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

    const { data: quoteVersionRow, error: quoteVersionError } = await adminSupabase
      .from('quote_versions')
      .insert({
        quote_id: `F3D-${orderNumber}`,
        order_id: order.id,
        user_id: auth.user.id,
        version_number: 1,
        status: 'approved',
        snapshot_schema_version: 1,
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
      .select('id')
      .maybeSingle()

    if (quoteVersionError) {
      console.error('[cart-orders] Failed to create quote version:', quoteVersionError)
    } else if (quoteVersionRow?.id) {
      await logQuoteEvent({
        quoteVersionId: quoteVersionRow.id,
        orderId: order.id,
        actorId: auth.user.id,
        actorRole: 'customer',
        eventType: 'created',
        previousStatus: null,
        newStatus: 'approved',
        note: `Cart order — item ${i + 1} of ${input.items.length}`,
      })
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
  }).catch((error) => reportError(error, 'Cart order feature tracking failed', { module: 'tracking', level: 'warn', tags: { flow: 'cart_order', orderId: insertedOrders[0].id } }))

  const orderItemsEmail = input.items.map(item => ({
    name: item.fileName,
    material: item.material,
    color: item.color,
    quantity: Math.max(1, Math.floor(item.quantity ?? 1)),
    price: String(item.grandTotal ?? item.finalPrice ?? item.price ?? 0),
  }))
  const orderUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/my-orders/${insertedOrders[0].id}`
  const adminOrderUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/admin/orders/${insertedOrders[0].id}`
  sendOrderPlacedCustomer(auth.user.id, auth.profile.email, formatOrderNumber(insertedOrders[0].serial_number, insertedOrders[0].created_at), auth.profile.name, String(groupWaterfall.grandTotal ?? 0), orderItemsEmail, orderUrl).catch((error) => reportError(error, 'Cart order customer email failed', { module: 'email', level: 'warn', tags: { flow: 'cart_order', orderId: insertedOrders[0].id } }))
  sendOrderPlacedAdmin('', formatOrderNumber(insertedOrders[0].serial_number, insertedOrders[0].created_at), auth.profile.email, auth.profile.name, String(groupWaterfall.grandTotal ?? 0), adminOrderUrl).catch((error) => reportError(error, 'Cart order admin email failed', { module: 'email', level: 'warn', tags: { flow: 'cart_order', orderId: insertedOrders[0].id } }))

  revalidatePath('/my-orders')
  revalidatePath('/cart')

  return {
    orderId: insertedOrders[0].id,
    orderNumber: formatOrderNumber(insertedOrders[0].serial_number, insertedOrders[0].created_at),
    itemCount: input.items.reduce((sum, item) => sum + Math.max(1, Math.floor(item.quantity ?? 1)), 0),
  }
}

export type PrepareCartPaymentResult = {
  reference: string
  session: {
    keyId: string
    orderId: string
    amount: number
    currency: string
  }
  customer: {
    name: string
    email: string
    contact: string
  }
}

export async function prepareCartPaymentAction(
  input: CreateCartOrderInput
): Promise<PrepareCartPaymentResult> {
  const auth = await requireUser('/cart/delivery')
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
  if (Object.keys(addressErrors).length > 0) {
    throw new Error('Complete the delivery address before placing the order.')
  }

  const grandTotal = input.grandTotal ?? input.finalPrice ?? 0
  if (grandTotal <= 0) throw new Error('Order total must be greater than zero.')
  const amountPaise = Math.round(grandTotal * 100)

  const addressData = {
    fullName: input.fullName.trim(),
    phone: normalizePhone(input.phone),
    addressLine1: input.addressLine1.trim(),
    addressLine2: input.addressLine2?.trim() ?? '',
    city: input.city.trim(),
    state: input.state.trim(),
    pincode: input.pincode.trim(),
    landmark: input.landmark?.trim() ?? '',
  }

  const capture = await createQuoteCapture({
    userId: auth.user.id,
    amountPaise,
    draftData: { type: 'cart', itemCount: input.items.length } as unknown as Record<string, unknown>,
    addressData,
    configData: { type: 'cart' } as unknown as Record<string, unknown>,
    pricingData: {
      subtotal: input.subtotal,
      cartDiscountAmount: input.cartDiscountAmount ?? 0,
      cartDiscountPercent: input.cartDiscountPercent ?? 0,
      couponDiscountAmount: input.couponDiscountAmount ?? 0,
      couponCode: input.couponCode ?? null,
      couponId: input.couponId ?? null,
      couponDiscountType: input.couponDiscountType ?? null,
      offerId: input.offerId ?? null,
      offerDiscountAmount: input.offerDiscountAmount ?? 0,
      offerName: input.offerName ?? null,
      offerCode: input.offerCode ?? null,
      offerDiscountType: input.offerDiscountType ?? null,
      finalPrice: input.finalPrice ?? 0,
      deliveryCharge: input.deliveryCharge ?? 0,
      grandTotal,
      discount: input.discount ?? 0,
      items: input.items.map((item) => ({
        quoteId: item.quoteId,
        fileUrl: item.fileUrl,
        fileName: item.fileName,
        material: item.material,
        color: item.color,
        quantity: item.quantity ?? 1,
        infill: item.infill,
        layerHeight: item.layerHeight,
        postProcessingLevel: item.postProcessingLevel,
        supports: item.supports,
        materialCost: item.materialCost ?? 0,
        machineCost: item.machineCost ?? 0,
        subtotal: item.subtotal ?? 0,
        postProcessingCharges: item.postProcessingCharges ?? 0,
        overheadPercentage: item.overheadPercentage ?? 0,
        overheadAmount: item.overheadAmount ?? 0,
        marginPercentage: item.marginPercentage ?? 0,
        marginAmount: item.marginAmount ?? 0,
        totalPrice: item.totalPrice ?? 0,
        cartDiscountAmount: item.cartDiscountAmount ?? 0,
        cartDiscountPercent: item.cartDiscountPercent ?? 0,
        finalPrice: item.finalPrice ?? 0,
        deliveryCharge: item.deliveryCharge ?? 0,
        grandTotal: item.grandTotal ?? 0,
        price: item.price,
        estimatedTime: item.estimatedTime,
        weight: item.weight,
        modelVolumeMm3: item.modelVolumeMm3 ?? 0,
        difficultyFactor: item.difficultyFactor ?? 1,
        dimensions: item.dimensions,
      })),
    } as unknown as Record<string, unknown>,
    modelMetadata: {} as Record<string, unknown>,
  })

  const razorpayConfig = getRazorpayConfig()
  if (!razorpayConfig) throw new Error('Payment gateway is not configured.')

  const receipt = makeReceipt(capture.reference.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 10) || 'CC', 1)

  const providerOrder = await createRazorpayOrder({
    amountPaise,
    currency: 'INR',
    receipt,
    notes: {
      quote_capture_reference: capture.reference,
      internal_order_type: 'custom_quote',
      user_id: auth.user.id,
    },
  })

  const paymentAttempt = await upsertPaymentAttempt({
    internal_order_type: 'custom_quote',
    internal_order_id: capture.reference,
    customer_id: auth.user.id,
    provider: 'razorpay',
    payment_purpose: 'custom_quote_full_payment',
    provider_order_id: providerOrder.id,
    provider_payment_id: null,
    amount_paise: amountPaise,
    currency: 'INR',
    status: 'created',
    attempt_number: 1,
    idempotency_key: `cc-${capture.reference}-${Date.now()}`,
    receipt,
    failure_code: null,
    failure_description: null,
    payment_method: null,
    captured_at: null,
    failed_at: null,
    metadata: {
      quote_capture_reference: capture.reference,
      customer: {
        name: input.fullName.trim(),
        email: auth.user.email ?? '',
        contact: normalizePhone(input.phone),
      },
    },
  })

  await updatePaymentAttemptStatus(
    paymentAttempt.id,
    paymentAttempt.status,
    'pending',
    {
      provider_order_id: providerOrder.id,
      metadata: { ...paymentAttempt.metadata, razorpay: providerOrder },
    },
    {
      actorId: auth.user.id,
      actorRole: 'customer',
      reason: 'Cart payment attempt created',
    }
  )

  await adminSupabase
    .from('quote_captures')
    .update({ payment_attempt_id: paymentAttempt.id })
    .eq('reference', capture.reference)

  await insertPaymentAuditLog({
    actor_id: auth.user.id,
    actor_role: 'customer',
    action: 'payment_attempt_created',
    entity_type: 'custom_quote',
    entity_id: capture.reference,
    previous_state: null,
    new_state: {
      quote_capture_reference: capture.reference,
      payment_attempt_id: paymentAttempt.id,
      provider_order_id: providerOrder.id,
      amount_paise: amountPaise,
    },
  })

  return {
    reference: capture.reference,
    session: {
      keyId: getPublicRazorpayKeyId(),
      orderId: providerOrder.id,
      amount: amountPaise,
      currency: 'INR',
    },
    customer: {
      name: input.fullName.trim(),
      email: auth.user.email ?? '',
      contact: normalizePhone(input.phone),
    },
  }
}

export async function verifyCartPaymentAndCreateOrder(params: {
  reference: string
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}): Promise<{ orderId: string; orderNumber: string; itemCount: number }> {
  const auth = await requireUser('/cart/delivery')

  const capture = await getQuoteCapture(params.reference)
  if (!capture) throw new Error('Quote capture not found.')
  if (capture.status !== 'pending') throw new Error('Capture is not in pending state.')
  if (capture.userId !== auth.user.id) throw new Error('Unauthorized.')

  const signatureValid = verifyRazorpayCheckoutSignature({
    orderId: params.razorpayOrderId,
    paymentId: params.razorpayPaymentId,
    signature: params.razorpaySignature,
  })
  if (!signatureValid) throw new Error('Payment signature verification failed.')

  const razorpayPayment = await fetchRazorpayPayment(params.razorpayPaymentId)
  const isCaptured = razorpayPayment.status === 'captured'
  const isAuthorized = razorpayPayment.status === 'authorized'
  if (!isCaptured && !isAuthorized) {
    throw new Error(`Payment is not confirmed. Status: ${razorpayPayment.status}`)
  }

  if (razorpayPayment.amount !== capture.amountPaise) {
    throw new Error('Payment amount does not match the order total.')
  }

  const supabase = await createServerSupabaseClient()
  const adminSupabase = createAdminSupabaseClient()
  const settings = await getSettings()

  const pricingData = capture.pricingData as Record<string, unknown>
  const addressData = capture.addressData as Record<string, unknown>
  const itemsData = (pricingData.items ?? []) as Array<Record<string, unknown>>

  const normalizedPhone = normalizePhone((addressData.phone as string) ?? '')
  const trimmedAddress = {
    full_name: (addressData.fullName as string)?.trim() ?? '',
    phone: normalizedPhone,
    address_line1: (addressData.addressLine1 as string)?.trim() ?? '',
    address_line2: (addressData.addressLine2 as string)?.trim() || null,
    city: (addressData.city as string)?.trim() ?? '',
    state: (addressData.state as string)?.trim() ?? '',
    pincode: (addressData.pincode as string)?.trim() ?? '',
    landmark: (addressData.landmark as string)?.trim() || null,
  }

  // Save address
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

  const { data: existingAddr } = await supabase
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

  await supabase.from('addresses').update({ is_default: false }).eq('user_id', auth.user.id)
  if (existingAddr) {
    await supabase.from('addresses').update(savedAddress).eq('id', existingAddr.id).eq('user_id', auth.user.id)
  } else {
    await supabase.from('addresses').insert({ user_id: auth.user.id, ...savedAddress })
  }

  // Build order items from cart data
  const groupId = crypto.randomUUID()
  const orderItems: Array<Record<string, unknown>> = []
  const afterCartTotal = Number(pricingData.subtotal ?? 0) - Number(pricingData.cartDiscountAmount ?? 0)
  const afterCouponTotal = afterCartTotal - Number(pricingData.couponDiscountAmount ?? 0)

  for (const item of itemsData) {
    const normalizedQuantity = Math.max(1, Math.floor(Number(item.quantity ?? 1)))
    const itemMaterialCost = normalizeNumber(Number(item.materialCost ?? 0), 'material cost')
    const itemMachineCost = normalizeNumber(Number(item.machineCost ?? 0), 'machine cost')
    const postProcessingCharges = normalizeNumber(Number(item.postProcessingCharges ?? 0), 'post processing charges')
    const itemSubtotal = normalizeNumber(Number(item.subtotal ?? 0), 'subtotal')

    const overheadPercent = Number(item.overheadPercentage ?? 0)
    const overheadAmount = overheadPercent > 0
      ? roundMoney(itemSubtotal * (overheadPercent / 100))
      : normalizeNumber(Number(item.overheadAmount ?? 0), 'overhead amount')

    const marginPercent = Number(item.marginPercentage ?? 0)
    const marginAmount = marginPercent > 0
      ? roundMoney((itemSubtotal + overheadAmount) * (marginPercent / 100))
      : normalizeNumber(Number(item.marginAmount ?? 0), 'margin amount')

    const totalPrice = normalizeNumber(Number(item.totalPrice ?? 0), 'total price')
    const cartDiscountPercent = Number(pricingData.cartDiscountPercent ?? 0)
    const itemCount = itemsData.length
    const cartDiscountForItem = itemCount > 0
      ? roundMoney(Number(pricingData.cartDiscountAmount ?? 0) / itemCount)
      : 0
    const couponDiscountForItem = itemCount > 0
      ? roundMoney(Number(pricingData.couponDiscountAmount ?? 0) / itemCount)
      : 0
    const offerDiscountForItem = itemCount > 0
      ? roundMoney(Number(pricingData.offerDiscountAmount ?? 0) / itemCount)
      : 0
    const itemDelivery = itemCount > 0
      ? roundMoney(Number(pricingData.deliveryCharge ?? 0) / itemCount)
      : 0
    const finalPrice = totalPrice - cartDiscountForItem - couponDiscountForItem - offerDiscountForItem + itemDelivery
    const grandTotal = finalPrice

    orderItems.push({
      user_id: auth.user.id,
      group_id: groupId,
      file_url: normalizeOwnedStoragePath(item.fileUrl as string, auth.user.id),
      material: (item.material as string)?.trim() ?? '',
      color: (item.color as string)?.trim() ?? '',
      infill: Math.round(normalizeNumber(Number(item.infill ?? 20), 'infill')),
      layer_height: normalizeNumber(Number(item.layerHeight ?? 0.2), 'layer height'),
      post_processing_level: item.postProcessingLevel ?? 'none',
      supports: Boolean(item.supports),
      quantity: normalizedQuantity,
      weight: roundMoney(Number(item.weight ?? 0)),
      difficulty_factor: normalizeNumber(Number(item.difficultyFactor ?? 1), 'difficulty factor'),
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
      estimated_time: normalizeNumber(Number(item.estimatedTime ?? 0), 'estimated time'),
      status: 'confirmed',
      discount: roundMoney(cartDiscountForItem + couponDiscountForItem + offerDiscountForItem),
      coupon_code: pricingData.couponCode ?? null,
      coupon_id: pricingData.couponId ?? null,
      offer_id: pricingData.offerId ?? null,
      offer_name: pricingData.offerName ?? null,
      discount_type: pricingData.couponDiscountType ?? pricingData.offerDiscountType ?? null,
      notes: `Cart order — ${itemsData.length} item(s). File: ${item.fileName}`,
      payment_status: 'paid',
      payment_provider: 'razorpay',
      payment_purpose: 'custom_quote_full_payment',
      provider_order_id: params.razorpayOrderId,
      provider_payment_id: params.razorpayPaymentId,
      payment_amount_paise: capture.amountPaise,
      payment_currency: 'INR',
      payment_method: razorpayPayment.method ?? null,
      payment_verified_at: new Date().toISOString(),
      status_timestamps: { confirmed: new Date().toISOString() },
    })
  }

  const { data: insertedOrders, error: insertError } = await supabase
    .from('orders')
    .insert(orderItems)
    .select('id, serial_number, order_number, group_id, status, created_at')

  if (insertError) {
    if (isMissingSupabaseTableError(insertError, 'orders')) throw new Error(ORDERS_TABLE_UNAVAILABLE_MESSAGE)
    throw new Error(insertError.message)
  }
  if (!insertedOrders || insertedOrders.length === 0) throw new Error('Order submission failed.')

  for (let i = 0; i < insertedOrders.length; i++) {
    const order = insertedOrders[i]
    const cartItem = itemsData[i]

    if (order.serial_number == null || !order.created_at) throw new Error('Order confirmation incomplete.')

    const orderNumber = formatOrderNumber(order.serial_number, order.created_at)
    await adminSupabase.from('orders').update({ order_number: orderNumber, updated_at: new Date().toISOString() }).eq('id', order.id)

    const fileName = (cartItem?.fileName as string) ?? `item-${order.id.slice(0, 8)}.stl`
    await adminSupabase.from('model_files').upsert(
      { user_id: auth.user.id, file_name: fileName, file_url: cartItem?.fileUrl as string, material: (cartItem?.material as string)?.trim() ?? '', status: 'ordered', uploaded_at: new Date().toISOString() },
      { onConflict: 'user_id,file_url', ignoreDuplicates: false }
    )

    const { data: qvRow } = await adminSupabase.from('quote_versions').insert({
      quote_id: `F3D-${orderNumber}`,
      order_id: order.id,
      user_id: auth.user.id,
      version_number: 1,
      status: 'approved',
      snapshot_schema_version: 1,
      approved_at: new Date().toISOString(),
      approved_by: auth.user.id,
      pricing_snapshot: redactSensitiveValues({ totalPrice: Number(cartItem?.totalPrice ?? 0), finalPrice: Number(cartItem?.finalPrice ?? 0), grandTotal: Number(cartItem?.grandTotal ?? 0), materialCost: Number(cartItem?.materialCost ?? 0), machineCost: Number(cartItem?.machineCost ?? 0), postProcessingCharges: Number(cartItem?.postProcessingCharges ?? 0) }),
      material_id: (cartItem?.material as string)?.trim() ?? '',
      config: {},
      model_metadata: redactSensitiveValues({ fileName: cartItem?.fileName ?? '', fileSize: 0, extension: (cartItem?.fileName as string)?.split('.').pop() ?? '', dimensions: cartItem?.dimensions ?? { x: 0, y: 0, z: 0 } }),
    }).select('id').maybeSingle()

    if (qvRow?.id) {
      await logQuoteEvent({
        quoteVersionId: qvRow.id, orderId: order.id, actorId: auth.user.id, actorRole: 'customer',
        eventType: 'created', previousStatus: null, newStatus: 'approved',
        note: `Cart order — item ${i + 1} of ${insertedOrders.length}`,
      })
    }
  }

  // Track coupon/offer redemptions
  const couponId = pricingData.couponId as string | null
  const couponDiscountType = pricingData.couponDiscountType as string | null
  const couponDiscountAmount = Number(pricingData.couponDiscountAmount ?? 0)
  const offerId = pricingData.offerId as string | null
  const offerDiscountType = pricingData.offerDiscountType as string | null
  const offerDiscountAmount = Number(pricingData.offerDiscountAmount ?? 0)
  const firstOrder = insertedOrders[0]
  const firstOrderNumber = formatOrderNumber(firstOrder.serial_number, firstOrder.created_at)

  // Re-validate coupon usage_per_user before recording redemption
  if (couponId) {
    const { data: couponRecord } = await adminSupabase
      .from('coupons')
      .select('usage_per_user')
      .eq('id', couponId)
      .maybeSingle()
    if (couponRecord?.usage_per_user != null) {
      const { count: couponUsage } = await supabase
        .from('redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('coupon_id', couponId)
        .eq('user_id', auth.user.id)
      if ((couponUsage ?? 0) >= Number(couponRecord.usage_per_user)) {
        throw new Error('You have already used this coupon the maximum number of times.')
      }
    }
  }

  // Re-validate offer usage_per_user before recording redemption
  if (offerId) {
    const { data: offerRecord } = await adminSupabase
      .from('offers')
      .select('usage_per_user')
      .eq('id', offerId)
      .maybeSingle()
    if (offerRecord?.usage_per_user != null) {
      const { count: offerUsage } = await supabase
        .from('redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('offer_id', offerId)
        .eq('user_id', auth.user.id)
      if ((offerUsage ?? 0) >= Number(offerRecord.usage_per_user)) {
        throw new Error('You have already used this offer the maximum number of times.')
      }
    }
  }

  if (couponId) {
    await adminSupabase.from('redemptions').insert({
      user_id: auth.user.id, order_id: firstOrderNumber, coupon_id: couponId,
      discount_type: couponDiscountType ?? 'percentage', discount_value: couponDiscountAmount,
      discount_applied: couponDiscountAmount, order_amount: afterCartTotal,
    })
    await adminSupabase.rpc('increment_coupon_used_count', { coupon_id: couponId })
  }

  if (offerId) {
    await adminSupabase.from('redemptions').insert({
      user_id: auth.user.id, order_id: firstOrderNumber, offer_id: offerId,
      discount_type: offerDiscountType ?? 'percentage', discount_value: offerDiscountAmount,
      discount_applied: offerDiscountAmount, order_amount: afterCouponTotal,
    })
    await adminSupabase.rpc('increment_offer_used_count', { offer_id: offerId })
  }

  const { data: attemptRow } = await adminSupabase
    .from('payment_attempts')
    .select('id')
    .eq('provider_order_id', params.razorpayOrderId)
    .maybeSingle()
  const paymentAttemptId = attemptRow?.id ?? capture.paymentAttemptId ?? ''

  await markQuoteCapturePaid({
    reference: capture.reference,
    razorpayOrderId: params.razorpayOrderId,
    paymentAttemptId,
    orderId: firstOrder.id,
  })

  const { error: cartConvertError } = await adminSupabase
    .from('cart_items')
    .update({ status: 'converted', converted_to_order_id: firstOrder.id })
    .eq('user_id', auth.user.id)
    .eq('cart_type', 'quote')
    .eq('status', 'active')

  if (cartConvertError) {
    reportError(cartConvertError, 'Failed to mark quote cart converted', { module: 'cart', level: 'warn' })
  }

  // Send payment confirmation email immediately
  notifyPaymentCaptured({
    id: paymentAttemptId,
    customer_id: auth.user.id,
    internal_order_type: 'custom_quote',
    internal_order_id: capture.reference,
    amount_paise: capture.amountPaise,
    payment_method: razorpayPayment.method ?? null,
    provider_payment_id: params.razorpayPaymentId,
  }).catch((error) => reportError(error, 'Payment captured notification failed', { module: 'email', level: 'warn', tags: { flow: 'cart_payment', orderId: firstOrder.id } }))

  const orderItemsEmail = itemsData.map((item: Record<string, unknown>) => ({
    name: String(item.fileName ?? ''),
    material: String(item.material ?? ''),
    color: String(item.color ?? ''),
    quantity: Math.max(1, Math.floor(Number(item.quantity ?? 1))),
    price: String(Number(item.grandTotal ?? item.finalPrice ?? item.price ?? 0)),
  }))
  const orderUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/my-orders/${firstOrder.id}`
  const adminOrderUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/admin/orders/${firstOrder.id}`
  sendOrderPlacedCustomer(auth.user.id, auth.profile.email, firstOrderNumber, auth.profile.name, String(capture.amountPaise / 100), orderItemsEmail, orderUrl).catch((error) => reportError(error, 'Cart payment customer email failed', { module: 'email', level: 'warn', tags: { flow: 'cart_payment', orderId: firstOrder.id } }))
  sendOrderPlacedAdmin('', firstOrderNumber, auth.profile.email, auth.profile.name, String(capture.amountPaise / 100), adminOrderUrl).catch((error) => reportError(error, 'Cart payment admin email failed', { module: 'email', level: 'warn', tags: { flow: 'cart_payment', orderId: firstOrder.id } }))

  // WhatsApp order-confirmation template (fires on paid; deduped per order).
  // Group payments cover multiple orders — the confirmation carries the group
  // total against the lead order number.
  notifyWhatsAppOrderConfirmed({
    orderId: firstOrder.id,
    orderNumber: firstOrderNumber,
    amountPaise: capture.amountPaise,
    orderTable: 'orders',
    userId: auth.user.id,
  }).catch((error) => reportError(error, 'Cart WhatsApp confirmation failed', { module: 'whatsapp', level: 'warn', tags: { flow: 'cart_payment', orderId: firstOrder.id } }))

  void trackFeatureUsage(auth.user.id, 'order_placed', {
    source: 'cart', groupId, orderId: firstOrder.id,
    itemCount: insertedOrders.length,
    unitCount: itemsData.reduce((sum, item) => sum + Math.max(1, Math.floor(Number(item.quantity ?? 1))), 0),
    couponCode: pricingData.couponCode as string | null,
    offerId, grandTotal: capture.amountPaise / 100,
  }).catch((error) => reportError(error, 'Cart payment feature tracking failed', { module: 'tracking', level: 'warn', tags: { flow: 'cart_payment', orderId: firstOrder.id } }))

  const { data: profilePhone } = await adminSupabase
    .from('profiles')
    .select('phone_number')
    .eq('id', auth.user.id)
    .maybeSingle()
  const contentIds = insertedOrders.map((o) => o.id)
  const contents = insertedOrders.map((o) => ({ id: o.id, quantity: 1, item_price: capture.amountPaise / 100 }))
  const purchaseEvent = buildPurchaseEvent({
    eventId: generateEventId(),
    eventSourceUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://flux3d.in'}/my-orders/${firstOrder.id}`,
    customerEmail: auth.profile.email,
    customerPhone: profilePhone?.phone_number,
    customerId: auth.user.id,
    contentIds,
    contents,
    value: capture.amountPaise / 100,
    currency: 'INR',
    orderId: firstOrderNumber,
    numItems: insertedOrders.length,
  })
  await sendCapiEvents([purchaseEvent], undefined).catch((err) => console.error('[Meta CAPI] Purchase event failed:', err))

  revalidatePath('/my-orders')
  revalidatePath('/cart')

  return {
    orderId: firstOrder.id,
    orderNumber: firstOrderNumber,
    itemCount: insertedOrders.length,
  }
}
