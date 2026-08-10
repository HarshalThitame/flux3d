import { createAdminSupabaseClient } from '@/lib/admin/server'
import { logAdminAction } from '@/lib/admin/auditLog'
import type { User } from '@supabase/supabase-js'
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import type {
  AdminFile,
  AdminCustomerFile,
  AdminCustomerInvoice,
  AdminCustomerOrder,
  AdminCustomerStatus,
  AdminMaterial,
  AdminOrder,
  AdminQuote,
  AdminUser,
  Coupon,
  DashboardMetric,
  DonutSlice,
  Offer,
  Redemption,
} from '@/lib/admin/types'
import {
  getOrderStatusTransitionError,
  isSequentialOrderStatusTransition,
  orderStatuses,
  type OrderStatus,
} from '@/lib/orders'

const QUOTE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_QUOTE_BUCKET ?? 'quote-models'

const MATERIAL_COLORS = [
  '#6d28d9',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
  '#6366f1',
  '#ec4899',
]
export const ADMIN_ORDER_SELECT =
  'id, user_id, group_id, order_number, file_url, material, color, infill, layer_height, quantity, price, price_per_unit, material_cost, machine_cost, subtotal, post_processing_charges, weight, difficulty_factor, total_price, final_price, grand_total, overhead_percent, overhead_amount, margin_percent, margin_amount, cart_discount, cart_discount_percent, coupon_discount, offer_discount, offer_name, coupon_code, coupon_id, discount_type, estimated_time, supports, post_processing_level, status, status_timestamps, cancel_requested, created_at, updated_at, notes, full_name, phone, address_line1, address_line2, city, state, pincode, landmark, delivery_charge, payment_provider, payment_status, provider_order_id, provider_payment_id, payment_method, payment_verified_at, payment_failed_at, payment_refund_status, payment_refund_amount_paise, payment_attempt_id, tracking_number, courier_name, tracking_url'

export class AdminOrderStatusTransitionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AdminOrderStatusTransitionError'
  }
}

type QueryResult<T> = {
  data: T[] | null
  error: { message: string } | null
  count?: number | null
}

type OrderStatusTimestamps = NonNullable<AdminOrder['statusTimestamps']>

