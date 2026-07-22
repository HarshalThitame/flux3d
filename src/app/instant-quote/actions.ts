'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
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
import { calculateServerQuotePricing } from '@/lib/quote/server-pricing'
import { trackFeatureUsage } from '@/lib/tracking/featureTracker'
import { redactSensitiveValues } from '@/lib/security/redact'
import { rateLimitCheck } from '@/lib/rate-limit'

function normalizeNumber(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid ${field}.`)
  }

  return value
}

export async function createOrderAction(input: CreateOrderInput): Promise<OrderConfirmation> {
  const auth = await requireUser('/instant-quote')
  const headersList = await headers()
  const forwarded = headersList.get('x-forwarded-for') ?? ''
  const clientIp = forwarded.split(',')[0]?.trim() || 'unknown'
  const rateLimit = await rateLimitCheck(
    `instant_quote_create:${auth.user.id}:${clientIp}`,
    60,
    5,
  )
  if (!rateLimit.success) {
    throw new Error('Too many quote submissions. Please wait a moment and try again.')
  }
  const supabase = await createServerSupabaseClient()
  const adminSupabase = createAdminSupabaseClient()

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

  if (Object.keys(addressErrors).length > 0) {
    throw new Error('Complete the delivery address before placing the order.')
  }

  if (!input.fileUrl.trim()) {
    throw new Error('Upload your model before placing an order.')
  }

  if (!input.material.trim() || !input.color.trim()) {
    throw new Error('Select a material and color before placing the order.')
  }

  if (!input.modelMetadata || !input.modelMetadata.volumeMm3) {
    throw new Error('Model metadata is missing. Re-upload the model and try again.')
  }

  const normalizedQuantity = Math.max(1, Math.floor(normalizeNumber(input.quantity, 'quantity')))
  const safeFileUrl = normalizeOwnedStoragePath(input.fileUrl, auth.user.id)
  const normalizedPhone = normalizePhone(input.phone)

  const { breakdown, material } = await calculateServerQuotePricing(input.modelMetadata, {
    materialId: input.material,
    color: input.color,
    infill: Math.round(normalizeNumber(input.infill, 'infill')),
    layerHeight: normalizeNumber(input.layerHeight, 'layer height'),
    quantity: normalizedQuantity,
    postProcessingLevel: input.postProcessingLevel,
    supports: input.supports,
  })

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
      post_processing_charges: breakdown.postProcessingCharges,
      weight: input.modelMetadata.fileSize,
      difficulty_factor: material.difficultyFactor,
      supports: input.supports,
      material_cost: breakdown.materialCost,
      machine_cost: breakdown.machineCost,
      subtotal: breakdown.subtotal,
      cart_discount: breakdown.cartDiscountAmount,
      cart_discount_percent: breakdown.cartDiscountPercent,
      coupon_discount: 0,
      offer_discount: 0,
      coupon_code: null,
      coupon_id: null,
      offer_id: null,
      offer_name: null,
      discount_type: null,
      overhead_percent: breakdown.overheadPercentage,
      overhead_amount: breakdown.overheadAmount,
      margin_percent: breakdown.marginPercentage,
      margin_amount: breakdown.marginAmount,
      total_price: breakdown.totalPrice,
      final_price: breakdown.finalPrice,
      delivery_charge: breakdown.deliveryCharge,
      grand_total: breakdown.grandTotal,
      ...trimmedAddress,
      price: breakdown.finalPrice,
      price_per_unit: breakdown.pricePerUnit,
      estimated_time: breakdown.estimatedHours,
      status: 'pending_review',
      discount: breakdown.discount,
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

  // Track the file in model_files so it's not treated as orphaned
  const fileName = safeFileUrl.split('/').pop() || `${input.quoteId ?? 'model'}.stl`
  const { error: modelFileError } = await adminSupabase.from('model_files').upsert(
    {
      user_id: auth.user.id,
      file_name: fileName,
      file_url: safeFileUrl,
      material: input.material.trim(),
      status: 'ordered',
      uploaded_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,file_url', ignoreDuplicates: false }
  )

  if (modelFileError) {
    console.error('[orders] Failed to track model file:', modelFileError)
  }

  // Create a quote version snapshot for the approval workflow
  const { error: quoteVersionError } = await adminSupabase.from('quote_versions').insert({
    quote_id: `F3D-${orderNumber}`,
    order_id: insertedOrder.id,
    user_id: auth.user.id,
    version_number: 1,
    status: 'pending_review',
    pricing_snapshot: redactSensitiveValues(breakdown),
    material_id: input.material,
    config: {
      materialId: input.material,
      color: input.color,
      infill: input.infill,
      layerHeight: input.layerHeight,
      quantity: normalizedQuantity,
      postProcessingLevel: input.postProcessingLevel,
      supports: input.supports,
    },
    model_metadata: redactSensitiveValues(input.modelMetadata),
  })

  if (quoteVersionError) {
    console.error('[orders] Failed to create quote version:', quoteVersionError)
  }

  void trackFeatureUsage(auth.user.id, 'order_placed', {
    source: 'instant_quote',
    orderId: insertedOrder.id,
    orderNumber,
    material: insertedOrder.material,
    quantity: insertedOrder.quantity,
    grandTotal: Number(insertedOrder.grand_total ?? breakdown.grandTotal),
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
    totalPrice: Number(insertedOrder.grand_total ?? breakdown.grandTotal),
    finalPrice: Number(insertedOrder.final_price ?? 0),
    grandTotal: Number(insertedOrder.grand_total ?? breakdown.grandTotal),
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
