export const shopOrderStatuses = [
  'placed',
  'confirmed',
  'cancelled',
  'return_requested',
  'returned',
] as const

export const shopFulfilmentStatuses = [
  'pending',
  'processing',
  'packing',
  'packed',
  'shipped',
  'delivering',
  'delivered',
] as const

export const shopPaymentStatuses = ['created', 'pending', 'authorized', 'captured', 'paid', 'failed', 'cancelled', 'partially_refunded', 'refunded', 'disputed'] as const

export type ShopOrderStatus = (typeof shopOrderStatuses)[number]
export type ShopFulfilmentStatus = (typeof shopFulfilmentStatuses)[number]
export type ShopPaymentStatus = (typeof shopPaymentStatuses)[number]

export type ShopOrderItem = {
  productId: string
  productName: string
  productThumbnail: string
  productSlug?: string | null
  skuId: string
  skuCode: string
  variantCombination: Record<string, string | boolean>
  variantLabel: string
  quantity: number
  unitPrice: number
  customizationText: string | null
}

export type ShopShippingAddress = {
  name: string
  phone: string
  line1: string
  line2: string | null
  city: string
  state: string
  pincode: string
}

export type ShopOrder = {
  id: string
  order_number: string
  user_id: string
  items: ShopOrderItem[]
  subtotal: number
  discount_amount: number
  coupon_code: string | null
  shipping_charge: number
  total_amount: number
  subtotal_paise: number
  discount_amount_paise: number
  shipping_charge_paise: number
  total_amount_paise: number
  shipping_address: ShopShippingAddress
  payment_provider: string | null
  payment_purpose: string | null
  payment_method: string | null
  payment_status: ShopPaymentStatus
  payment_id: string | null
  provider_order_id: string | null
  provider_payment_id: string | null
  payment_amount_paise: number
  payment_currency: string
  payment_snapshot: Record<string, unknown>
  payment_verified_at: string | null
  payment_failed_at: string | null
  payment_refund_status: string | null
  payment_refund_amount_paise: number
  order_status: ShopOrderStatus
  fulfilment_status: ShopFulfilmentStatus
  tracking_number: string | null
  courier_name: string | null
  tracking_url: string | null
  estimated_delivery: string | null
  order_source: string | null
  admin_notes?: string | null
  cancellation_reason: string | null
  placed_at: string
  updated_at: string | null
}

export type ShopOrderCustomer = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
}

export type ShopAdminOrder = ShopOrder & {
  customer: ShopOrderCustomer | null
}

export const SHOP_FULFILMENT_PROGRESS: ShopFulfilmentStatus[] = [
  'pending', 'processing', 'packing', 'packed', 'shipped', 'delivering', 'delivered',
]

export function normalizeShopOrderMoney(value: unknown) {
  const next = Number(value)
  return Number.isFinite(next) ? next : 0
}

export function getShopOrderStatusLabel(status: ShopOrderStatus | string) {
  switch (status) {
    case 'placed': return 'Placed'
    case 'confirmed': return 'Confirmed'
    case 'cancelled': return 'Cancelled'
    case 'return_requested': return 'Return Requested'
    case 'returned': return 'Returned'
    default: return String(status)
  }
}

export function getShopFulfilmentStatusLabel(status: ShopFulfilmentStatus | string) {
  switch (status) {
    case 'pending': return 'Pending'
    case 'processing': return 'Processing'
    case 'packing': return 'Packing'
    case 'packed': return 'Packed'
    case 'shipped': return 'Shipped'
    case 'delivering': return 'Out for Delivery'
    case 'delivered': return 'Delivered'
    default: return String(status)
  }
}

export function getShopOrderStatusClasses(status: ShopOrderStatus | string) {
  switch (status) {
    case 'placed': return 'border-cyan-400/20 bg-cyan-400/10 text-cyan-700'
    case 'confirmed': return 'border-violet-400/20 bg-violet-400/10 text-violet-700'
    case 'cancelled': return 'border-rose-400/20 bg-rose-400/10 text-rose-700'
    case 'return_requested': return 'border-orange-400/20 bg-orange-400/10 text-orange-700'
    case 'returned': return 'border-slate-400/20 bg-slate-400/10 text-slate-700'
    default: return 'border-gray-200 bg-gray-50 text-[#6F7192]'
  }
}