function ensureNoError<T>(result: QueryResult<T>, label: string) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`)
  }
}

type StorageListItem = {
  id?: string | null
  name: string
  created_at?: string | null
  updated_at?: string | null
  metadata?: {
    size?: number
  } | null
}

export type OrderRow = {
  id: string | number
  user_id?: string | null
  order_number: string | null
  group_id: string | null
  file_url?: string | null
  material: string | null
  color?: string | null
  infill?: number | null
  layer_height?: number | null
  price?: number | string | null
  price_per_unit?: number | string | null
  material_cost?: number | string | null
  machine_cost?: number | string | null
  subtotal?: number | string | null
  total_price: number | string | null
  final_price?: number | string | null
  grand_total?: number | string | null
  quantity?: number | null
  estimated_time?: number | null
  supports?: boolean | null
  post_processing_level?: string | null
  post_processing_charges?: number | string | null
  weight?: number | string | null
  difficulty_factor?: number | string | null
  overhead_percent?: number | string | null
  overhead_amount?: number | string | null
  margin_percent?: number | string | null
  margin_amount?: number | string | null
  cart_discount?: number | string | null
  cart_discount_percent?: number | string | null
  coupon_discount?: number | string | null
  offer_discount?: number | string | null
  offer_name?: string | null
  coupon_code?: string | null
  coupon_id?: string | null
  discount_type?: string | null
  status: AdminOrder['status']
  status_timestamps?: Record<string, unknown> | null
  created_at: string | null
  updated_at?: string | null
  notes: string | null
  full_name: string | null
  phone?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  landmark?: string | null
  delivery_charge?: number | string | null
  cancel_requested?: boolean | null
  payment_provider?: string | null
  payment_status?: string | null
  provider_order_id?: string | null
  provider_payment_id?: string | null
  payment_method?: string | null
  payment_verified_at?: string | null
  payment_failed_at?: string | null
  payment_refund_status?: string | null
  payment_refund_amount_paise?: number | null
  payment_attempt_id?: string | null
}

type QuoteRow = {
  id: string | number
  quote_id: string | null
  name: string | null
  email: string | null
  config: AdminQuote['config']
  estimate: AdminQuote['estimate']
  created_at: string | null
}

type ProfileRow = {
  id: string
  name: string | null
  full_name?: string | null
  email: string | null
  is_admin?: boolean | null
  avatar_url?: string | null
  created_at: string | null
}

type CustomerOrderRow = {
  id: string
  user_id: string | null
  group_id: string | null
  order_number: string | null
  file_url: string | null
  material: string | null
  grand_total?: number | string | null
  final_price?: number | string | null
  total_price?: number | string | null
  status: OrderStatus
  full_name?: string | null
  phone?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  landmark?: string | null
  created_at: string | null
}

function normalizeMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount) ? amount : 0
}

const PAID_PAYMENT_STATES = ['paid', 'captured', 'refunded', 'partially_refunded']

function isEligiblePaidOrder(order: Pick<AdminOrder, 'status' | 'paymentStatus'>) {
  if (order.status === 'cancelled') return false
  return PAID_PAYMENT_STATES.includes(order.paymentStatus ?? '')
}

function calculateNetRevenue(orders: AdminOrder[]) {
  return orders.reduce((sum, row) => {
    if (!isEligiblePaidOrder(row)) return sum
    const refundedAmount = Number(row.paymentRefundAmountPaise ?? 0) / 100
    return sum + row.grandTotal - refundedAmount
  }, 0)
}

function calculateGrossCollected(orders: AdminOrder[]) {
  return orders.reduce((sum, row) => {
    if (!isEligiblePaidOrder(row)) return sum
    return sum + row.grandTotal
  }, 0)
}

function formatPercentChange(current: number, previous: number, label = 'prev 30d') {
  if (previous <= 0) {
    return current > 0 ? 'New' : 'No change'
  }
  const change = Math.round(((current - previous) / previous) * 100)
  return `${change > 0 ? '+' : ''}${change}% vs ${label}`
}

function changeTone(current: number, previous: number): DashboardMetric['tone'] {
  if (previous <= 0) return 'positive'
  return current >= previous ? 'positive' : 'warning'
}

function isOrderStatus(value: string): value is OrderStatus {
  return orderStatuses.includes(value as OrderStatus)
}

function normalizeStatusTimestampValue(value: unknown) {
  if (typeof value !== 'string') return null
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString()
}

function mergeStatusTimestamps(
  current: OrderStatusTimestamps | undefined,
  next: OrderStatusTimestamps | undefined
) {
  const merged: OrderStatusTimestamps = { ...(current ?? {}) }

  Object.entries(next ?? {}).forEach(([status, timestamp]) => {
    if (!isOrderStatus(status) || !timestamp) return
    const existingTime = new Date(merged[status] ?? '').getTime()
    const nextTime = new Date(timestamp).getTime()

    if (Number.isNaN(existingTime) || (!Number.isNaN(nextTime) && nextTime < existingTime)) {
      merged[status] = timestamp
    }
  })

  return merged
}

function normalizeOrderStatusTimestamps(row: Pick<OrderRow, 'status_timestamps' | 'created_at'>) {
  const timestamps: OrderStatusTimestamps = {}
  const rawTimestamps = row.status_timestamps

  if (rawTimestamps && typeof rawTimestamps === 'object' && !Array.isArray(rawTimestamps)) {
    Object.entries(rawTimestamps).forEach(([status, value]) => {
      if (!isOrderStatus(status)) return
      const normalizedValue = normalizeStatusTimestampValue(value)
      if (normalizedValue) {
        timestamps[status] = normalizedValue
      }
    })
  }

  const createdAt = normalizeStatusTimestampValue(row.created_at)
  if (createdAt) {
    timestamps.pending = timestamps.pending ?? createdAt
  }

  return timestamps
}

function buildNextStatusTimestamps(rows: OrderRow[], status: OrderStatus, timestamp: string) {
  const merged = rows.reduce<OrderStatusTimestamps>(
    (acc, row) => mergeStatusTimestamps(acc, normalizeOrderStatusTimestamps(row)),
    {}
  )

  merged[status] = timestamp
  return merged
}

function resolveFinalPrice(row: Pick<OrderRow, 'final_price' | 'total_price' | 'cart_discount'>) {
  const totalAfterCartDiscount = normalizeMoney(row.total_price) - normalizeMoney(row.cart_discount)
  return normalizeMoney(row.final_price ?? totalAfterCartDiscount)
}

function resolveGrandTotal(row: Pick<OrderRow, 'grand_total' | 'final_price' | 'total_price' | 'delivery_charge' | 'cart_discount'>) {
  return normalizeMoney(row.grand_total ?? (resolveFinalPrice(row) + normalizeMoney(row.delivery_charge)))
}

export function groupAdminOrders(rows: OrderRow[]): AdminOrder[] {
  const grouped = rows.reduce<Map<string, AdminOrder>>((acc, row) => {
    const groupId = row.group_id ?? String(row.id)
    const existing = acc.get(groupId)

    if (existing) {
      existing.items.push({
        id: String(row.id),
        fileName: row.file_url?.split('/').pop() ?? '',
        fileUrl: row.file_url ?? null,
        material: row.material ?? 'Unknown material',
        color: row.color ?? '',
        infill: row.infill ?? 20,
        layerHeight: row.layer_height ?? 0.2,
        price: normalizeMoney(row.price),
        pricePerUnit: normalizeMoney(row.price_per_unit),
        estimatedTime: row.estimated_time ?? 0,
        quantity: row.quantity ?? 1,
        supports: row.supports ?? false,
        postProcessingLevel: row.post_processing_level ?? null,
        postProcessingCharges: normalizeMoney(row.post_processing_charges),
        weight: normalizeMoney(row.weight),
        difficultyFactor: normalizeMoney(row.difficulty_factor),
        materialCost: normalizeMoney(row.material_cost),
        machineCost: normalizeMoney(row.machine_cost),
        subtotal: normalizeMoney(row.subtotal ?? row.price),
        overheadPercentage: normalizeMoney(row.overhead_percent),
        overheadAmount: normalizeMoney(row.overhead_amount),
        marginPercentage: normalizeMoney(row.margin_percent),
        marginAmount: normalizeMoney(row.margin_amount),
        totalPriceBeforeDiscount: normalizeMoney(row.total_price),
        cartDiscountAmount: normalizeMoney(row.cart_discount),
        cartDiscountPercent: normalizeMoney(row.cart_discount_percent),
        couponDiscountAmount: normalizeMoney(row.coupon_discount),
        offerDiscountAmount: normalizeMoney(row.offer_discount),
        offerName: row.offer_name ?? null,
        finalPrice: resolveFinalPrice(row),
        deliveryCharge: normalizeMoney(row.delivery_charge),
        grandTotal: resolveGrandTotal(row),
        status: row.status,
        cancelRequested: Boolean(row.cancel_requested),
      })
      existing.cancelRequested = existing.cancelRequested || Boolean(row.cancel_requested)
      existing.userId = existing.userId ?? row.user_id ?? null
      existing.statusTimestamps = mergeStatusTimestamps(
        existing.statusTimestamps,
        normalizeOrderStatusTimestamps(row)
      )
      if (row.updated_at && (!existing.updatedAt || new Date(row.updated_at).getTime() > new Date(existing.updatedAt).getTime())) {
        existing.updatedAt = row.updated_at
      }
      existing.totalPriceBeforeDiscount += normalizeMoney(row.total_price)
      existing.totalPrice += resolveFinalPrice(row)
      existing.finalPrice += resolveFinalPrice(row)
      existing.grandTotal += resolveGrandTotal(row)
      existing.deliveryCharge += normalizeMoney(row.delivery_charge)
      existing.materialCost += normalizeMoney(row.material_cost)
      existing.machineCost += normalizeMoney(row.machine_cost)
      existing.subtotal += normalizeMoney(row.subtotal ?? row.price)
      existing.overheadAmount += normalizeMoney(row.overhead_amount)
      existing.marginAmount += normalizeMoney(row.margin_amount)
      existing.cartDiscountAmount += normalizeMoney(row.cart_discount)
      existing.couponDiscountAmount += normalizeMoney(row.coupon_discount)
      existing.offerDiscountAmount += normalizeMoney(row.offer_discount)
      existing.discountAmount = normalizeMoney(existing.discountAmount) + normalizeMoney(row.cart_discount) + normalizeMoney(row.coupon_discount) + normalizeMoney(row.offer_discount)
      existing.couponCode = existing.couponCode ?? row.coupon_code ?? null
      existing.offerName = existing.offerName ?? row.offer_name ?? null
      existing.discountType = existing.discountType ?? row.discount_type ?? null
      existing.itemCount += 1
    } else {
      acc.set(groupId, {
        id: String(row.id),
        groupId,
        userId: row.user_id ?? null,
        orderNumber: row.order_number ?? String(row.id),
        fileUrl: row.file_url ?? undefined,
        fullName: row.full_name ?? 'Unknown customer',
        phone: row.phone ?? undefined,
        addressLine1: row.address_line1 ?? undefined,
        addressLine2: row.address_line2 ?? undefined,
        city: row.city ?? undefined,
        state: row.state ?? undefined,
        pincode: row.pincode ?? undefined,
        landmark: row.landmark ?? undefined,
        deliveryCharge: normalizeMoney(row.delivery_charge),
        totalPrice: resolveFinalPrice(row),
        totalPriceBeforeDiscount: normalizeMoney(row.total_price),
        finalPrice: resolveFinalPrice(row),
        grandTotal: resolveGrandTotal(row),
        materialCost: normalizeMoney(row.material_cost),
        machineCost: normalizeMoney(row.machine_cost),
        subtotal: normalizeMoney(row.subtotal ?? row.price),
        overheadPercentage: normalizeMoney(row.overhead_percent),
        overheadAmount: normalizeMoney(row.overhead_amount),
        marginPercentage: normalizeMoney(row.margin_percent),
        marginAmount: normalizeMoney(row.margin_amount),
        cartDiscountAmount: normalizeMoney(row.cart_discount),
        cartDiscountPercent: normalizeMoney(row.cart_discount_percent),
        couponDiscountAmount: normalizeMoney(row.coupon_discount),
        offerDiscountAmount: normalizeMoney(row.offer_discount),
        discountAmount: normalizeMoney(row.cart_discount) + normalizeMoney(row.coupon_discount) + normalizeMoney(row.offer_discount),
        couponCode: row.coupon_code ?? null,
        offerName: row.offer_name ?? null,
        discountType: row.discount_type ?? null,
        discountSource: row.offer_name ? 'offer' : row.coupon_code ? 'coupon' : normalizeMoney(row.cart_discount) > 0 ? 'order' : null,
        material: row.material ?? 'Unknown material',
        color: row.color ?? '',
        status: row.status,
        paymentProvider: row.payment_provider ?? undefined,
        paymentStatus: row.payment_status ?? undefined,
        providerOrderId: row.provider_order_id ?? undefined,
        providerPaymentId: row.provider_payment_id ?? undefined,
        paymentMethod: row.payment_method ?? undefined,
        paymentVerifiedAt: row.payment_verified_at ?? undefined,
        paymentFailedAt: row.payment_failed_at ?? undefined,
        paymentRefundStatus: row.payment_refund_status ?? undefined,
        paymentRefundAmountPaise: row.payment_refund_amount_paise ?? undefined,
        paymentAttemptId: row.payment_attempt_id ?? undefined,
        statusTimestamps: normalizeOrderStatusTimestamps(row),
        cancelRequested: Boolean(row.cancel_requested),
        createdAt: row.created_at ?? '',
        updatedAt: row.updated_at ?? row.created_at ?? '',
        notes: row.notes,
        itemCount: 1,
        items: [{
          id: String(row.id),
          fileName: row.file_url?.split('/').pop() ?? '',
          fileUrl: row.file_url ?? null,
          material: row.material ?? 'Unknown material',
          color: row.color ?? '',
          infill: row.infill ?? 20,
          layerHeight: row.layer_height ?? 0.2,
          price: normalizeMoney(row.price),
          pricePerUnit: normalizeMoney(row.price_per_unit),
          estimatedTime: row.estimated_time ?? 0,
          quantity: row.quantity ?? 1,
          supports: row.supports ?? false,
          postProcessingLevel: row.post_processing_level ?? null,
          postProcessingCharges: normalizeMoney(row.post_processing_charges),
          weight: normalizeMoney(row.weight),
          difficultyFactor: normalizeMoney(row.difficulty_factor),
          materialCost: normalizeMoney(row.material_cost),
          machineCost: normalizeMoney(row.machine_cost),
          subtotal: normalizeMoney(row.subtotal ?? row.price),
          overheadPercentage: normalizeMoney(row.overhead_percent),
          overheadAmount: normalizeMoney(row.overhead_amount),
          marginPercentage: normalizeMoney(row.margin_percent),
          marginAmount: normalizeMoney(row.margin_amount),
          totalPriceBeforeDiscount: normalizeMoney(row.total_price),
          cartDiscountAmount: normalizeMoney(row.cart_discount),
          cartDiscountPercent: normalizeMoney(row.cart_discount_percent),
          couponDiscountAmount: normalizeMoney(row.coupon_discount),
          offerDiscountAmount: normalizeMoney(row.offer_discount),
          offerName: row.offer_name ?? null,
          finalPrice: resolveFinalPrice(row),
          deliveryCharge: normalizeMoney(row.delivery_charge),
          grandTotal: resolveGrandTotal(row),
          status: row.status,
          cancelRequested: Boolean(row.cancel_requested),
        }],
      })
    }

    return acc
  }, new Map())

  return Array.from(grouped.values()).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

function mapQuoteRowToAdminQuote(quote: QuoteRow): AdminQuote {
  return {
    id: String(quote.id),
    quote_id: quote.quote_id,
    name: quote.name ?? 'Unknown customer',
    email: quote.email ?? '',
    config: quote.config,
    estimate: quote.estimate,
    status: 'pending',
    createdAt: quote.created_at ?? '',
  }
}

function mapProfileRowToAdminUser(profile: ProfileRow): AdminUser {
  return {
    id: profile.id,
    name: profile.full_name ?? profile.name ?? (profile.email?.split('@')[0] ?? 'Flux3D User'),
    email: profile.email ?? '',
    signupMethod: 'Email',
    role: profile.is_admin ? 'admin' : 'customer-success',
    lastActive: profile.created_at ? new Date(profile.created_at).toLocaleString('en-IN') : 'Never',
  }
}

function getCustomerStatus(user: User): AdminCustomerStatus {
  if (user.banned_until && new Date(user.banned_until).getTime() > Date.now()) {
    return 'Suspended'
  }

  if (!user.email_confirmed_at) {
    return 'Unverified'
  }

  return 'Active'
}

function getSignupMethod(user: User): AdminUser['signupMethod'] {
  const provider = String(user.app_metadata.provider ?? '').toLowerCase()
  if (provider === 'google') return 'Google'
  if (provider === 'github') return 'GitHub'
  return 'Email'
}

async function listAllAuthUsers() {
  const supabase = createAdminSupabaseClient()
  const users: User[] = []
  let page = 1
  let lastPage = 1

  do {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    })
    if (error) throw new Error(error.message)
    users.push(...(data.users ?? []))
    lastPage = data.lastPage || page
    page += 1
  } while (page <= lastPage)

  return users
}

function groupCustomerOrders(rows: CustomerOrderRow[]) {
  const groups = rows.reduce<Map<string, CustomerOrderRow[]>>((acc, row) => {
    const key = row.group_id ?? row.id
    const existing = acc.get(key) ?? []
    existing.push(row)
    acc.set(key, existing)
    return acc
  }, new Map())

  return Array.from(groups.entries()).map(([groupId, groupRows]) => {
    const sortedRows = [...groupRows].sort((left, right) =>
      new Date(left.created_at ?? 0).getTime() - new Date(right.created_at ?? 0).getTime()
    )
    const first = sortedRows[0]
    const latest = sortedRows[sortedRows.length - 1]
    const materialSummary = Array.from(new Set(sortedRows.map((row) => row.material).filter(Boolean))).join(', ') || '—'
    const grandTotal = sortedRows.reduce(
      (sum, row) => sum + normalizeMoney(row.grand_total ?? row.final_price ?? row.total_price),
      0
    )

    return {
      id: first.id,
      groupId,
      orderNumber: first.order_number ?? groupId,
      createdAt: first.created_at ?? '',
      status: latest.status,
      grandTotal,
      itemCount: sortedRows.length,
      materialSummary,
    } satisfies AdminCustomerOrder
  }).sort((left, right) =>
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  )
}

function formatAddressFromOrder(row?: CustomerOrderRow) {
  if (!row) return undefined
  return [
    row.address_line1,
    row.address_line2,
    [row.city, row.state].filter(Boolean).join(', '),
    row.pincode,
    row.landmark ? `Landmark: ${row.landmark}` : null,
  ].filter(Boolean).join(', ') || undefined
}

function mapOrderRowsToFiles(rows: CustomerOrderRow[]): AdminCustomerFile[] {
  return rows
    .filter((row) => row.file_url)
    .map((row) => ({
      id: row.id,
      fileName: row.file_url?.split('/').pop() ?? 'STL file',
      fileUrl: row.file_url ?? null,
      uploadedAt: row.created_at ?? '',
      downloadUrl: `/api/admin/orders/${row.id}/file`,
    }))
}

async function listBucketFiles(prefix = ''): Promise<Array<StorageListItem & { path: string }>> {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.storage.from(QUOTE_BUCKET).list(prefix, {
    limit: 100,
    sortBy: { column: 'created_at', order: 'desc' },
  })

  if (error) {
    throw new Error(error.message)
  }

  const rows = data ?? []
  const files: Array<StorageListItem & { path: string }> = []

  for (const item of rows) {
    const path = prefix ? `${prefix}/${item.name}` : item.name

    if (item.id) {
      files.push({ ...item, path })
      continue
    }

    const nestedFiles = await listBucketFiles(path)
    files.push(...nestedFiles)
  }

  return files
}

function getMaterialUsageContext(orders: AdminOrder[]) {
  const usage = orders.reduce<Record<string, number>>((acc, row) => {
    acc[row.material] = (acc[row.material] ?? 0) + 1
    return acc
  }, {})
  return Object.entries(usage).map(([label, value], index) => ({
    label,
    value,
    color: MATERIAL_COLORS[index % MATERIAL_COLORS.length],
  })) as DonutSlice[]
}

function formatAdminFiles(files: Array<StorageListItem & { path: string }>) {
  return files
    .sort((left, right) => {
      const leftDate = new Date(left.created_at ?? left.updated_at ?? 0).getTime()
      const rightDate = new Date(right.created_at ?? right.updated_at ?? 0).getTime()
      return rightDate - leftDate
    })
    .slice(0, 100)
    .map((file) => {
      const fileName = file.path.split('/').pop() ?? file.path
      const user = file.path.split('/')[0] ?? 'Unknown'
      const size = typeof file.metadata?.size === 'number' ? `${Math.max(file.metadata.size / 1024 / 1024, 0.01).toFixed(2)} MB` : 'Unknown'

      return {
        id: file.path,
        name: fileName,
        user,
        uploadedAt: file.created_at ?? file.updated_at ?? '',
        size,
      }
    }) as AdminFile[]
}

export const DASHBOARD_RANGE_DAYS = [7, 30, 90] as const
export type DashboardRangeDays = (typeof DASHBOARD_RANGE_DAYS)[number]

export async function getAdminDashboardData(days: DashboardRangeDays = 30) {
  const supabase = createAdminSupabaseClient()

  const DAY_MS = 86_400_000
  const periodStart = new Date(Date.now() - days * DAY_MS)
  const previousPeriodStart = new Date(Date.now() - 2 * days * DAY_MS)

  const [
    pendingOrders,
    activeOrders,
    orderRows,
    quoteRows,
    profileRows,
    materialRows,
    fileRows,
    periodQuoteCount,
    previousPeriodQuoteCount,
  ] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['confirmed', 'printing']),
    supabase
      .from('orders')
      .select(ADMIN_ORDER_SELECT)
      .gte('created_at', previousPeriodStart.toISOString())
      .order('created_at', { ascending: false }),
    supabase
      .from('quotes')
      .select('id, quote_id, name, email, config, estimate, created_at, user_id')
      .gte('created_at', previousPeriodStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('profiles').select('id, name, full_name, email, is_admin, created_at').order('created_at', { ascending: false }).limit(8),
    supabase
      .from('materials')
      .select('id, name, icon, summary, density, price_per_gram, machine_rate, multiplier, recommended_for, properties, colors, difficulty_factor, key_properties, best_for, difficulty_level, heat_resistance, strength_rating, finish_quality, sample_photo, stock, created_at, updated_at')
      .order('created_at', { ascending: false }),
    listBucketFiles(),
    supabase.from('quotes').select('id', { count: 'exact', head: true }).gte('created_at', periodStart.toISOString()),
    supabase
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', previousPeriodStart.toISOString())
      .lt('created_at', periodStart.toISOString()),
  ])

  ensureNoError(pendingOrders, 'Pending orders')
  ensureNoError(activeOrders, 'Active orders')
  ensureNoError(orderRows, 'Orders')
  ensureNoError(quoteRows, 'Quotes')
  ensureNoError(profileRows, 'Users')
  ensureNoError(materialRows, 'Materials')
  ensureNoError(periodQuoteCount, 'Period quotes')
  ensureNoError(previousPeriodQuoteCount, 'Previous period quotes')

  const normalizedOrders = groupAdminOrders((orderRows.data ?? []) as OrderRow[])
  const normalizedQuotes = (quoteRows.data ?? []).map((row) =>
    mapQuoteRowToAdminQuote(row as QuoteRow)
  )
  const normalizedUsers = (profileRows.data ?? []).map((row) =>
    mapProfileRowToAdminUser(row as ProfileRow)
  )
  const normalizedMaterials = (materialRows.data ?? []).map((row) =>
    normalizeAdminMaterialRow(row as {
      id: string
      name: string
      icon: string
      summary: string
      density: number | string
      price_per_gram: number | string
      machine_rate: number | string
      multiplier: number | string
      recommended_for: string | null
      properties: Record<string, unknown> | null
      colors: string[]
      stock: AdminMaterial['stock']
      difficulty_factor?: number | string
      key_properties?: string[] | null
      best_for?: string[] | null
      difficulty_level?: AdminMaterial['difficulty_level']
      heat_resistance?: AdminMaterial['heat_resistance']
      strength_rating?: AdminMaterial['strength_rating']
      finish_quality?: AdminMaterial['finish_quality']
      sample_photo?: string | null
      created_at?: string | null
      updated_at?: string | null
    })
  )

  const periodOrders = normalizedOrders.filter(
    (order) => new Date(order.createdAt).getTime() >= periodStart.getTime()
  )
  const previousPeriodOrders = normalizedOrders.filter((order) => {
    const time = new Date(order.createdAt).getTime()
    return time >= previousPeriodStart.getTime() && time < periodStart.getTime()
  })

  const revenue = calculateNetRevenue(periodOrders)
  const previousRevenue = calculateNetRevenue(previousPeriodOrders)
  const grossCollected = calculateGrossCollected(periodOrders)
  const refundedInPeriod = grossCollected - revenue
  const previousGrossCollected = calculateGrossCollected(previousPeriodOrders)
  const previousRefunded = previousGrossCollected - previousRevenue

  const paidOrderCount = periodOrders.filter((order) => isEligiblePaidOrder(order)).length
  const previousPaidOrderCount = previousPeriodOrders.filter((order) => isEligiblePaidOrder(order)).length
  const averageOrderValue = paidOrderCount > 0 ? revenue / paidOrderCount : 0
  const previousAverageOrderValue = previousPaidOrderCount > 0 ? previousRevenue / previousPaidOrderCount : 0

  const quoteCount = periodQuoteCount.count ?? 0
  const previousQuoteCount = previousPeriodQuoteCount.count ?? 0
  const conversionRate = quoteCount > 0 ? (paidOrderCount / quoteCount) * 100 : 0
  const previousConversionRate = previousQuoteCount > 0 ? (previousPaidOrderCount / previousQuoteCount) * 100 : 0

  const refundRate = grossCollected > 0 ? (refundedInPeriod / grossCollected) * 100 : 0
  const previousRefundRate = previousGrossCollected > 0 ? (previousRefunded / previousGrossCollected) * 100 : 0

  const activeCustomers = new Set(
    periodOrders.map((order) => order.userId).filter((userId): userId is string => Boolean(userId))
  ).size
  const previousActiveCustomers = new Set(
    previousPeriodOrders.map((order) => order.userId).filter((userId): userId is string => Boolean(userId))
  ).size

  const rangeLabel = `prev ${days}d`

  return {
    metrics: [
      {
        label: `Orders (${days}d)`,
        value: String(periodOrders.length),
        change: formatPercentChange(periodOrders.length, previousPeriodOrders.length, rangeLabel),
        tone: changeTone(periodOrders.length, previousPeriodOrders.length),
      },
      {
        label: `Net Revenue (${days}d)`,
        value: `₹${revenue.toLocaleString('en-IN')}`,
        change: formatPercentChange(revenue, previousRevenue, rangeLabel),
        tone: changeTone(revenue, previousRevenue),
      },
      { label: 'Pending Requests', value: String(pendingOrders.count ?? 0), change: 'Needs review', tone: 'warning' as const },
      { label: 'Active Prints', value: String(activeOrders.count ?? 0), change: 'In production', tone: 'neutral' as const },
      {
        label: `Avg Order Value (${days}d)`,
        value: `₹${averageOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
        change: formatPercentChange(averageOrderValue, previousAverageOrderValue, rangeLabel),
        tone: changeTone(averageOrderValue, previousAverageOrderValue),
      },
      {
        label: `Quote→Order Rate (${days}d)`,
        value: `${conversionRate.toFixed(1)}%`,
        change: `${paidOrderCount} orders · ${quoteCount} quotes (prev ${previousConversionRate.toFixed(1)}%)`,
        tone: 'positive' as const,
      },
      {
        label: `Refund Rate (${days}d)`,
        value: `${refundRate.toFixed(1)}%`,
        change: formatPercentChange(refundRate, previousRefundRate, rangeLabel),
        tone: refundRate <= previousRefundRate ? 'positive' : 'warning',
      },
      {
        label: `Active Customers (${days}d)`,
        value: String(activeCustomers),
        change: formatPercentChange(activeCustomers, previousActiveCustomers, rangeLabel),
        tone: changeTone(activeCustomers, previousActiveCustomers),
      },
    ] satisfies DashboardMetric[],
    orders: periodOrders,
    quotes: normalizedQuotes,
    users: normalizedUsers,
    materials: normalizedMaterials,
    files: formatAdminFiles(fileRows),
    materialUsage: getMaterialUsageContext(periodOrders),
  }
}

