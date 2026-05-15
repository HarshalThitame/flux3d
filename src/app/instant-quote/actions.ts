'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/server'
import {
  formatOrderNumber,
  normalizePhone,
  validateAddressFields,
  type CreateOrderInput,
  type OrderConfirmation,
} from '@/lib/orders'
import {
  isMissingSupabaseTableError,
  ORDERS_TABLE_UNAVAILABLE_MESSAGE,
} from '@/lib/quote/supabase-errors'
import { normalizeOwnedStoragePath } from '@/lib/quote/storage-path'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { getSettings } from '@/lib/settings'
import { calculatePricingWaterfall, roundMoney } from '@/lib/quote/pricing-waterfall'
import { trackFeatureUsage } from '@/lib/tracking/featureTracker'

function normalizeNumber(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid ${field}.`)
  }

  return value
}

export async function createOrderAction(input: CreateOrderInput): Promise<OrderConfirmation> {
  const auth = await requireUser('/instant-quote')
  const supabase = await createServerSupabaseClient()
  const adminSupabase = createAdminSupabaseClient()
  const settings = await getSettings()
  const addressErrors = validateAddressFields({
    fullName: input.fullName,
    phone: input.phone,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2 ?? '',
    city: input.city,
    state: input.state,
    pincode: input.pincode,
    landmark: input.landmark ?? '',
  })

  if (!input.fileUrl.trim()) {
    throw new Error('Upload your model before placing an order.')
  }

  if (!input.material.trim() || !input.color.trim()) {
    throw new Error('Select a material and color before placing an order.')
  }

  const normalizedQuantity = Math.max(1, Math.floor(normalizeNumber(input.quantity, 'quantity')))

  if (Object.keys(addressErrors).length > 0) {
    throw new Error('Complete the delivery address before placing the order.')
  }

  const breakdown = input.priceBreakdown
  const materialCost = normalizeNumber(
    breakdown?.materialCost ?? input.materialCost ?? 0,
    'material cost'
  )
  const machineCost = normalizeNumber(
    breakdown?.machineCost ?? input.machineCost ?? 0,
    'machine cost'
  )
  const postProcessingCharges = normalizeNumber(
    breakdown?.postProcessingCharges ?? input.postProcessingCharges ?? 0,
    'post processing charges'
  )
  const cartDiscountPercent = normalizeNumber(
    breakdown?.cartDiscountPercent ?? input.cartDiscountPercent ?? 0,
    'cart discount percent'
  )
  const providedOverheadPercent = Number(breakdown?.overheadPercentage ?? input.overheadPercentage ?? 0)
  const overheadPercentage = normalizeNumber(
    providedOverheadPercent > 0 ? providedOverheadPercent : settings.overheadPercentage,
    'overhead percent'
  )
  const providedMarginPercent = Number(breakdown?.marginPercentage ?? input.marginPercentage ?? 0)
  const marginPercentage = normalizeNumber(
    providedMarginPercent > 0 ? providedMarginPercent : settings.marginPercentage,
    'margin percent'
  )
  const waterfall = calculatePricingWaterfall({
    materialCost,
    machineCost,
    postProcessingCharges,
    quantity: normalizedQuantity,
    overheadPercent: overheadPercentage,
    marginPercent: marginPercentage,
    cartDiscountPercent,
    deliveryCharge: breakdown?.deliveryCharge ?? input.deliveryCharge ?? null,
    deliveryThreshold: settings.deliveryChargeThreshold,
    defaultDeliveryCharge: settings.defaultDeliveryCharge,
  })
  const subtotal = waterfall.subtotal
  const overheadAmount = waterfall.overheadAmount
  const marginAmount = waterfall.marginAmount
  const totalPrice = waterfall.priceBeforeDiscount
  const cartDiscountAmount = waterfall.cartDiscountAmount
  const finalPrice = waterfall.finalPrice
  const resolvedDeliveryCharge = waterfall.deliveryCharge
  const resolvedGrandTotal = waterfall.grandTotal
  const pricePerUnit = waterfall.pricePerUnit
  const weight = roundMoney(input.weight ?? 0)
  const difficultyFactor = normalizeNumber(input.difficultyFactor ?? 1, 'difficulty factor')
  const safeFileUrl = normalizeOwnedStoragePath(input.fileUrl, auth.user.id)
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

  const { data: existingAddress } = await supabase
    .from('delivery_addresses')
    .select('id')
    .eq('user_id', auth.user.id)
    .eq('full_name', trimmedAddress.full_name)
    .eq('phone', trimmedAddress.phone)
    .eq('address_line1', trimmedAddress.address_line1)
    .eq('city', trimmedAddress.city)
    .eq('state', trimmedAddress.state)
    .eq('pincode', trimmedAddress.pincode)
    .maybeSingle()

  if (existingAddress) {
    const { error: addressUpdateError } = await supabase
      .from('delivery_addresses')
      .update({
        ...trimmedAddress,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingAddress.id)
      .eq('user_id', auth.user.id)

    if (addressUpdateError) {
      console.error('[orders] Failed to update delivery address:', addressUpdateError)
    }
  } else {
    const { error: addressInsertError } = await supabase.from('delivery_addresses').insert({
      user_id: auth.user.id,
      ...trimmedAddress,
    })

    if (addressInsertError) {
      console.error('[orders] Failed to insert delivery address:', addressInsertError)
    }
  }

  const { data: insertedOrder, error: insertError } = await supabase
    .from('orders')
    .insert({
      user_id: auth.user.id,
      file_url: safeFileUrl,
      material: input.material.trim(),
      color: input.color.trim(),
      infill: Math.round(normalizeNumber(input.infill, 'infill')),
      layer_height: normalizeNumber(input.layerHeight, 'layer height'),
      quantity: normalizedQuantity,
      post_processing_level: input.postProcessingLevel,
      post_processing_charges: postProcessingCharges,
      weight,
      difficulty_factor: difficultyFactor,
      supports: input.supports,
      material_cost: materialCost,
      machine_cost: machineCost,
      subtotal,
      cart_discount: cartDiscountAmount,
      cart_discount_percent: cartDiscountPercent,
      coupon_discount: 0,
      offer_discount: 0,
      coupon_code: null,
      coupon_id: null,
      offer_id: null,
      offer_name: null,
      discount_type: null,
      overhead_percent: overheadPercentage,
      overhead_amount: overheadAmount,
      margin_percent: marginPercentage,
      margin_amount: marginAmount,
      total_price: totalPrice,
      final_price: finalPrice,
      delivery_charge: resolvedDeliveryCharge,
      grand_total: resolvedGrandTotal,
      ...trimmedAddress,
      price: finalPrice,
      price_per_unit: pricePerUnit,
      estimated_time: normalizeNumber(input.estimatedTime, 'estimated time'),
      status: 'pending',
      discount: waterfall.discount,
      notes: input.notes?.trim() ? input.notes.trim() : null,
    })
    .select(
      'id, serial_number, material, color, infill, layer_height, quantity, post_processing_level, supports, full_name, phone, address_line1, address_line2, city, state, pincode, landmark, material_cost, machine_cost, subtotal, post_processing_charges, weight, difficulty_factor, overhead_percent, overhead_amount, margin_percent, margin_amount, total_price, cart_discount_percent, cart_discount, coupon_discount, offer_discount, coupon_code, coupon_id, offer_id, offer_name, discount_type, final_price, delivery_charge, grand_total, price, estimated_time, status, notes, created_at'
    )
    .single()

  if (insertError) {
    if (isMissingSupabaseTableError(insertError, 'orders')) {
      throw new Error(ORDERS_TABLE_UNAVAILABLE_MESSAGE)
    }

    throw new Error(insertError.message)
  }

  const orderNumber = formatOrderNumber(insertedOrder.serial_number, insertedOrder.created_at)
  const { error: updateError } = await adminSupabase
    .from('orders')
    .update({
      order_number: orderNumber,
      updated_at: new Date().toISOString(),
    })
    .eq('id', insertedOrder.id)

  if (updateError) {
    throw new Error(updateError.message)
  }

  void trackFeatureUsage(auth.user.id, 'order_placed', {
    source: 'instant_quote',
    orderId: insertedOrder.id,
    orderNumber,
    material: insertedOrder.material,
    quantity: insertedOrder.quantity,
    grandTotal: Number(insertedOrder.grand_total ?? resolvedGrandTotal),
  }).catch(() => {})

  revalidatePath('/my-orders')
  revalidatePath(`/my-orders/${insertedOrder.id}`)
  revalidatePath('/profile')

  return {
    id: insertedOrder.id,
    orderNumber,
    status: insertedOrder.status,
    material: insertedOrder.material,
    color: insertedOrder.color,
    fullName: insertedOrder.full_name,
    phone: insertedOrder.phone,
    addressLine1: insertedOrder.address_line1,
    addressLine2: insertedOrder.address_line2,
    city: insertedOrder.city,
    state: insertedOrder.state,
    pincode: insertedOrder.pincode,
    landmark: insertedOrder.landmark,
    deliveryCharge: Number(insertedOrder.delivery_charge),
    totalPrice: Number(insertedOrder.grand_total ?? resolvedGrandTotal),
    finalPrice: Number(insertedOrder.final_price ?? 0),
    grandTotal: Number(insertedOrder.grand_total ?? resolvedGrandTotal),
    infill: insertedOrder.infill,
    layerHeight: Number(insertedOrder.layer_height),
    quantity: insertedOrder.quantity,
    postProcessingLevel: insertedOrder.post_processing_level,
    supports: insertedOrder.supports,
    materialCost: Number(insertedOrder.material_cost ?? 0),
    machineCost: Number(insertedOrder.machine_cost ?? 0),
    subtotal: Number(insertedOrder.subtotal ?? 0),
    price: Number(insertedOrder.price),
    estimatedTime: Number(insertedOrder.estimated_time),
    cartDiscountAmount: Number(insertedOrder.cart_discount ?? 0),
    cartDiscountPercent: Number(insertedOrder.cart_discount_percent ?? 0),
    overheadPercentage: Number(insertedOrder.overhead_percent ?? 0),
    overheadAmount: Number(insertedOrder.overhead_amount ?? 0),
    marginPercentage: Number(insertedOrder.margin_percent ?? 0),
    marginAmount: Number(insertedOrder.margin_amount ?? 0),
    notes: insertedOrder.notes,
    createdAt: insertedOrder.created_at,
  }
}
