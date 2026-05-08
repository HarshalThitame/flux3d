'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/server'
import {
  calculateOrderTotal,
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

function normalizeNumber(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid ${field}.`)
  }

  return value
}

export async function createOrderAction(input: CreateOrderInput): Promise<OrderConfirmation> {
  const auth = await requireUser('/instant-quote')
  const supabase = await createServerSupabaseClient()
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

  const basePrice = normalizeNumber(input.price, 'price')
  const { deliveryCharge, totalPrice } = calculateOrderTotal(basePrice)
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
      supports: input.supports,
      ...trimmedAddress,
      delivery_charge: deliveryCharge,
      total_price: totalPrice,
      price: basePrice,
      estimated_time: normalizeNumber(input.estimatedTime, 'estimated time'),
      status: 'pending',
      notes: input.notes?.trim() ? input.notes.trim() : null,
    })
    .select(
      'id, serial_number, material, color, infill, layer_height, quantity, post_processing_level, supports, full_name, phone, address_line1, address_line2, city, state, pincode, landmark, delivery_charge, total_price, price, estimated_time, status, notes, created_at'
    )
    .single()

  if (insertError) {
    if (isMissingSupabaseTableError(insertError, 'orders')) {
      throw new Error(ORDERS_TABLE_UNAVAILABLE_MESSAGE)
    }

    throw new Error(insertError.message)
  }

  const orderNumber = formatOrderNumber(insertedOrder.serial_number, insertedOrder.created_at)
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      order_number: orderNumber,
      updated_at: new Date().toISOString(),
    })
    .eq('id', insertedOrder.id)
    .eq('user_id', auth.user.id)

  if (updateError) {
    throw new Error(updateError.message)
  }

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
    totalPrice: Number(insertedOrder.total_price),
    infill: insertedOrder.infill,
    layerHeight: Number(insertedOrder.layer_height),
    quantity: insertedOrder.quantity,
    postProcessingLevel: insertedOrder.post_processing_level,
    supports: insertedOrder.supports,
    price: Number(insertedOrder.price),
    estimatedTime: Number(insertedOrder.estimated_time),
    notes: insertedOrder.notes,
    createdAt: insertedOrder.created_at,
  }
}