export function getShopFulfilmentStatusClasses(status: ShopFulfilmentStatus | string) {
  switch (status) {
    case 'pending': return 'border-cyan-400/20 bg-cyan-400/10 text-cyan-700'
    case 'processing': return 'border-violet-400/20 bg-violet-400/10 text-violet-700'
    case 'packing': return 'border-amber-400/20 bg-amber-400/10 text-amber-700'
    case 'packed': return 'border-amber-500/20 bg-amber-500/10 text-amber-700'
    case 'shipped': return 'border-sky-400/20 bg-sky-400/10 text-sky-700'
    case 'delivering': return 'border-blue-400/20 bg-blue-400/10 text-blue-700'
    case 'delivered': return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700'
    default: return 'border-gray-200 bg-gray-50 text-[#6F7192]'
  }
}

export function getShopPaymentStatusLabel(status: ShopPaymentStatus | string) {
  switch (status) {
    case 'created': return 'Created'
    case 'pending': return 'Pending'
    case 'authorized': return 'Authorized'
    case 'captured': return 'Captured'
    case 'paid': return 'Paid'
    case 'failed': return 'Failed'
    case 'cancelled': return 'Cancelled'
    case 'partially_refunded': return 'Partially Refunded'
    case 'refunded': return 'Refunded'
    case 'disputed': return 'Disputed'
    default: return String(status)
  }
}

export function getShopPaymentStatusClasses(status: ShopPaymentStatus | string) {
  switch (status) {
    case 'created': return 'border-slate-400/20 bg-slate-400/10 text-slate-700'
    case 'pending': return 'border-amber-400/20 bg-amber-400/10 text-amber-700'
    case 'authorized': return 'border-blue-400/20 bg-blue-400/10 text-blue-700'
    case 'captured': return 'border-cyan-500/20 bg-cyan-500/10 text-cyan-700'
    case 'paid': return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700'
    case 'failed': return 'border-rose-400/20 bg-rose-400/10 text-rose-700'
    case 'cancelled': return 'border-slate-400/20 bg-slate-400/10 text-slate-700'
    case 'partially_refunded': return 'border-orange-400/20 bg-orange-400/10 text-orange-700'
    case 'refunded': return 'border-slate-400/20 bg-slate-400/10 text-slate-700'
    case 'disputed': return 'border-violet-400/20 bg-violet-400/10 text-violet-700'
    default: return 'border-gray-200 bg-gray-50 text-[#6F7192]'
  }
}

export function getShopPaymentProviderLabel(provider: string | null | undefined) {
  const normalized = provider?.trim().toLowerCase()
  if (!normalized) return 'Not set'
  if (normalized === 'razorpay') return 'Razorpay'
  if (normalized === 'payu') return 'PayU'
  return provider
}

export function formatShopOrderDate(value: string | null | undefined) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(value))
}

export function formatShopOrderDateTime(value: string | null | undefined) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(new Date(value))
}

export function getShopOrderLineTotal(item: ShopOrderItem) {
  return normalizeShopOrderMoney(item.unitPrice) * normalizeShopOrderMoney(item.quantity)
}

export function isShopOrderCancellable(status: ShopOrderStatus | string) {
  return status === 'placed' || status === 'confirmed'
}

export function isShopOrderReturnable(fulfilmentStatus: ShopFulfilmentStatus | string, placedAt: string | null | undefined) {
  if (fulfilmentStatus !== 'delivered' || !placedAt) return false
  const placedTime = new Date(placedAt).getTime()
  if (!Number.isFinite(placedTime)) return false
  return Date.now() - placedTime <= 7 * 24 * 60 * 60 * 1000
}

export function assertShopStatusTransition(current: ShopOrderStatus, next: ShopOrderStatus) {
  if (current === next) return
  if (next === 'cancelled') return

  const allowed: Partial<Record<ShopOrderStatus, ShopOrderStatus[]>> = {
    placed: ['confirmed'],
    confirmed: [],
    return_requested: ['returned'],
  }

  if (!allowed[current]?.includes(next)) {
    throw new Error(`Cannot change order from ${getShopOrderStatusLabel(current)} to ${getShopOrderStatusLabel(next)}.`)
  }
}