export type AdminOrdersFilter = {
  query?: string
  status?: string
  paymentStatus?: string
  dateFrom?: string
  dateTo?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyOrderFilters<T extends PostgrestFilterBuilder<any, any, any, any>>(
  query: T,
  filter: AdminOrdersFilter
): T {
  const { query: searchQuery, status, paymentStatus, dateFrom, dateTo } = filter

  if (searchQuery) {
    query = query.or(
      `order_number.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,material.ilike.%${searchQuery}%`
    ) as T
  }

  if (status && status !== 'all') {
    query = query.eq('status', status) as T
  }

  if (paymentStatus && paymentStatus !== 'all') {
    query = query.eq('payment_status', paymentStatus) as T
  }

  if (dateFrom) {
    const fromDate = new Date(`${dateFrom}T00:00:00.000Z`).toISOString()
    query = query.gte('created_at', fromDate) as T
  }

  if (dateTo) {
    const toDate = new Date(`${dateTo}T23:59:59.999Z`).toISOString()
    query = query.lte('created_at', toDate) as T
  }

  return query
}

export async function getAdminOrdersData(
  page = 1,
  limit = 100,
  filter: AdminOrdersFilter = {}
) {
  const supabase = createAdminSupabaseClient()
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await applyOrderFilters(
    supabase.from('orders').select(ADMIN_ORDER_SELECT, { count: 'exact', head: false }),
    filter
  )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(error.message)
  return { orders: groupAdminOrders((data ?? []) as OrderRow[]), total: count ?? 0 }
}

export type AdminOrdersStats = {
  totalOrders: number
  revenue: number
  pending: number
  printing: number
  confirmed: number
  shipped: number
  delivered: number
  cancelled: number
}

export async function getAdminOrdersStats(filter: AdminOrdersFilter = {}): Promise<AdminOrdersStats> {
  const supabase = createAdminSupabaseClient()

  const selectFields = [
    'id',
    'group_id',
    'order_number',
    'status',
    'grand_total',
    'final_price',
    'total_price',
    'payment_status',
    'payment_refund_amount_paise',
    'delivery_charge',
  ].join(', ')

  const { data, error } = await applyOrderFilters(
    supabase.from('orders').select(selectFields),
    filter
  )

  if (error) throw new Error(error.message)

   const rows = (data ?? []) as unknown as Array<{
     id: string
     group_id: string | null
     order_number: string | null
     status: string
     grand_total: number | string | null
     final_price?: number | string | null
     total_price?: number | string | null
     payment_status?: string | null
     payment_refund_amount_paise?: number | null
     delivery_charge?: number | string | null
   }>

  const grouped = groupAdminOrders(rows as OrderRow[])

  const stats: AdminOrdersStats = {
    totalOrders: grouped.length,
    revenue: 0,
    pending: 0,
    printing: 0,
    confirmed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  }

  for (const order of grouped) {
    if (order.status === 'cancelled') {
      stats.cancelled++
      continue
    }

    const paymentState = order.paymentStatus ?? ''
    if (!PAID_PAYMENT_STATES.includes(paymentState)) {
      continue
    }

    if (order.status === 'pending') stats.pending++
    else if (order.status === 'printing') stats.printing++
    else if (order.status === 'confirmed') stats.confirmed++
    else if (order.status === 'shipped') stats.shipped++
    else if (order.status === 'delivered' || order.status === 'completed') stats.delivered++

    const refundedAmount = Number(order.paymentRefundAmountPaise ?? 0) / 100
    stats.revenue += order.grandTotal - refundedAmount
  }

  return stats
}

export async function updateAdminOrderStatus(groupId: string, status: AdminOrder['status'], cancellationReason?: string) {
  const supabase = createAdminSupabaseClient()
  const { data: currentRows, error: currentError } = await supabase
    .from('orders')
    .select(ADMIN_ORDER_SELECT)
    .or(`group_id.eq.${groupId},id.eq.${groupId}`)
    .order('created_at', { ascending: true })

  if (currentError) throw new Error(currentError.message)

  const rows = (currentRows ?? []) as OrderRow[]
  if (rows.length === 0) {
    throw new Error('Order not found.')
  }

  const currentOrder = groupAdminOrders(rows)[0]
  const currentStatus = currentOrder?.status ?? rows[0].status

  if (currentStatus === status && currentOrder) {
    return currentOrder
  }

  if (!isSequentialOrderStatusTransition(currentStatus, status)) {
    throw new AdminOrderStatusTransitionError(getOrderStatusTransitionError(currentStatus, status))
  }

  const updatedAt = new Date().toISOString()
  const statusTimestamps = buildNextStatusTimestamps(rows, status, updatedAt)

  const updatePayload: Record<string, unknown> = {
    status,
    status_timestamps: statusTimestamps,
    updated_at: updatedAt,
  }

  // Store cancellation reason in notes if cancelling
  if (status === 'cancelled' && cancellationReason) {
    const existingNotes = rows[0]?.notes?.trim() || ''
    const cancelNote = `[Cancellation: ${cancellationReason}]`
    updatePayload.notes = existingNotes ? `${cancelNote}\n${existingNotes}` : cancelNote
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update(updatePayload)
    .or(`group_id.eq.${groupId},id.eq.${groupId}`)

  if (updateError) throw new Error(updateError.message)

  const { data, error } = await supabase
    .from('orders')
    .select(ADMIN_ORDER_SELECT)
    .or(`group_id.eq.${groupId},id.eq.${groupId}`)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  const grouped = groupAdminOrders((data ?? []) as OrderRow[])
  return grouped[0]
}

export type BatchStatusResult = {
  updates: Array<{ groupId: string; orderNumber: string; updated: boolean; error?: string }>
  updatedCount: number
  failedCount: number
}

export async function batchUpdateOrderStatuses(
  updates: Array<{ groupId: string; status: AdminOrder['status']; cancellationReason?: string }>,
  adminUserId: string
): Promise<BatchStatusResult> {
  const result: BatchStatusResult = {
    updates: [],
    updatedCount: 0,
    failedCount: 0,
  }

  for (const { groupId, status, cancellationReason } of updates) {
    try {
      const order = await updateAdminOrderStatus(groupId, status, cancellationReason)
      result.updates.push({ groupId, orderNumber: order.orderNumber, updated: true })
      result.updatedCount++

      await logAdminAction({
        admin_id: adminUserId,
        action: 'update_order_status',
        target_type: 'order',
        target_id: groupId,
        old_value: null,
        new_value: { status },
      })
    } catch (error) {
      result.updates.push({
        groupId,
        orderNumber: '',
        updated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      result.failedCount++
    }
  }

  return result
}

export async function updateAdminOrderNotes(groupId: string, notes: string | null) {
  const supabase = createAdminSupabaseClient()

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      notes,
      updated_at: new Date().toISOString(),
    })
    .or(`group_id.eq.${groupId},id.eq.${groupId}`)

  if (updateError) throw new Error(updateError.message)

  const { data, error } = await supabase
    .from('orders')
    .select(ADMIN_ORDER_SELECT)
    .or(`group_id.eq.${groupId},id.eq.${groupId}`)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  const grouped = groupAdminOrders((data ?? []) as OrderRow[])
  return grouped[0]
}

export async function updateAdminOrderTracking(
  groupId: string,
  tracking: {
    tracking_number?: string | null
    courier_name?: string | null
    tracking_url?: string | null
  }
) {
  const supabase = createAdminSupabaseClient()

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if ('tracking_number' in tracking) updatePayload.tracking_number = tracking.tracking_number || null
  if ('courier_name' in tracking) updatePayload.courier_name = tracking.courier_name || null
  if ('tracking_url' in tracking) updatePayload.tracking_url = tracking.tracking_url || null

  const { error: updateError } = await supabase
    .from('orders')
    .update(updatePayload)
    .or(`group_id.eq.${groupId},id.eq.${groupId}`)

  if (updateError) throw new Error(updateError.message)

  const { data, error } = await supabase
    .from('orders')
    .select(ADMIN_ORDER_SELECT)
    .or(`group_id.eq.${groupId},id.eq.${groupId}`)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  const grouped = groupAdminOrders((data ?? []) as OrderRow[])
  return grouped[0]
}

export async function getAdminOrderById(orderId: string) {
  const supabase = createAdminSupabaseClient()
  const { data: groupedRows, error: groupedError } = await supabase
    .from('orders')
    .select(ADMIN_ORDER_SELECT)
    .eq('group_id', orderId)
    .order('created_at', { ascending: true })

  if (groupedError) throw new Error(groupedError.message)

  let rows = groupedRows ?? []

  if (rows.length === 0) {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(ADMIN_ORDER_SELECT)
      .eq('id', orderId)
      .maybeSingle()

    if (orderError) throw new Error(orderError.message)
    if (!order) return null

    if (order.group_id) {
      const { data: orderGroupRows, error: orderGroupError } = await supabase
        .from('orders')
        .select(ADMIN_ORDER_SELECT)
        .eq('group_id', order.group_id)
        .order('created_at', { ascending: true })

      if (orderGroupError) throw new Error(orderGroupError.message)
      rows = orderGroupRows?.length ? orderGroupRows : [order]
    } else {
      rows = [order]
    }
  }

  const order = groupAdminOrders(rows as OrderRow[])[0] ?? null
  if (!order) return null

  // Payment data may not be stored directly on the orders table.
  // Fall back to payment_attempts for custom quote payments.
  if (!order.paymentProvider) {
    try {
      const paymentIdFilter = order.groupId !== order.id ? order.groupId : order.id
      const { data: paymentAttempt } = await supabase
        .from('payment_attempts')
        .select('id, provider, provider_order_id, provider_payment_id, status, payment_method, captured_at, failed_at')
        .or(`internal_order_id.eq.${order.id},internal_order_id.eq.${paymentIdFilter}`)
        .eq('internal_order_type', 'custom_quote')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (paymentAttempt) {
        order.paymentProvider = paymentAttempt.provider
        order.paymentStatus = paymentAttempt.status
        order.providerOrderId = paymentAttempt.provider_order_id ?? undefined
        order.providerPaymentId = paymentAttempt.provider_payment_id ?? undefined
        order.paymentMethod = paymentAttempt.payment_method ?? undefined
        order.paymentVerifiedAt = paymentAttempt.captured_at ?? undefined
        order.paymentFailedAt = paymentAttempt.failed_at ?? undefined
        order.paymentAttemptId = paymentAttempt.id

        // Check for refunds on this payment attempt
        const { data: refunds } = await supabase
          .from('payment_refunds')
          .select('status, amount_paise')
          .eq('payment_attempt_id', paymentAttempt.id)
          .order('created_at', { ascending: false })

        if (refunds && refunds.length > 0) {
          const processedRefund = refunds.find((r) => r.status === 'processed')
          if (processedRefund) {
            order.paymentRefundStatus = 'completed'
            order.paymentRefundAmountPaise = Number(processedRefund.amount_paise)
          } else {
            const pendingRefund = refunds.find((r) => ['pending_approval', 'pending', 'created'].includes(r.status))
            if (pendingRefund) {
              order.paymentRefundStatus = 'pending'
              order.paymentRefundAmountPaise = Number(pendingRefund.amount_paise)
            }
          }
        }
      }
    } catch {
      // Non-critical: payment lookup failed, order still returns without payment data
    }
  }

  return order
}

export async function getAdminQuotesData() {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('quotes')
    .select('id, quote_id, name, email, config, estimate, created_at, user_id')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((quote) => mapQuoteRowToAdminQuote(quote as QuoteRow))
}

export async function getAdminUsersData() {
  const supabase = createAdminSupabaseClient()
  const users = await listAllAuthUsers()
  const profiles = await supabase.from('profiles').select('id, name, full_name, email, is_admin, avatar_url, created_at')
  if (profiles.error) throw new Error(profiles.error.message)

  const { data: orderRows, error: ordersError } = await supabase
    .from('orders')
    .select('id, user_id, group_id, order_number, file_url, material, grand_total, final_price, total_price, status, full_name, phone, address_line1, address_line2, city, state, pincode, landmark, created_at')
    .order('created_at', { ascending: false })

  if (ordersError) throw new Error(ordersError.message)

  const { data: noteRows, error: notesError } = await supabase
    .from('admin_customer_notes')
    .select('user_id, note, created_at')
    .order('created_at', { ascending: false })

  if (notesError) throw new Error(notesError.message)

  const profilesById = new Map((profiles.data ?? []).map((profile) => [profile.id, profile as ProfileRow]))
  const ordersByUser = ((orderRows ?? []) as CustomerOrderRow[]).reduce<Map<string, CustomerOrderRow[]>>((acc, row) => {
    if (!row.user_id) return acc
    const existing = acc.get(row.user_id) ?? []
    existing.push(row)
    acc.set(row.user_id, existing)
    return acc
  }, new Map())
  const notesByUser = (noteRows ?? []).reduce<Map<string, string[]>>((acc, row) => {
    const userId = typeof row.user_id === 'string' ? row.user_id : ''
    if (!userId) return acc
    const existing = acc.get(userId) ?? []
    if (typeof row.note === 'string') existing.push(row.note)
    acc.set(userId, existing)
    return acc
  }, new Map())

  return users.map((user) => {
    const profile = profilesById.get(user.id)
    const customerOrders = ordersByUser.get(user.id) ?? []
    const groupedOrders = groupCustomerOrders(customerOrders)
    const latestOrder = [...customerOrders].sort((left, right) =>
      new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime()
    )[0]
    const invoices = groupedOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      grandTotal: order.grandTotal,
      downloadUrl: `/api/orders/${order.id}/invoice`,
    })) satisfies AdminCustomerInvoice[]
    const appMetadata = user.app_metadata as Record<string, unknown>
    const userMetadata = user.user_metadata as Record<string, unknown>
    const phone = typeof userMetadata.phone === 'string'
      ? userMetadata.phone
      : typeof userMetadata.whatsapp_number === 'string'
        ? userMetadata.whatsapp_number
        : latestOrder?.phone ?? undefined
    const joinedDate = profile?.created_at ?? user.created_at ?? ''
    const totalSpent = groupedOrders.reduce((sum, order) => sum + order.grandTotal, 0)

    return {
      id: user.id,
      customerId: `CUS-${user.id.slice(0, 8).toUpperCase()}`,
      name:
        profile?.full_name ??
        profile?.name ??
        (typeof user.user_metadata.full_name === 'string'
          ? user.user_metadata.full_name
          : typeof user.user_metadata.name === 'string'
            ? user.user_metadata.name
            : user.email?.split('@')[0] ?? 'Flux3D User'),
      email: profile?.email ?? user.email ?? '',
      phone,
      whatsappNumber: phone,
      city: latestOrder?.city ?? undefined,
      state: latestOrder?.state ?? undefined,
      pincode: latestOrder?.pincode ?? undefined,
      fullAddress: formatAddressFromOrder(latestOrder),
      signupMethod: getSignupMethod(user),
      role: profile?.is_admin ? 'admin' as const : 'customer-success' as const,
      lastActive: user.last_sign_in_at ?? '',
      lastSeenAt: user.last_sign_in_at ?? '',
      totalOrders: groupedOrders.length,
      totalSpent,
      avgOrderValue: groupedOrders.length === 0 ? 0 : totalSpent / groupedOrders.length,
      firstOrderDate: groupedOrders.at(-1)?.createdAt,
      lastOrderDate: groupedOrders[0]?.createdAt,
      filesUploaded: customerOrders.filter((order) => order.file_url).length,
      joinedDate,
      status: getCustomerStatus(user),
      notes: notesByUser.get(user.id)?.join('\n\n') ?? (typeof appMetadata.admin_notes === 'string' ? appMetadata.admin_notes : ''),
      manualCoupon: typeof appMetadata.manual_coupon === 'string' ? appMetadata.manual_coupon : '',
      manualCredit: typeof appMetadata.manual_credit === 'number' ? appMetadata.manual_credit : 0,
      orders: groupedOrders,
      files: mapOrderRowsToFiles(customerOrders),
      invoices,
    }
  })
}

