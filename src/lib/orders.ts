import type { PriceBreakdown } from '@/lib/quote/types'
import { FALLBACK_SETTINGS } from '@/lib/settings-fallback'
import { calculateDeliveryChargeFromSettings } from '@/lib/quote/pricing-waterfall'

export const orderStatuses = [
  'pending',
  'confirmed',
  'printing',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
] as const

export type OrderStatus = (typeof orderStatuses)[number]

export const orderProgressStatuses: Exclude<OrderStatus, 'cancelled'>[] = [
  'pending',
  'confirmed',
  'printing',
  'shipped',
  'delivered',
  'completed',
]

export function getNextOrderStatus(status: OrderStatus): OrderStatus | null {
  const currentIndex = orderProgressStatuses.indexOf(status as Exclude<OrderStatus, 'cancelled'>)
  if (currentIndex === -1) return null
  return orderProgressStatuses[currentIndex + 1] ?? null
}

export function canCancelOrderStatus(status: OrderStatus) {
  return status !== 'cancelled' && status !== 'completed'
}

export function isSequentialOrderStatusTransition(currentStatus: OrderStatus, nextStatus: OrderStatus) {
  if (currentStatus === nextStatus) return true
  if (nextStatus === 'cancelled') return canCancelOrderStatus(currentStatus)
  return getNextOrderStatus(currentStatus) === nextStatus
}

export function getAllowedOrderStatusTransitions(status: OrderStatus): OrderStatus[] {
  const nextStatus = getNextOrderStatus(status)
  return [
    status,
    ...(nextStatus ? [nextStatus] : []),
    ...(canCancelOrderStatus(status) ? ['cancelled' as const] : []),
  ]
}

export function getOrderStatusTransitionError(currentStatus: OrderStatus, nextStatus: OrderStatus) {
  const nextStatusLabel = getNextOrderStatus(currentStatus)
  if (nextStatus === 'cancelled' && !canCancelOrderStatus(currentStatus)) {
    return 'This order can no longer be cancelled.'
  }
  if (nextStatusLabel) {
    return `Move order status one step at a time. Next status is ${nextStatusLabel}.`
  }
  return 'This order status cannot be changed.'
}

export type CreateOrderInput = {
  fileUrl: string
  material: string
  color: string
  infill: number
  layerHeight: number
  quantity: number
  postProcessingLevel: 'none' | 'sanded' | 'sanded-painted'
  postProcessingCharges: number
  supports: boolean
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
  weight?: number
  difficultyFactor?: number
  fullName: string
  phone: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  pincode: string
  landmark?: string
  notes?: string
  priceBreakdown?: Pick<
    PriceBreakdown,
    | 'materialCost'
    | 'machineCost'
    | 'postProcessingCharges'
    | 'subtotal'
    | 'overheadPercentage'
    | 'overheadAmount'
    | 'marginPercentage'
    | 'marginAmount'
    | 'totalPrice'
    | 'cartDiscountAmount'
    | 'cartDiscountPercent'
    | 'finalPrice'
    | 'deliveryCharge'
    | 'grandTotal'
  >
}

export type AddressFields = {
  fullName: string
  phone: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  pincode: string
  landmark: string
}

export type AddressFieldErrors = Partial<Record<keyof AddressFields, string>>

export type SavedAddress = AddressFields & {
  id: string
  createdAt: string
  updatedAt: string
}

export type OrderDraft = {
  quoteId: string
  fileUrl: string
  material: string
  color: string
  infill: number
  layerHeight: number
  quantity: number
  postProcessingLevel: 'none' | 'sanded' | 'sanded-painted'
  postProcessingCharges: number
  supports: boolean
  materialCost: number
  machineCost: number
  subtotal: number
  overheadPercentage: number
  overheadAmount: number
  marginPercentage: number
  marginAmount: number
  totalPrice: number
  cartDiscountAmount: number
  cartDiscountPercent: number
  finalPrice: number
  deliveryCharge: number
  grandTotal: number
  price: number
  estimatedTime: number
  weight: number
  difficultyFactor: number
  priceBreakdown: Pick<
    PriceBreakdown,
    | 'materialCost'
    | 'machineCost'
    | 'postProcessingCharges'
    | 'subtotal'
    | 'overheadPercentage'
    | 'overheadAmount'
    | 'marginPercentage'
    | 'marginAmount'
    | 'totalPrice'
    | 'cartDiscountAmount'
    | 'cartDiscountPercent'
    | 'finalPrice'
    | 'deliveryCharge'
    | 'grandTotal'
  >
  notes: string
}

export const ORDER_DRAFT_STORAGE_KEY = 'flux3d-order-draft'

