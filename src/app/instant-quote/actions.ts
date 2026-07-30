'use server'

import crypto from 'crypto'
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
import { roundMoney } from '@/lib/quote/pricing-waterfall'
import { trackFeatureUsage } from '@/lib/tracking/featureTracker'
import { logQuoteEvent } from '@/lib/quote/audit'
import { redactSensitiveValues } from '@/lib/security/redact'
import { rateLimitCheck } from '@/lib/rate-limit'
import { verifyModelVolume } from '@/lib/storage/verify-metadata'
import { sendOrderPlacedCustomer, sendOrderPlacedAdmin } from '@/lib/email/triggers'
import { sendCapiEvents, buildPurchaseEvent } from '@/lib/meta/conversions-api'
import { generateEventId } from '@/lib/meta/event-utils'
import {
  createQuoteCapture,
  getQuoteCapture,
  markQuoteCapturePaid,
  cancelQuoteCapture,
} from '@/lib/quote/capture'
import {
  createRazorpayOrder,
  getRazorpayConfig,
  makeCheckoutSession,
  makeReceipt,
  verifyRazorpayCheckoutSignature,
  fetchRazorpayPayment,
  getPublicRazorpayKeyId,
} from '@/lib/payments/razorpay'
import {
  upsertPaymentAttempt,
  insertPaymentAuditLog,
  updatePaymentAttempt,
} from '@/lib/payments/repository'
import { updatePaymentAttemptStatus } from '@/lib/payments/state'
import { notifyPaymentCaptured } from '@/lib/payments/email-triggers'
import { getSettings } from '@/lib/settings'
import { buildPublicBusinessProfile } from '@/lib/public-business'

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

  const volumeCheck = await verifyModelVolume(safeFileUrl, input.modelMetadata.volumeMm3)
  if (!volumeCheck.valid) {
    throw new Error(volumeCheck.error ?? 'Model volume verification failed.')
  }

  // Price locked at quote time — do not recalculate from raw inputs
  const breakdown = {
    postProcessingCharges: input.postProcessingCharges,
    materialCost: input.materialCost,
    machineCost: input.machineCost,
    subtotal: input.subtotal,
    cartDiscountAmount: input.cartDiscountAmount,
    cartDiscountPercent: input.cartDiscountPercent,
    overheadPercentage: input.overheadPercentage,
    overheadAmount: input.overheadAmount,
    marginPercentage: input.marginPercentage,
    marginAmount: input.marginAmount,
    totalPrice: input.totalPrice,
    finalPrice: input.finalPrice,
    deliveryCharge: input.deliveryCharge,
    grandTotal: input.grandTotal,
    pricePerUnit: roundMoney(input.totalPrice / normalizedQuantity),
    estimatedHours: input.estimatedTime,
    discount: 0,
  }

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
      difficulty_factor: input.difficultyFactor,
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
      status: 'pending',
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
  const { data: insertedQuoteVersion, error: quoteVersionError } = await adminSupabase
    .from('quote_versions')
    .insert({
      quote_id: `F3D-${orderNumber}`,
      order_id: insertedOrder.id,
      user_id: auth.user.id,
      version_number: 1,
      status: 'approved',
      snapshot_schema_version: 1,
      approved_at: new Date().toISOString(),
      approved_by: auth.user.id,
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
    .select('id')
    .maybeSingle()

  if (quoteVersionError) {
    console.error('[orders] Failed to create quote version:', quoteVersionError)
  } else if (insertedQuoteVersion?.id) {
    await logQuoteEvent({
      quoteVersionId: insertedQuoteVersion.id,
      orderId: insertedOrder.id,
      actorId: auth.user.id,
      actorRole: 'customer',
      eventType: 'created',
      previousStatus: null,
      newStatus: 'approved',
      note: `Order ${orderNumber} placed via instant quote`,
    })
  }

  void trackFeatureUsage(auth.user.id, 'order_placed', {
    source: 'instant_quote',
    orderId: insertedOrder.id,
    orderNumber,
    material: insertedOrder.material,
    quantity: insertedOrder.quantity,
    grandTotal: Number(insertedOrder.grand_total ?? breakdown.grandTotal),
  }).catch(() => {})

  const itemsEmail = [{
    name: input.fileUrl.split('/').pop() ?? 'Model',
    material: input.material,
    color: input.color,
    quantity: Math.max(1, Math.floor(normalizeNumber(input.quantity, 'quantity'))),
    price: String(Number(insertedOrder.grand_total ?? breakdown.grandTotal)),
  }]
  const orderUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/my-orders/${insertedOrder.id}`
  const adminOrderUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/admin/orders/${insertedOrder.id}`
  sendOrderPlacedCustomer(auth.user.id, auth.profile.email, orderNumber, auth.profile.name, String(Number(insertedOrder.grand_total ?? breakdown.grandTotal)), itemsEmail, orderUrl).catch(() => {})
  sendOrderPlacedAdmin('', orderNumber, auth.profile.email, auth.profile.name, String(Number(insertedOrder.grand_total ?? breakdown.grandTotal)), adminOrderUrl).catch(() => {})

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

export type PrepareQuotePaymentResult = {
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

export async function prepareQuotePaymentAction(
  input: CreateOrderInput
): Promise<PrepareQuotePaymentResult> {
  const auth = await requireUser('/instant-quote')
  const adminSupabase = createAdminSupabaseClient()
  const headersList = await headers()
  const forwarded = headersList.get('x-forwarded-for') ?? ''
  const clientIp = forwarded.split(',')[0]?.trim() || 'unknown'
  const rateLimit = await rateLimitCheck(
    `prepare_payment:${auth.user.id}:${clientIp}`,
    60,
    10,
  )
  if (!rateLimit.success) {
    throw new Error('Too many requests. Please wait a moment and try again.')
  }

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
  if (!input.fileUrl.trim()) throw new Error('Upload your model before placing an order.')
  if (!input.material.trim() || !input.color.trim()) throw new Error('Select a material and color before placing the order.')
  if (!input.modelMetadata || !input.modelMetadata.volumeMm3) throw new Error('Model metadata is missing.')

  const normalizedQuantity = Math.max(1, Math.floor(normalizeNumber(input.quantity, 'quantity')))
  const safeFileUrl = normalizeOwnedStoragePath(input.fileUrl, auth.user.id)
  const normalizedPhone = normalizePhone(input.phone)

  const volumeCheck = await verifyModelVolume(safeFileUrl, input.modelMetadata.volumeMm3)
  if (!volumeCheck.valid) throw new Error(volumeCheck.error ?? 'Model volume verification failed.')

  const grandTotal = input.grandTotal ?? input.finalPrice + input.deliveryCharge
  if (grandTotal <= 0) throw new Error('Order total must be greater than zero.')
  const amountPaise = Math.round(grandTotal * 100)

  const addressData = {
    fullName: input.fullName.trim(),
    phone: normalizedPhone,
    addressLine1: input.addressLine1.trim(),
    addressLine2: input.addressLine2?.trim() ?? '',
    city: input.city.trim(),
    state: input.state.trim(),
    pincode: input.pincode.trim(),
    landmark: input.landmark?.trim() ?? '',
  }

  const configData = {
    material: input.material.trim(),
    color: input.color.trim(),
    infill: input.infill,
    layerHeight: input.layerHeight,
    quantity: normalizedQuantity,
    postProcessingLevel: input.postProcessingLevel,
    supports: input.supports,
    notes: input.notes?.trim() ?? '',
  }

  const pricingData = {
    materialCost: input.materialCost,
    machineCost: input.machineCost,
    subtotal: input.subtotal,
    postProcessingCharges: input.postProcessingCharges,
    overheadPercentage: input.overheadPercentage,
    overheadAmount: input.overheadAmount,
    marginPercentage: input.marginPercentage,
    marginAmount: input.marginAmount,
    totalPrice: input.totalPrice,
    cartDiscountAmount: input.cartDiscountAmount,
    cartDiscountPercent: input.cartDiscountPercent,
    finalPrice: input.finalPrice,
    deliveryCharge: input.deliveryCharge,
    grandTotal,
    pricePerUnit: roundMoney(input.totalPrice / normalizedQuantity),
    estimatedHours: input.estimatedTime,
    discount: 0,
  }

  const draftData = {
    quoteId: input.quoteId,
    fileUrl: safeFileUrl,
    material: input.material.trim(),
    color: input.color.trim(),
    infill: input.infill,
    layerHeight: input.layerHeight,
    quantity: normalizedQuantity,
    postProcessingLevel: input.postProcessingLevel,
    supports: input.supports,
    notes: input.notes?.trim() ?? '',
    weight: input.weight,
    difficultyFactor: input.difficultyFactor,
  }

  const capture = await createQuoteCapture({
    userId: auth.user.id,
    amountPaise,
    draftData,
    addressData,
    configData,
    pricingData,
    modelMetadata: input.modelMetadata as unknown as Record<string, unknown>,
  })

  const razorpayConfig = getRazorpayConfig()
  if (!razorpayConfig) throw new Error('Payment gateway is not configured.')

  const settings = await getSettings()
  const businessProfile = buildPublicBusinessProfile(settings)
  const receipt = makeReceipt(capture.reference.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 10) || 'QC', 1)

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
    idempotency_key: `qc-${capture.reference}-${Date.now()}`,
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
        contact: normalizedPhone,
      },
    },
  })

  await updatePaymentAttemptStatus(
    paymentAttempt.id,
    paymentAttempt.status,
    'pending',
    {
      provider_order_id: providerOrder.id,
      metadata: {
        ...paymentAttempt.metadata,
        razorpay: providerOrder,
      },
    },
    {
      actorId: auth.user.id,
      actorRole: 'customer',
      reason: 'Payment attempt created for quote capture',
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
      contact: normalizedPhone,
    },
  }
}