export async function getAdminMaterialsData() {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((material) => normalizeAdminMaterialRow(material))
}

type AdminMaterialInput = {
  name: string
  icon: string
  summary: string
  density: number
  pricePerGram: number
  machineRate: number
  multiplier: number
  recommendedFor: string
  properties: Record<string, unknown>
  colors: string[]
  difficultyFactor: number
  keyProperties?: string[]
  bestFor?: string[]
  difficultyLevel?: AdminMaterial['difficulty_level']
  heatResistance?: AdminMaterial['heat_resistance']
  strengthRating?: AdminMaterial['strength_rating']
  finishQuality?: AdminMaterial['finish_quality']
  samplePhoto?: string
  stock: AdminMaterial['stock']
}

function normalizeAdminMaterialRow(material: {
  id: string
  name: string
  icon?: string | null
  summary?: string | null
  density: number | string
  price_per_gram: number | string
  machine_rate?: number | string | null
  multiplier?: number | string | null
  recommended_for?: string | null
  properties?: Record<string, unknown> | null
  colors: string[]
  difficulty_factor?: number | string
  key_properties?: string[] | null
  best_for?: string[] | null
  difficulty_level?: AdminMaterial['difficulty_level']
  heat_resistance?: AdminMaterial['heat_resistance']
  strength_rating?: AdminMaterial['strength_rating']
  finish_quality?: AdminMaterial['finish_quality']
  sample_photo?: string | null
  stock: AdminMaterial['stock']
  created_at?: string | null
  updated_at?: string | null
}) {
  return {
    id: String(material.id),
    name: material.name,
    icon: material.icon ?? '🧩',
    summary: material.summary ?? '',
    density: Number(material.density ?? 0),
    price_per_gram: Number(material.price_per_gram ?? 0),
    machine_rate: Number(material.machine_rate ?? 180),
    multiplier: Number(material.multiplier ?? 1),
    recommended_for: material.recommended_for ?? '',
    properties: material.properties ?? {},
    colors: Array.isArray(material.colors) ? material.colors : [],
    difficulty_factor: Number(material.difficulty_factor ?? 1.1),
    key_properties: Array.isArray(material.key_properties) ? material.key_properties : [],
    best_for: Array.isArray(material.best_for) ? material.best_for : [],
    difficulty_level: material.difficulty_level ?? 'Easy',
    heat_resistance: material.heat_resistance ?? 'Low',
    strength_rating: material.strength_rating ?? 'Medium',
    finish_quality: material.finish_quality ?? 'Good',
    sample_photo: material.sample_photo ?? '',
    stock: material.stock,
    created_at: material.created_at ?? undefined,
    updated_at: material.updated_at ?? undefined,
  } as AdminMaterial
}