export type OrderConfirmation = {
  id: string
  orderNumber: string
  status: OrderStatus
  material: string
  color: string
  fullName: string
  phone: string
  addressLine1: string
  addressLine2: string | null
  city: string
  state: string
  pincode: string
  landmark: string | null
  deliveryCharge: number
  totalPrice: number
  finalPrice: number
  grandTotal: number
  infill: number
  layerHeight: number
  quantity: number
  postProcessingLevel: string
  supports: boolean
  materialCost?: number
  machineCost?: number
  subtotal?: number
  overheadPercentage?: number
  overheadAmount?: number
  marginPercentage?: number
  marginAmount?: number
  cartDiscountAmount?: number
  cartDiscountPercent?: number
  price: number
  estimatedTime: number
  notes: string | null
  createdAt: string
}

export function formatOrderNumber(serialNumber: number, createdAt: string) {
  const year = new Date(createdAt).getUTCFullYear()
  return `FLX-${year}-${String(serialNumber).padStart(3, '0')}`
}

export function getOrderStatusLabel(status: OrderStatus) {
  switch (status) {
    case 'pending':
      return 'Pending review'
    case 'confirmed':
      return 'Confirmed'
    case 'printing':
      return 'Printing'
    case 'shipped':
      return 'Shipped'
    case 'delivered':
      return 'Delivered'
    case 'completed':
      return 'Completed'
    case 'cancelled':
      return 'Cancelled'
    default:
      return status
  }
}

export function getOrderStatusClasses(status: OrderStatus) {
  switch (status) {
    case 'pending':
      return 'border-amber-400/20 bg-amber-400/10 text-amber-700'
    case 'confirmed':
      return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-700'
    case 'printing':
      return 'border-cyan-400/20 bg-cyan-400/10 text-cyan-700'
    case 'shipped':
      return 'border-violet-400/20 bg-violet-400/10 text-violet-700'
    case 'delivered':
      return 'border-sky-400/20 bg-sky-400/10 text-sky-700'
    case 'completed':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700'
    case 'cancelled':
      return 'border-slate-400/20 bg-slate-400/10 text-slate-700'
  }
}

export const initialAddressFields: AddressFields = {
  fullName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
  landmark: '',
}

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '')
}

export function calculateDeliveryCharge(
  price: number,
  settings: Pick<typeof FALLBACK_SETTINGS, 'deliveryChargeThreshold' | 'defaultDeliveryCharge'> = FALLBACK_SETTINGS
) {
  return calculateDeliveryChargeFromSettings(price, settings)
}

export function calculateOrderTotal(
  price: number,
  settings: Pick<typeof FALLBACK_SETTINGS, 'deliveryChargeThreshold' | 'defaultDeliveryCharge'> = FALLBACK_SETTINGS
) {
  const deliveryCharge = calculateDeliveryCharge(price, settings)

  return {
    deliveryCharge,
    totalPrice: price + deliveryCharge,
  }
}

export function validateAddressFields(address: AddressFields): AddressFieldErrors {
  const errors: AddressFieldErrors = {}
  const phone = normalizePhone(address.phone)

  if (!address.fullName.trim()) {
    errors.fullName = 'Full name is required.'
  }

  if (!phone) {
    errors.phone = 'Phone number is required.'
  } else if (phone.length !== 10) {
    errors.phone = 'Enter a valid 10-digit phone number.'
  }

  if (!address.addressLine1.trim()) {
    errors.addressLine1 = 'Address line 1 is required.'
  }

  if (!address.city.trim()) {
    errors.city = 'City is required.'
  }

  if (!address.state.trim()) {
    errors.state = 'State is required.'
  }

  if (!address.pincode.trim()) {
    errors.pincode = 'Pincode is required.'
  } else if (!/^\d{6}$/.test(address.pincode.trim())) {
    errors.pincode = 'Enter a valid 6-digit pincode.'
  }

  return errors
}

export function formatAddressSummary(address: Pick<
  AddressFields,
  'addressLine1' | 'addressLine2' | 'city' | 'state' | 'pincode' | 'landmark'
>) {
  const a1 = address.addressLine1?.trim() ?? ''
  const a2 = address.addressLine2?.trim() ?? ''
  const lm = address.landmark?.trim() ?? ''
  const city = address.city?.trim() ?? ''
  const state = address.state?.trim() ?? ''
  const pincode = address.pincode?.trim() ?? ''
  return [
    a1,
    a2,
    lm ? `Landmark: ${lm}` : '',
    [city, state, pincode].filter(Boolean).join(', '),
  ].filter(Boolean)
}

export function addressesEqual(left: AddressFields, right: AddressFields) {
  return (
    left.fullName.trim() === right.fullName.trim() &&
    normalizePhone(left.phone) === normalizePhone(right.phone) &&
    left.addressLine1.trim() === right.addressLine1.trim() &&
    left.addressLine2.trim() === right.addressLine2.trim() &&
    left.city.trim() === right.city.trim() &&
    left.state.trim() === right.state.trim() &&
    left.pincode.trim() === right.pincode.trim() &&
    left.landmark.trim() === right.landmark.trim()
  )
}
