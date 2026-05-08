'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/server'
import {
  calculateOrderTotal,
  formatOrderNumber,
  normalizePhone,
  validateAddressFields,
} from '@/lib/orders'
import {
  isMissingSupabaseTableError,
  ORDERS_TABLE_UNAVAILABLE_MESSAGE,
} from '@/lib/quote/supabase-errors'
import { normalizeOwnedStoragePath } from '@/lib/quote/storage-path'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type CartOrderItem = {
  quoteId: string
  fileUrl: string
  fileName: string
  material: string
  color: string
  quantity?: number
  infill: number
  layerHeight: number
  supports: boolean
  price: number
  estimatedTime: number
  weight: number
  dimensions: {
    x: number
    y: number
    z: number
  }
}

type CreateCartOrderInput = {
  items: CartOrderItem[]
  subtotal: number
  fullName: string
  phone: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  pincode: string
  landmark: string
}

function normalizeNumber(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid ${field}.`)
  }

  return value
}

export async function createCartOrderAction(input: CreateCartOrderInput): Promise<{
  orderId: string
  orderNumber: string
  itemCount: number
}> {
  const auth = await requireUser('/cart/delivery')
  const supabase = await createServerSupabaseClient()

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

  const subtotal = normalizeNumber(input.subtotal, 'subtotal')
  const { deliveryCharge } = calculateOrderTotal(subtotal)
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

  const groupId = crypto.randomUUID()

  const orderItems = input.items.map((item) => ({
    user_id: auth.user.id,
    group_id: groupId,
    file_url: normalizeOwnedStoragePath(item.fileUrl, auth.user.id),
    material: item.material.trim(),
    color: item.color.trim(),
    infill: Math.round(normalizeNumber(item.infill, 'infill')),
    layer_height: normalizeNumber(item.layerHeight, 'layer height'),
    supports: item.supports,
    ...trimmedAddress,
    delivery_charge: deliveryCharge / input.items.length,
    total_price: item.price + deliveryCharge / input.items.length,
    price: normalizeNumber(item.price, 'price'),
    estimated_time: normalizeNumber(item.estimatedTime, 'estimated time'),
    status: 'pending',
    notes: `Cart order - ${input.items.length} item(s), ${Math.max(1, Math.floor(item.quantity ?? 1))} pcs. File: ${item.fileName}`,
  }))

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

  for (const order of insertedOrders) {
    if (order.serial_number == null || !order.created_at) {
      throw new Error('Order submission returned incomplete confirmation details. Please try again.')
    }

    const orderNumber = formatOrderNumber(order.serial_number, order.created_at)
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        order_number: orderNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('user_id', auth.user.id)

    if (updateError) {
      throw new Error(updateError.message)
    }
  }

  revalidatePath('/my-orders')
  revalidatePath('/cart')

  return {
    orderId: insertedOrders[0].id,
    orderNumber: formatOrderNumber(insertedOrders[0].serial_number, insertedOrders[0].created_at),
    itemCount: input.items.reduce((sum, item) => sum + Math.max(1, Math.floor(item.quantity ?? 1)), 0),
  }
}