export async function createAdminMaterial(input: AdminMaterialInput) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('materials')
    .insert({
      name: input.name,
      icon: input.icon,
      summary: input.summary,
      density: input.density,
      price_per_gram: input.pricePerGram,
      machine_rate: input.machineRate,
      multiplier: input.multiplier,
      recommended_for: input.recommendedFor,
      properties: input.properties,
      colors: input.colors,
      difficulty_factor: input.difficultyFactor,
      key_properties: input.keyProperties,
      best_for: input.bestFor,
      difficulty_level: input.difficultyLevel,
      heat_resistance: input.heatResistance,
      strength_rating: input.strengthRating,
      finish_quality: input.finishQuality,
      sample_photo: input.samplePhoto,
      stock: input.stock,
    })
    .select('id, name, icon, summary, density, price_per_gram, machine_rate, multiplier, recommended_for, properties, colors, difficulty_factor, key_properties, best_for, difficulty_level, heat_resistance, strength_rating, finish_quality, sample_photo, stock, created_at, updated_at')
    .single()

  if (error) throw new Error(error.message)
  return normalizeAdminMaterialRow(data)
}

export async function updateAdminMaterial(materialId: string, input: AdminMaterialInput) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('materials')
    .update({
      name: input.name,
      icon: input.icon,
      summary: input.summary,
      density: input.density,
      price_per_gram: input.pricePerGram,
      machine_rate: input.machineRate,
      multiplier: input.multiplier,
      recommended_for: input.recommendedFor,
      properties: input.properties,
      colors: input.colors,
      difficulty_factor: input.difficultyFactor,
      key_properties: input.keyProperties,
      best_for: input.bestFor,
      difficulty_level: input.difficultyLevel,
      heat_resistance: input.heatResistance,
      strength_rating: input.strengthRating,
      finish_quality: input.finishQuality,
      sample_photo: input.samplePhoto,
      stock: input.stock,
      updated_at: new Date().toISOString(),
    })
    .eq('id', materialId)
    .select('id, name, icon, summary, density, price_per_gram, machine_rate, multiplier, recommended_for, properties, colors, difficulty_factor, key_properties, best_for, difficulty_level, heat_resistance, strength_rating, finish_quality, sample_photo, stock, created_at, updated_at')
    .single()

  if (error) throw new Error(error.message)
  return normalizeAdminMaterialRow(data)
}

