export const orderStatuses = [
  'pending',
  'reviewed',
  'approved',
  'queued',
  'on-hold',
  'printing',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'rejected',
] as const

export type OrderStatus = (typeof orderStatuses)[number]

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
  price: number
  estimatedTime: number
  fullName: string
  phone: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  pincode: string
  landmark?: string
  notes?: string
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
  price: number
  estimatedTime: number
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
  infill: number
  layerHeight: number
  quantity: number
  postProcessingLevel: string
  supports: boolean
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
    case 'reviewed':
      return 'Reviewed'
    case 'approved':
      return 'Approved'
    case 'queued':
      return 'Queued'
    case 'on-hold':
      return 'On hold'
    case 'printing':
      return 'Printing'
    case 'shipped':
      return 'Shipped'
    case 'completed':
      return 'Completed'
    case 'cancelled':
      return 'Cancelled'
    case 'rejected':
      return 'Rejected'
    default:
      return status
  }
}

export function getOrderStatusClasses(status: OrderStatus) {
  switch (status) {
    case 'pending':
      return 'border-amber-400/20 bg-amber-400/10 text-amber-700'
    case 'reviewed':
      return 'border-sky-400/20 bg-sky-400/10 text-sky-700'
    case 'approved':
      return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-700'
    case 'queued':
      return 'border-indigo-400/20 bg-indigo-400/10 text-indigo-700'
    case 'on-hold':
      return 'border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-700'
    case 'printing':
      return 'border-cyan-400/20 bg-cyan-400/10 text-cyan-700'
    case 'shipped':
      return 'border-violet-400/20 bg-violet-400/10 text-violet-700'
    case 'completed':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700'
    case 'cancelled':
      return 'border-slate-400/20 bg-slate-400/10 text-slate-700'
    case 'rejected':
      return 'border-rose-400/20 bg-rose-400/10 text-rose-700'
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

export function calculateDeliveryCharge(price: number) {
  return price < 499 ? 50 : 0
}

export function calculateOrderTotal(price: number) {
  const deliveryCharge = calculateDeliveryCharge(price)

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