export function assertFulfilmentStatusTransition(current: ShopFulfilmentStatus, next: ShopFulfilmentStatus) {
  if (current === next) return
  const allowed: Partial<Record<ShopFulfilmentStatus, ShopFulfilmentStatus[]>> = {
    pending: ['processing'],
    processing: ['packing'],
    packing: ['packed'],
    packed: ['shipped'],
    shipped: ['delivering'],
    delivering: ['delivered'],
  }
  if (!allowed[current]?.includes(next)) {
    throw new Error(`Cannot change fulfilment from ${getShopFulfilmentStatusLabel(current)} to ${getShopFulfilmentStatusLabel(next)}.`)
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

export function mapShopOrderRow(row: Record<string, unknown>): ShopOrder {
  const address = asRecord(row.shipping_address)

  return {
    id: String(row.id),
    order_number: String(row.order_number),
    user_id: String(row.user_id),
    items: Array.isArray(row.items) ? row.items as ShopOrderItem[] : [],
    subtotal: normalizeShopOrderMoney(row.subtotal),
    discount_amount: normalizeShopOrderMoney(row.discount_amount),
    coupon_code: row.coupon_code ? String(row.coupon_code) : null,
    shipping_charge: normalizeShopOrderMoney(row.shipping_charge),
    total_amount: normalizeShopOrderMoney(row.total_amount),
    subtotal_paise: normalizeShopOrderMoney(row.subtotal_paise),
    discount_amount_paise: normalizeShopOrderMoney(row.discount_amount_paise),
    shipping_charge_paise: normalizeShopOrderMoney(row.shipping_charge_paise),
    total_amount_paise: normalizeShopOrderMoney(row.total_amount_paise),
    shipping_address: {
      name: String(address.name ?? ''),
      phone: String(address.phone ?? ''),
      line1: String(address.line1 ?? ''),
      line2: address.line2 ? String(address.line2) : null,
      city: String(address.city ?? ''),
      state: String(address.state ?? ''),
      pincode: String(address.pincode ?? ''),
    },
    payment_provider: row.payment_provider ? String(row.payment_provider) : null,
    payment_purpose: row.payment_purpose ? String(row.payment_purpose) : null,
    payment_method: row.payment_method ? String(row.payment_method) : null,
    payment_status: shopPaymentStatuses.includes(row.payment_status as ShopPaymentStatus)
      ? row.payment_status as ShopPaymentStatus
      : 'pending',
    payment_id: row.payment_id ? String(row.payment_id) : null,
    provider_order_id: row.provider_order_id ? String(row.provider_order_id) : null,
    provider_payment_id: row.provider_payment_id ? String(row.provider_payment_id) : null,
    payment_amount_paise: normalizeShopOrderMoney(row.payment_amount_paise),
    payment_currency: row.payment_currency ? String(row.payment_currency) : 'INR',
    payment_snapshot: asRecord(row.payment_snapshot),
    payment_verified_at: row.payment_verified_at ? String(row.payment_verified_at) : null,
    payment_failed_at: row.payment_failed_at ? String(row.payment_failed_at) : null,
    payment_refund_status: row.payment_refund_status ? String(row.payment_refund_status) : null,
    payment_refund_amount_paise: normalizeShopOrderMoney(row.payment_refund_amount_paise),
    order_status: shopOrderStatuses.includes(row.order_status as ShopOrderStatus)
      ? row.order_status as ShopOrderStatus
      : 'placed',
    fulfilment_status: shopFulfilmentStatuses.includes(row.fulfilment_status as ShopFulfilmentStatus)
      ? row.fulfilment_status as ShopFulfilmentStatus
      : 'pending',
    tracking_number: row.tracking_number ? String(row.tracking_number) : null,
    courier_name: row.courier_name ? String(row.courier_name) : null,
    tracking_url: row.tracking_url ? String(row.tracking_url) : null,
    estimated_delivery: row.estimated_delivery ? String(row.estimated_delivery) : null,
    order_source: row.order_source ? String(row.order_source) : null,
    admin_notes: row.admin_notes ? String(row.admin_notes) : null,
    cancellation_reason: row.cancellation_reason ? String(row.cancellation_reason) : null,
    placed_at: String(row.placed_at),
    updated_at: row.updated_at ? String(row.updated_at) : null,
  }
}

export function mapShopAdminOrder(row: Record<string, unknown>, customer: ShopOrderCustomer | null): ShopAdminOrder {
  return {
    ...mapShopOrderRow(row),
    customer,
  }
}