export async function deleteAdminMaterial(materialId: string) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('materials')
    .delete()
    .eq('id', materialId)
    .select('id, name')
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function getAdminFilesData() {
  const files = await listBucketFiles()
  return formatAdminFiles(files)
}

export async function getAdminFullAnalytics() {
  const supabase = createAdminSupabaseClient()

  const [
    ordersResult,
    materialsResult,
    printersResult,
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id, group_id, total_price, final_price, grand_total, status, payment_status, payment_refund_amount_paise, material, city, user_id, created_at'),
    supabase
      .from('materials')
      .select('id, name, price_per_gram, stock, current_stock, min_threshold, sku, type, brand, unit'),
    supabase
      .from('printers')
      .select('id, name, model, status, last_active'),
  ])

  if (ordersResult.error) throw new Error(ordersResult.error.message)
  if (materialsResult.error) throw new Error(materialsResult.error.message)
  if (printersResult.error) throw new Error(printersResult.error.message)

  const orders = ordersResult.data ?? []
  const materials = materialsResult.data ?? []
  const printers = printersResult.data ?? []

  const paidRows = orders.filter((o) => {
    if (o.status === 'cancelled') return false
    return ['paid', 'captured', 'refunded', 'partially_refunded'].includes(String(o.payment_status ?? ''))
  })

  const grossRevenue = paidRows.reduce((sum, o) => sum + normalizeMoney(o.grand_total ?? o.final_price ?? o.total_price), 0)

  const refundsByGroup = new Map<string, number>()
  for (const o of orders) {
    const refundPaise = normalizeMoney(o.payment_refund_amount_paise ?? 0)
    if (refundPaise <= 0) continue
    const groupKey = String(o.group_id ?? o.id)
    if (refundsByGroup.has(groupKey)) continue
    refundsByGroup.set(groupKey, refundPaise / 100)
  }

  const totalRevenue = grossRevenue - Array.from(refundsByGroup.values()).reduce((sum, amount) => sum + amount, 0)

  const ordersByStatus = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {})

  const topMaterialsByRevenue = Object.entries(
    paidRows.reduce<Record<string, number>>((acc, o) => {
      acc[o.material] = (acc[o.material] ?? 0) + normalizeMoney(o.grand_total ?? o.final_price ?? o.total_price)
      return acc
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const ordersByCity = Object.entries(
    orders.reduce<Record<string, number>>((acc, o) => {
      const city = o.city ?? 'Unknown'
      acc[city] = (acc[city] ?? 0) + 1
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1])

  const customerOrderCounts = orders.reduce<Record<string, number>>((acc, o) => {
    const userId = o.user_id ?? 'anonymous'
    acc[userId] = (acc[userId] ?? 0) + 1
    return acc
  }, {})

  const newCustomers = Object.values(customerOrderCounts).filter((count) => count === 1).length
  const returningCustomers = Object.values(customerOrderCounts).filter((count) => count > 1).length

  const printerPerformance = printers.map((printer) => ({
    id: String(printer.id),
    name: printer.name ?? 'Unknown Printer',
    model: printer.model,
    status: printer.status ?? 'Unknown',
    lastActive: printer.last_active,
  }))

  return {
    revenueAnalytics: {
      totalRevenue,
      revenueByPaymentMethod: totalRevenue > 0 ? [{ method: 'Orders', amount: totalRevenue }] : [],
    },
    orderAnalytics: {
      totalOrders: orders.length,
      ordersByStatus: Object.entries(ordersByStatus).map(([status, count]) => ({
        status,
        count,
      })),
      ordersByCity: ordersByCity.map(([city, count]) => ({ city, count })),
    },
    materialAnalytics: {
      topMaterialsByRevenue: topMaterialsByRevenue.map(([material, revenue]) => ({
        material,
        revenue,
      })),
      materials: materials.map((m) => ({
        id: String(m.id),
        name: m.name,
        sku: m.sku,
        type: m.type,
        brand: m.brand,
        price_per_gram: m.price_per_gram,
        stock: m.stock,
        current_stock: m.current_stock,
        min_threshold: m.min_threshold,
        unit: m.unit,
      })),
    },
    geographyAnalytics: {
      ordersByCity: ordersByCity.map(([city, count]) => ({ city, count })),
    },
    customerAnalytics: {
      newCustomers,
      returningCustomers,
      totalCustomers: Object.keys(customerOrderCounts).length,
    },
    printerPerformance: printerPerformance,
  }
}

export async function getAdminInventoryData() {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('materials')
    .select('id, name, price_per_gram, density, colors, stock, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((m) => ({
    id: String(m.id),
    name: m.name,
    price_per_gram: normalizeMoney(m.price_per_gram),
    density: normalizeMoney(m.density) ?? 0,
    colors: Array.isArray(m.colors) ? m.colors : [],
    stock: m.stock ?? 'Healthy',
    created_at: m.created_at,
    updated_at: m.updated_at,
  }))
}

export async function getAdminTicketsData() {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, ticket_id, customer, customer_email, customer_phone, subject, category, priority, status, assigned_to, created_at, last_updated, description')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((t) => ({
    id: String(t.id),
    ticketId: t.ticket_id ?? String(t.id),
    customer: t.customer ?? 'Unknown',
    customerEmail: t.customer_email,
    customerPhone: t.customer_phone,
    subject: t.subject ?? '',
    category: t.category ?? 'Other',
    priority: t.priority ?? 'Normal',
    status: t.status ?? 'Open',
    assignedTo: t.assigned_to,
    created: t.created_at ?? '',
    lastUpdated: t.last_updated ?? t.created_at ?? '',
    description: t.description,
  }))
}

