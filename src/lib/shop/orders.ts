export const shopOrderStatuses = [
  'placed',
  'confirmed',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
  'return_requested',
  'returned',
] as const

export const shopPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'] as const

export type ShopOrderStatus = (typeof shopOrderStatuses)[number]
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
  shipping_address: ShopShippingAddress
  payment_method: string | null
  payment_status: ShopPaymentStatus
  payment_id: string | null
  order_status: ShopOrderStatus
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

export const SHOP_ORDER_PROGRESS: ShopOrderStatus[] = [
  'placed',
  'confirmed',
  'packed',
  'shipped',
  'delivered',
]

export function normalizeShopOrderMoney(value: unknown) {
  const next = Number(value)
  return Number.isFinite(next) ? next : 0
}

export function getShopOrderStatusLabel(status: ShopOrderStatus | string) {
  switch (status) {
    case 'placed':
      return 'Placed'
    case 'confirmed':
      return 'Confirmed'
    case 'packed':
      return 'Packed'
    case 'shipped':
      return 'Shipped'
    case 'delivered':
      return 'Delivered'
    case 'cancelled':
      return 'Cancelled'
    case 'return_requested':
      return 'Return Requested'
    case 'returned':
      return 'Returned'
    default:
      return String(status)
  }
}

export function getShopOrderStatusClasses(status: ShopOrderStatus | string) {
  switch (status) {
    case 'placed':
      return 'border-cyan-400/20 bg-cyan-400/10 text-cyan-700'
    case 'confirmed':
      return 'border-violet-400/20 bg-violet-400/10 text-violet-700'
    case 'packed':
      return 'border-amber-400/20 bg-amber-400/10 text-amber-700'
    case 'shipped':
      return 'border-sky-400/20 bg-sky-400/10 text-sky-700'
    case 'delivered':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700'
    case 'cancelled':
      return 'border-rose-400/20 bg-rose-400/10 text-rose-700'
    case 'return_requested':
      return 'border-orange-400/20 bg-orange-400/10 text-orange-700'
    case 'returned':
      return 'border-slate-400/20 bg-slate-400/10 text-slate-700'
    default:
      return 'border-gray-200 bg-gray-50 text-[#6F7192]'
  }
}

export function getShopPaymentStatusLabel(status: ShopPaymentStatus | string) {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'paid':
      return 'Paid'
    case 'failed':
      return 'Failed'
    case 'refunded':
      return 'Refunded'
    default:
      return String(status)
  }
}

export function getShopPaymentStatusClasses(status: ShopPaymentStatus | string) {
  switch (status) {
    case 'pending':
      return 'border-amber-400/20 bg-amber-400/10 text-amber-700'
    case 'paid':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700'
    case 'failed':
      return 'border-rose-400/20 bg-rose-400/10 text-rose-700'
    case 'refunded':
      return 'border-slate-400/20 bg-slate-400/10 text-slate-700'
    default:
      return 'border-gray-200 bg-gray-50 text-[#6F7192]'
  }
}

export function formatShopOrderDate(value: string | null | undefined) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatShopOrderDateTime(value: string | null | undefined) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function getShopOrderLineTotal(item: ShopOrderItem) {
  return normalizeShopOrderMoney(item.unitPrice) * normalizeShopOrderMoney(item.quantity)
}

export function isShopOrderCancellable(status: ShopOrderStatus | string) {
  return status === 'placed' || status === 'confirmed'
}

export function isShopOrderReturnable(status: ShopOrderStatus | string, placedAt: string | null | undefined) {
  if (status !== 'delivered' || !placedAt) return false
  const placedTime = new Date(placedAt).getTime()
  if (!Number.isFinite(placedTime)) return false
  return Date.now() - placedTime <= 7 * 24 * 60 * 60 * 1000
}

export function assertShopStatusTransition(current: ShopOrderStatus, next: ShopOrderStatus) {
  if (current === next) return
  if (next === 'cancelled') return

  const allowed: Partial<Record<ShopOrderStatus, ShopOrderStatus[]>> = {
    placed: ['confirmed'],
    confirmed: ['packed'],
    packed: ['shipped'],
    shipped: ['delivered'],
    delivered: ['returned'],
    return_requested: ['returned'],
  }

  if (!allowed[current]?.includes(next)) {
    throw new Error(`Cannot change order from ${getShopOrderStatusLabel(current)} to ${getShopOrderStatusLabel(next)}.`)
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
    shipping_address: {
      name: String(address.name ?? ''),
      phone: String(address.phone ?? ''),
      line1: String(address.line1 ?? ''),
      line2: address.line2 ? String(address.line2) : null,
      city: String(address.city ?? ''),
      state: String(address.state ?? ''),
      pincode: String(address.pincode ?? ''),
    },
    payment_method: row.payment_method ? String(row.payment_method) : null,
    payment_status: shopPaymentStatuses.includes(row.payment_status as ShopPaymentStatus)
      ? row.payment_status as ShopPaymentStatus
      : 'pending',
    payment_id: row.payment_id ? String(row.payment_id) : null,
    order_status: shopOrderStatuses.includes(row.order_status as ShopOrderStatus)
      ? row.order_status as ShopOrderStatus
      : 'placed',
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