export async function verifyQuotePaymentAndCreateOrder(params: {
  reference: string
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}): Promise<OrderConfirmation> {
  const auth = await requireUser('/instant-quote')

  const capture = await getQuoteCapture(params.reference)
  if (!capture) throw new Error('Quote capture not found.')
  if (capture.status !== 'pending') throw new Error('Quote capture is not in pending state.')
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

  const amountPaise = razorpayPayment.amount
  if (amountPaise !== capture.amountPaise) {
    throw new Error('Payment amount does not match the quote amount.')
  }

  const supabase = await createServerSupabaseClient()
  const adminSupabase = createAdminSupabaseClient()

  const draftData = capture.draftData as Record<string, unknown>
  const addressData = capture.addressData as Record<string, unknown>
  const configData = capture.configData as Record<string, unknown>
  const pricingData = capture.pricingData as Record<string, unknown>
  const modelMetadata = capture.modelMetadata as Record<string, unknown>

  const normalizedQuantity = Math.max(1, Math.floor(normalizeNumber(Number(configData.quantity || 1), 'quantity')))
  const trimmedAddress = {
    full_name: (addressData.fullName as string)?.trim() ?? '',
    phone: normalizePhone((addressData.phone as string) ?? ''),
    address_line1: (addressData.addressLine1 as string)?.trim() ?? '',
    address_line2: (addressData.addressLine2 as string)?.trim() || null,
    city: (addressData.city as string)?.trim() ?? '',
    state: (addressData.state as string)?.trim() ?? '',
    pincode: (addressData.pincode as string)?.trim() ?? '',
    landmark: (addressData.landmark as string)?.trim() || null,
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

  const { error: clearDefaultError } = await supabase
    .from('addresses')
    .update({ is_default: false })
    .eq('user_id', auth.user.id)
  if (clearDefaultError) console.error('[orders] Failed to clear defaults:', clearDefaultError)

  if (existingAddress) {
    await supabase.from('addresses').update(savedAddress).eq('id', existingAddress.id).eq('user_id', auth.user.id)
  } else {
    await supabase.from('addresses').insert({ user_id: auth.user.id, ...savedAddress })
  }

  const { data: insertedOrder, error: insertError } = await adminSupabase
    .from('orders')
    .insert({
      user_id: auth.user.id,
      file_url: (draftData.fileUrl as string) ?? '',
      material: (configData.material as string) ?? '',
      color: (configData.color as string) ?? '',
      infill: Math.round(normalizeNumber(Number(configData.infill || 0), 'infill')),
      layer_height: normalizeNumber(Number(configData.layerHeight || 0), 'layer height'),
      quantity: normalizedQuantity,
      post_processing_level: (configData.postProcessingLevel as string) ?? 'none',
      post_processing_charges: Number(pricingData.postProcessingCharges ?? 0),
      weight: Number((modelMetadata as Record<string, unknown>).fileSize ?? 0),
      difficulty_factor: Number(draftData.difficultyFactor ?? 1),
      supports: Boolean(configData.supports),
      material_cost: Number(pricingData.materialCost ?? 0),
      machine_cost: Number(pricingData.machineCost ?? 0),
      subtotal: Number(pricingData.subtotal ?? 0),
      cart_discount: Number(pricingData.cartDiscountAmount ?? 0),
      cart_discount_percent: Number(pricingData.cartDiscountPercent ?? 0),
      coupon_discount: 0,
      offer_discount: 0,
      coupon_code: null,
      coupon_id: null,
      offer_id: null,
      offer_name: null,
      discount_type: null,
      overhead_percent: Number(pricingData.overheadPercentage ?? 0),
      overhead_amount: Number(pricingData.overheadAmount ?? 0),
      margin_percent: Number(pricingData.marginPercentage ?? 0),
      margin_amount: Number(pricingData.marginAmount ?? 0),
      total_price: Number(pricingData.totalPrice ?? 0),
      final_price: Number(pricingData.finalPrice ?? 0),
      delivery_charge: Number(pricingData.deliveryCharge ?? 0),
      grand_total: Number(pricingData.grandTotal ?? 0),
      ...trimmedAddress,
      price: Number(pricingData.finalPrice ?? 0),
      price_per_unit: roundMoney(Number(pricingData.totalPrice ?? 0) / normalizedQuantity),
      estimated_time: Number(pricingData.estimatedHours ?? 0),
      status: 'confirmed',
      discount: Number(pricingData.discount ?? 0),
      notes: ((draftData.notes as string)?.trim() || null) as string | null,
      payment_status: 'paid',
      payment_provider: 'razorpay',
      payment_purpose: 'custom_quote_full_payment',
      provider_order_id: params.razorpayOrderId,
      provider_payment_id: params.razorpayPaymentId,
      payment_amount_paise: amountPaise,
      payment_currency: 'INR',
      payment_method: razorpayPayment.method ?? null,
      payment_verified_at: new Date().toISOString(),
      status_timestamps: { confirmed: new Date().toISOString() },
    })
    .select('id, serial_number, created_at, material, color, infill, layer_height, quantity, post_processing_level, supports, full_name, phone, address_line1, address_line2, city, state, pincode, landmark, material_cost, machine_cost, subtotal, post_processing_charges, weight, difficulty_factor, overhead_percent, overhead_amount, margin_percent, margin_amount, total_price, cart_discount_percent, cart_discount, final_price, delivery_charge, grand_total, price, estimated_time, status, notes, created_at')
    .single()

  if (insertError) {
    if (insertError.message.includes('quote_captures')) throw new Error('Order creation failed.')
    throw new Error(insertError.message)
  }

  const orderNumber = formatOrderNumber(insertedOrder.serial_number, insertedOrder.created_at)
  await adminSupabase.from('orders').update({ order_number: orderNumber, updated_at: new Date().toISOString() }).eq('id', insertedOrder.id)

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
    orderId: insertedOrder.id,
  })

  // Send payment confirmation email immediately
  notifyPaymentCaptured({
    id: paymentAttemptId,
    customer_id: auth.user.id,
    internal_order_type: 'custom_quote',
    internal_order_id: capture.reference,
    amount_paise: capture.amountPaise,
    payment_method: razorpayPayment.method ?? null,
    provider_payment_id: params.razorpayPaymentId,
  }).catch(() => {})

  const itemsEmail = [{
    name: (draftData.fileUrl as string)?.split('/').pop() ?? 'Model',
    material: (configData.material as string) ?? '',
    color: (configData.color as string) ?? '',
    quantity: Math.max(1, Math.floor(Number(configData.quantity || 1))),
    price: String(Number(pricingData.grandTotal ?? 0)),
  }]
  const orderUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/my-orders/${insertedOrder.id}`
  const adminOrderUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/admin/orders/${insertedOrder.id}`
  sendOrderPlacedCustomer(auth.user.id, auth.profile.email, orderNumber, auth.profile.name, String(Number(pricingData.grandTotal ?? 0)), itemsEmail, orderUrl).catch(() => {})
  sendOrderPlacedAdmin('', orderNumber, auth.profile.email, auth.profile.name, String(Number(pricingData.grandTotal ?? 0)), adminOrderUrl).catch(() => {})

  const fileName = (draftData.fileUrl as string)?.split('/').pop() || 'model.stl'
  await adminSupabase.from('model_files').upsert(
    {
      user_id: auth.user.id,
      file_name: fileName,
      file_url: draftData.fileUrl as string,
      material: configData.material as string,
      status: 'ordered',
      uploaded_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,file_url', ignoreDuplicates: false }
  )

  const { data: insertedQuoteVersion } = await adminSupabase
    .from('quote_versions')
    .insert({
      quote_id: `F3D-${orderNumber}`,
      order_id: insertedOrder.id,
      user_id: auth.user.id,
      version_number: 1,
      status: 'approved',
      snapshot_schema_version: 1,
      approved_at: new Date().toISOString(),
      approved_by: auth.user.id,
      pricing_snapshot: redactSensitiveValues(pricingData),
      material_id: configData.material as string,
      config: configData,
      model_metadata: redactSensitiveValues(modelMetadata),
    })
    .select('id')
    .maybeSingle()

  if (insertedQuoteVersion?.id) {
    await logQuoteEvent({
      quoteVersionId: insertedQuoteVersion.id,
      orderId: insertedOrder.id,
      actorId: auth.user.id,
      actorRole: 'customer',
      eventType: 'created',
      previousStatus: null,
      newStatus: 'approved',
      note: `Order ${orderNumber} created and paid via Razorpay`,
    })
  }

  void trackFeatureUsage(auth.user.id, 'order_placed', {
    source: 'instant_quote',
    orderId: insertedOrder.id,
    orderNumber,
    material: insertedOrder.material,
    quantity: insertedOrder.quantity,
    grandTotal: Number(insertedOrder.grand_total ?? 0),
  }).catch(() => {})

  const { data: profilePhone } = await adminSupabase
    .from('profiles')
    .select('phone_number')
    .eq('id', auth.user.id)
    .maybeSingle()
  const purchaseEvent = buildPurchaseEvent({
    eventId: generateEventId(),
    eventSourceUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://flux3d.in'}/my-orders/${insertedOrder.id}`,
    customerEmail: auth.profile.email,
    customerPhone: profilePhone?.phone_number,
    customerId: auth.user.id,
    contentIds: [insertedOrder.id],
    contents: [{ id: insertedOrder.id, quantity: insertedOrder.quantity, item_price: Number(insertedOrder.grand_total ?? 0) }],
    value: Number(insertedOrder.grand_total ?? 0),
    currency: 'INR',
    orderId: orderNumber,
    numItems: 1,
  })
  await sendCapiEvents([purchaseEvent], undefined).catch((err) => console.error('[Meta CAPI] Purchase event failed:', err))

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
    totalPrice: Number(insertedOrder.grand_total ?? 0),
    finalPrice: Number(insertedOrder.final_price ?? 0),
    grandTotal: Number(insertedOrder.grand_total ?? 0),
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