export async function getAdminPrintersData() {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('printers')
    .select('id, name, model, status, build_volume, materials, max_speed, notes, last_active, created_at')
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)

  return (data ?? []).map((p) => ({
    id: String(p.id),
    name: p.name ?? 'Unknown Printer',
    model: p.model,
    status: p.status ?? 'offline',
    buildVolume: p.build_volume,
    materials: Array.isArray(p.materials) ? p.materials : [],
    maxSpeed: p.max_speed,
    notes: p.notes,
    lastActive: p.last_active,
    createdAt: p.created_at,
  }))
}

// ============================================================
// OFFERS QUERIES
// ============================================================

export async function getAdminOffersData() {
  const supabase = createAdminSupabaseClient()
  const { data, error, count } = await supabase
    .from('offers')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch offers: ${error.message}`)
  return { data: data as unknown as Offer[], count }
}

export async function getAdminOfferById(id: string) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(`Failed to fetch offer: ${error.message}`)
  return data as unknown as Offer
}

export async function createAdminOffer(input: Partial<Offer>) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('offers')
    .insert({
      title: input.title,
      description: input.description,
      banner_url: input.banner_url,
      offer_type: input.offer_type ?? 'percentage',
      discount_value: input.discount_value ?? 0,
      max_discount: input.max_discount,
      min_order_value: input.min_order_value ?? 0,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      is_active: input.is_active ?? true,
      is_featured: input.is_featured ?? false,
      auto_apply: input.auto_apply ?? false,
      coupon_code: input.coupon_code,
      applicable_categories: input.applicable_categories,
      applicable_materials: input.applicable_materials,
      applicable_products: input.applicable_products,
      usage_limit: input.usage_limit,
      usage_per_user: input.usage_per_user,
      badge_text: input.badge_text,
      badge_color: input.badge_color ?? 'from-[#6d28d9] to-[#a855f7]',
      sale_label: input.sale_label,
      theme_config: input.theme_config ?? {},
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create offer: ${error.message}`)
  return data as unknown as Offer
}

export async function updateAdminOffer(id: string, input: Partial<Offer>) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('offers')
    .update({
      title: input.title,
      description: input.description,
      banner_url: input.banner_url,
      offer_type: input.offer_type,
      discount_value: input.discount_value,
      max_discount: input.max_discount,
      min_order_value: input.min_order_value,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      is_active: input.is_active,
      is_featured: input.is_featured,
      auto_apply: input.auto_apply,
      coupon_code: input.coupon_code,
      applicable_categories: input.applicable_categories,
      applicable_materials: input.applicable_materials,
      applicable_products: input.applicable_products,
      usage_limit: input.usage_limit,
      usage_per_user: input.usage_per_user,
      badge_text: input.badge_text,
      badge_color: input.badge_color,
      sale_label: input.sale_label,
      theme_config: input.theme_config,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update offer: ${error.message}`)
  return data as unknown as Offer
}

export async function deleteAdminOffer(id: string) {
  const supabase = createAdminSupabaseClient()
  const { error } = await supabase
    .from('offers')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete offer: ${error.message}`)
}

// ============================================================
// COUPONS QUERIES
// ============================================================

export async function getAdminCouponsData() {
  const supabase = createAdminSupabaseClient()
  const { data, error, count } = await supabase
    .from('coupons')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch coupons: ${error.message}`)
  return { data: data as unknown as Coupon[], count }
}

export async function getAdminCouponById(id: string) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(`Failed to fetch coupon: ${error.message}`)
  return data as unknown as Coupon
}

export async function createAdminCoupon(input: Partial<Coupon>) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('coupons')
    .insert({
      code: input.code?.toUpperCase().replace(/\s+/g, ''),
      description: input.description,
      discount_type: input.discount_type ?? 'percentage',
      discount_value: input.discount_value ?? 0,
      max_discount: input.max_discount,
      min_order_value: input.min_order_value ?? 0,
      starts_at: input.starts_at,
      expires_at: input.expires_at,
      is_active: input.is_active ?? true,
      usage_limit: input.usage_limit,
      usage_per_user: input.usage_per_user,
      applicable_categories: input.applicable_categories,
      applicable_materials: input.applicable_materials,
      applicable_products: input.applicable_products,
      first_order_only: input.first_order_only ?? false,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create coupon: ${error.message}`)
  return data as unknown as Coupon
}

export async function updateAdminCoupon(id: string, input: Partial<Coupon>) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('coupons')
    .update({
      ...input,
      code: input.code?.toUpperCase().replace(/\s+/g, ''),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update coupon: ${error.message}`)
  return data as unknown as Coupon
}

export async function deleteAdminCoupon(id: string) {
  const supabase = createAdminSupabaseClient()
  const { error } = await supabase
    .from('coupons')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete coupon: ${error.message}`)
}

// ============================================================
// REDEMPTIONS QUERIES
// ============================================================

export async function getAdminRedemptionsData(limit = 50) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('redemptions')
    .select('*')
    .order('redeemed_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to fetch redemptions: ${error.message}`)
  return data as unknown as Redemption[]
}

export async function getAdminRedemptionStats() {
  const supabase = createAdminSupabaseClient()
  const { data: totalData, error: totalError } = await supabase
    .from('redemptions')
    .select('discount_applied, order_amount')

  if (totalError) throw new Error(`Failed to fetch redemption stats: ${totalError.message}`)

  const items = totalData as unknown as Array<{ discount_applied: number; order_amount: number }>
  return {
    total_redemptions: items.length,
    total_discount_given: items.reduce((s, r) => s + Number(r.discount_applied), 0),
    total_revenue_from_offers: items.reduce((s, r) => s + Number(r.order_amount), 0),
  }
}

export type AdminAttentionItem = {
  id: string
  label: string
  count: number
  href: string
  tone: 'info' | 'warning' | 'danger'
}

export async function getAdminAttentionSummary() {
  const supabase = createAdminSupabaseClient()

  const [refundApprovals, failedEmails, deadWebhooks, retryableWebhooks] = await Promise.all([
    supabase
      .from('refund_approvals')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('email_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed'),
    supabase
      .from('whatsapp_webhook_events')
      .select('id', { count: 'exact', head: true })
      .is('processed_at', null)
      .gte('retry_count', 3),
    supabase
      .from('whatsapp_webhook_events')
      .select('id', { count: 'exact', head: true })
      .is('processed_at', null)
      .lt('retry_count', 3),
  ])

  for (const result of [refundApprovals, failedEmails, deadWebhooks, retryableWebhooks]) {
    if (result.error) throw new Error(`Failed to fetch attention summary: ${result.error.message}`)
  }

  const allItems: AdminAttentionItem[] = [
    {
      id: 'refund-approvals',
      label: 'Refund approvals pending',
      count: refundApprovals.count ?? 0,
      href: '/admin/refunds',
      tone: 'danger',
    },
    {
      id: 'failed-emails',
      label: 'Failed emails',
      count: failedEmails.count ?? 0,
      href: '/admin/emails',
      tone: 'warning',
    },
    {
      id: 'dead-webhooks',
      label: 'Webhook failures (retries exhausted)',
      count: deadWebhooks.count ?? 0,
      href: '/admin/webhook-health',
      tone: 'warning',
    },
    {
      id: 'retryable-webhooks',
      label: 'Webhook events awaiting retry',
      count: retryableWebhooks.count ?? 0,
      href: '/admin/webhook-health',
      tone: 'info',
    },
  ]
  const items = allItems.filter((item) => item.count > 0)

  return {
    total: items.reduce((sum, item) => sum + item.count, 0),
    items,
  }
}
