'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  ChevronDown,
  Clock3,
  PackageCheck,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  XCircle,
} from 'lucide-react'
import { formatShopPrice } from '@/lib/shop/selection'
import {
  formatShopOrderDate,
  getShopFulfilmentStatusClasses,
  getShopFulfilmentStatusLabel,
  getShopOrderStatusClasses,
  getShopOrderStatusLabel,
  SHOP_FULFILMENT_PROGRESS,
  type ShopOrder,
  type ShopFulfilmentStatus,
} from '@/lib/shop/orders'

type FilterKey = 'all' | 'active' | 'delivered' | 'cancelled' | 'returns'
type EligibleReviewProduct = {
  productId: string
  productName: string
  productThumbnail: string | null
  orderId: string
  orderNumber: string
}

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'returns', label: 'Returns' },
]

const activeFulfilmentStatuses: ShopFulfilmentStatus[] = ['pending', 'processing', 'packing', 'packed', 'shipped', 'delivering']

function matchesFilter(order: ShopOrder, filter: FilterKey) {
  if (filter === 'all') return true
  if (filter === 'active') return activeFulfilmentStatuses.includes(order.fulfilment_status)
  if (filter === 'delivered') return order.fulfilment_status === 'delivered'
  if (filter === 'cancelled') return order.order_status === 'cancelled'
  return order.order_status === 'return_requested' || order.order_status === 'returned'
}

function getShopStatusDotColor(status: ShopFulfilmentStatus): string {
  switch (status) {
    case 'pending': return 'bg-amber-500'
    case 'processing': return 'bg-blue-500'
    case 'packing': return 'bg-indigo-500'
    case 'packed': return 'bg-violet-500'
    case 'shipped': return 'bg-purple-500'
    case 'delivering': return 'bg-sky-500'
    case 'delivered': return 'bg-emerald-500'
    default: return 'bg-gray-400'
  }
}

function getOrderItemCount(order: ShopOrder) {
  return order.items.reduce((count, item) => count + Number(item.quantity || 0), 0)
}

function getCurrentProgressIndex(order: ShopOrder) {
  const index = SHOP_FULFILMENT_PROGRESS.indexOf(order.fulfilment_status)
  return index === -1 ? 0 : index
}

function getPaymentBadge(order: ShopOrder) {
  if (order.payment_provider === 'razorpay') {
    return (
      <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
        Razorpay
      </span>
    )
  }
  if (order.payment_status === 'paid') {
    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
        Paid
      </span>
    )
  }
  const method = order.payment_method?.trim().toLowerCase()
  if (method === 'cod' || method === 'cash_on_delivery' || method === 'cash on delivery') {
    return (
      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
        COD
      </span>
    )
  }
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
      Pending
    </span>
  )
}

function getHeroMetricLabel(filter: FilterKey) {
  switch (filter) {
    case 'active':
      return 'Active orders'
    case 'delivered':
      return 'Delivered orders'
    case 'cancelled':
      return 'Cancelled orders'
    case 'returns':
      return 'Return cases'
    default:
      return 'Total orders'
  }
}

function LoadingState() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.08 }}
          className="overflow-hidden rounded-[30px] border border-[var(--shop-border-light)] bg-white/85 shadow-[var(--shop-shadow-sm)]"
        >
          <div className="flex gap-3 p-4 md:p-5">
            {/* Status dot placeholder */}
            <div className="flex flex-col items-center pt-1">
              <div className="h-3 w-3 flex-shrink-0 rounded-full bg-[var(--shop-bg-muted)]" />
            </div>

            {/* Content area */}
            <div className="min-w-0 flex-1">
              {/* Row 1: Title + Status badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-4 w-3/4 animate-pulse rounded-full bg-[var(--shop-bg-muted)]" />
                  <div className="h-3 w-20 animate-pulse rounded bg-[var(--shop-bg-muted)]" />
                </div>
                <div className="h-5 w-16 flex-shrink-0 animate-pulse rounded-full bg-[var(--shop-bg-muted)]" />
              </div>

              {/* Row 2: Order number + Payment badge */}
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="h-3 w-24 animate-pulse rounded bg-[var(--shop-bg-muted)]" />
                <div className="h-5 w-20 flex-shrink-0 animate-pulse rounded-full bg-[var(--shop-bg-muted)]" />
              </div>

              {/* Row 3: Date */}
              <div className="mt-1.5 h-3 w-32 animate-pulse rounded bg-[var(--shop-bg-muted)]" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export default function ShopOrdersClient() {
  const [orders, setOrders] = useState<ShopOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [eligibleByOrder, setEligibleByOrder] = useState<Record<string, EligibleReviewProduct[]>>({})

  useEffect(() => {
    let active = true

    async function loadOrders() {
      setLoading(true)
      setError('')
      try {
        const response = await fetch('/api/3d-shop/orders?limit=50')
        const data = await response.json().catch(() => ({})) as { orders?: ShopOrder[]; error?: string }
        if (!response.ok) throw new Error(data.error || 'Failed to load orders.')
        if (active) {
          setOrders(data.orders ?? [])

          const eligibleResponse = await fetch('/api/3d-shop/reviews/eligible')
          const eligibleData = await eligibleResponse.json().catch(() => []) as EligibleReviewProduct[] | { error?: string }
          if (eligibleResponse.ok && Array.isArray(eligibleData)) {
            const grouped = eligibleData.reduce<Record<string, EligibleReviewProduct[]>>((acc, item) => {
              acc[item.orderId] = [...(acc[item.orderId] ?? []), item]
              return acc
            }, {})
            setEligibleByOrder(grouped)
          }
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Failed to load orders.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadOrders()
    return () => {
      active = false
    }
  }, [])

  const visibleOrders = useMemo(
    () => orders.filter((order) => matchesFilter(order, filter)),
    [filter, orders]
  )
  const filterCounts = useMemo(
    () =>
      filters.reduce<Record<FilterKey, number>>((acc, item) => {
        acc[item.key] = orders.filter((order) => matchesFilter(order, item.key)).length
        return acc
      }, {} as Record<FilterKey, number>),
    [orders]
  )
  const activeCount = filterCounts.active ?? 0
  const deliveredCount = filterCounts.delivered ?? 0
  const reviewCount = Object.values(eligibleByOrder).reduce((count, items) => count + items.length, 0)
  const totalSpend = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0)

  return (
    <main className="relative isolate overflow-hidden px-4 pb-20 pt-5 md:px-8 lg:px-16">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(118deg,#f9f7f4_0%,#ffffff_46%,#f5f3ff_100%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.28] [background-image:linear-gradient(rgba(109,40,217,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(109,40,217,0.06)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="mx-auto max-w-7xl">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mb-7 overflow-hidden rounded-[30px] border border-[var(--shop-border-light)] bg-white p-5 shadow-[0_28px_90px_rgba(26,26,26,0.11)] backdrop-blur-2xl md:p-7"
        >
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)] px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[var(--shop-gold)]">
                <Sparkles className="h-4 w-4" />
                3D Shop
              </div>
              <h1 className="font-[var(--shop-font-heading)] mt-5 max-w-3xl text-[clamp(2.4rem,5vw,5.6rem)] font-semibold leading-[0.95] tracking-[-0.02em] text-[var(--shop-text-primary)]">
                Your orders, beautifully tracked.
              </h1>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link
                  href="/my-orders"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--shop-border-light)] bg-white px-4 text-sm font-bold text-[var(--shop-text-secondary)] shadow-[var(--shop-shadow-sm)] transition hover:border-[var(--shop-border-gold)] hover:text-[var(--shop-gold)]"
                >
                  3D Print Orders
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/3d-shop"
                  className="relative inline-flex min-h-[44px] items-center justify-center gap-2 overflow-hidden rounded-xl bg-[var(--shop-gold)] px-4 text-sm font-bold text-[var(--luxury-charcoal)] shadow-[var(--shop-shadow-gold)] transition hover:bg-[var(--shop-gold-light)]"
                >
                  <span className="relative z-10">Continue Shopping</span>
                  <ShoppingBag className="relative z-10 h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="grid min-w-[min(100%,420px)] gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--shop-text-muted)]">
                  <PackageCheck className="h-4 w-4 text-[var(--shop-gold)]" />
                  {getHeroMetricLabel(filter)}
                </div>
                <div className="mt-2 text-3xl font-black text-[var(--shop-text-primary)]">{filterCounts[filter] ?? 0}</div>
              </div>
              <div className="rounded-2xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--shop-text-muted)]">
                  <BadgeCheck className="h-4 w-4 text-emerald-600" />
                  Lifetime value
                </div>
                <div className="mt-2 text-3xl font-black text-[var(--shop-text-primary)]">{formatShopPrice(totalSpend)}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              { label: 'In progress', value: activeCount, icon: Truck, tone: 'text-sky-600' },
              { label: 'Delivered', value: deliveredCount, icon: Check, tone: 'text-emerald-600' },
              { label: 'Reviews waiting', value: reviewCount, icon: Star, tone: 'text-amber-500' },
            ].map((metric, index) => {
              const Icon = metric.icon
              return (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + index * 0.06 }}
                  className="rounded-2xl border border-[var(--shop-border-light)] bg-white/78 p-4 shadow-[var(--shop-shadow-sm)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--shop-text-muted)]">{metric.label}</div>
                      <div className="mt-1 text-2xl font-black text-[var(--shop-text-primary)]">{metric.value}</div>
                    </div>
                    <div className={`grid h-11 w-11 place-items-center rounded-2xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] ${metric.tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="sticky top-24 z-20 mb-6 overflow-x-auto rounded-2xl border border-[var(--shop-border-light)] bg-white p-1.5 shadow-[var(--shop-shadow-sm)] backdrop-blur-xl"
        >
          <div className="flex min-w-max gap-1">
            {filters.map((item) => {
              const active = filter === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`relative min-h-[44px] shrink-0 rounded-xl px-4 text-sm font-black transition ${
                    active ? 'text-[var(--shop-gold)]' : 'text-[var(--shop-text-secondary)] hover:text-[var(--shop-text-primary)]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="shop-orders-filter"
                      className="absolute inset-0 rounded-xl border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)] shadow-[var(--shop-shadow-sm)]"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative z-10 inline-flex items-center gap-2">
                    {item.label}
                    <span className={`rounded-full px-2 py-0.5 text-xs ${active ? 'bg-white text-[var(--shop-gold)]' : 'bg-[var(--shop-bg-muted)] text-[var(--shop-text-muted)]'}`}>
                      {filterCounts[item.key] ?? 0}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </motion.div>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-center text-rose-700 shadow-[var(--shop-shadow-sm)]"
          >
            <AlertCircle className="mx-auto h-12 w-12" />
            <h2 className="mt-4 text-2xl font-black text-rose-900">Orders could not be loaded</h2>
            <p className="mt-2 text-sm font-semibold">{error}</p>
          </motion.div>
        ) : visibleOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-[30px] border border-[var(--shop-border-light)] bg-white/86 p-8 text-center shadow-[var(--shop-shadow-md)] backdrop-blur-xl"
          >
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)] text-[var(--shop-gold)]">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <h2 className="font-[var(--shop-font-heading)] mt-5 text-3xl font-semibold text-[var(--shop-text-primary)]">No orders here yet.</h2>
            <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[var(--shop-text-secondary)]">
              Orders matching this filter will appear here as soon as they are placed.
            </p>
            <Link href="/3d-shop" className="inline-flex items-center rounded-[var(--shop-radius-lg)] bg-[var(--shop-text-primary)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--shop-text-secondary)] mt-6 inline-flex min-h-[48px] items-center px-5">
              <span className="relative z-10">Start Shopping</span>
            </Link>
          </motion.div>
        ) : (
          <motion.div layout className="grid gap-4">
            <AnimatePresence mode="popLayout">
              {visibleOrders.map((order, index) => {
                const firstItem = order.items[0]
                const moreCount = Math.max(0, order.items.length - 1)
                const isExpanded = Boolean(expanded[order.id])
                const itemCount = getOrderItemCount(order)
                const currentProgressIndex = getCurrentProgressIndex(order)
                const reviewItems = eligibleByOrder[order.id] ?? []
                const hasReviewPrompt = order.fulfilment_status === 'delivered' && reviewItems.length > 0
                const hasException = order.order_status === 'cancelled' || order.order_status === 'return_requested' || order.order_status === 'returned'

                return (
                  <motion.article
                    layout
                    key={order.id}
                    initial={{ opacity: 0, y: 22, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12, scale: 0.98 }}
                    transition={{ duration: 0.34, delay: Math.min(index * 0.05, 0.22), ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ y: -3 }}
                    className="group overflow-hidden rounded-[30px] border border-[var(--shop-border-light)] bg-white/88 shadow-[0_18px_60px_rgba(26,26,26,0.08)] backdrop-blur-xl transition-shadow hover:shadow-[0_28px_90px_rgba(109,40,217,0.14)]"
                  >
                    <div className="flex gap-3 p-4 md:p-5">
                      {/* Status indicator - dedicated left column */}
                      <div className="flex flex-col items-center pt-1">
                        <div className={`h-3 w-3 flex-shrink-0 rounded-full ${hasException ? 'bg-orange-500' : getShopStatusDotColor(order.fulfilment_status)}`} />
                      </div>

                      {/* Content area */}
                      <div className="min-w-0 flex-1">
                        {/* Row 1: Product name + Status badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="line-clamp-1 text-sm font-black leading-tight text-[var(--shop-text-primary)]">
                              {firstItem?.productName ?? '3D Shop Order'}
                            </div>
                            {moreCount > 0 && (
                              <div className="mt-0.5 text-[11px] font-bold text-[var(--shop-gold)]">
                                +{moreCount} more item{moreCount === 1 ? '' : 's'}
                              </div>
                            )}
                          </div>
                          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black ${
                            order.order_status === 'cancelled' || order.order_status === 'returned'
                              ? getShopOrderStatusClasses(order.order_status)
                              : getShopFulfilmentStatusClasses(order.fulfilment_status)
                          }`}>
                            {order.order_status === 'cancelled' || order.order_status === 'returned'
                              ? getShopOrderStatusLabel(order.order_status)
                              : getShopFulfilmentStatusLabel(order.fulfilment_status)}
                          </span>
                        </div>

                        {/* Row 2: Order number + Payment badge */}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="min-w-0 truncate text-xs font-bold text-[var(--shop-text-muted)]">
                            #{order.order_number}
                          </div>
                          <div className="flex-shrink-0">
                            {getPaymentBadge(order)}
                          </div>
                        </div>

                        {/* Row 3: Date */}
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-[var(--shop-text-muted)]">
                          <CalendarClock className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="flex-shrink-0">Placed {formatShopOrderDate(order.placed_at)}</span>
                        </div>
                      </div>
                    </div>

                    {!hasException && (
                      <div className="mt-4 grid gap-2 px-4 md:mt-5 md:grid-cols-5 md:px-5">
                        {SHOP_FULFILMENT_PROGRESS.map((status, statusIndex) => {
                          const complete = statusIndex < currentProgressIndex
                          const current = statusIndex === currentProgressIndex
                          return (
                            <div key={status} className="relative rounded-2xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-3">
                              <div className="flex items-center gap-2">
                                <span className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-black ${
                                  complete
                                    ? 'border-[var(--shop-gold)] bg-[var(--shop-gold)] text-[var(--luxury-charcoal)]'
                                    : current
                                      ? 'border-[var(--shop-gold)] bg-[var(--shop-gold-faint)] text-[var(--shop-gold)]'
                                      : 'border-[var(--shop-border-light)] bg-white text-[var(--shop-text-muted)]'
                                }`}>
                                  {complete ? <Check className="h-4 w-4" /> : statusIndex + 1}
                                </span>
                                <span className={`text-xs font-black ${complete || current ? 'text-[var(--shop-text-primary)]' : 'text-[var(--shop-text-muted)]'}`}>
                                  {getShopFulfilmentStatusLabel(status)}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {hasException && (
                      <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm font-bold text-orange-800 md:mx-5 md:mt-5">
                        {order.order_status === 'cancelled' ? <XCircle className="h-5 w-5 shrink-0" /> : <RotateCcw className="h-5 w-5 shrink-0" />}
                        {getShopOrderStatusLabel(order.order_status)}
                      </div>
                    )}

                    {firstItem && (
                      <div className="mx-4 mt-4 rounded-[24px] border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-3 md:mx-5 md:mt-5 md:p-4">
                        <div className="grid gap-4 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center">
                          <div className="relative h-[72px] w-[72px] overflow-hidden rounded-2xl bg-[var(--shop-bg-muted)]">
                            {firstItem.productThumbnail ? (
                              <Image src={firstItem.productThumbnail} alt={firstItem.productName} fill sizes="72px" className="object-cover transition duration-500 group-hover:scale-105" />
                            ) : (
                              <div className="grid h-full place-items-center text-[var(--shop-text-muted)]">
                                <PackageCheck className="h-7 w-7" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="line-clamp-1 text-lg font-black text-[var(--shop-text-primary)]">{firstItem.productName}</div>
                            <div className="mt-1 line-clamp-1 text-sm font-bold text-[var(--shop-text-muted)]">{firstItem.variantLabel}</div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--shop-text-secondary)]">
                              <span>{itemCount} item{itemCount === 1 ? '' : 's'}</span>
                              <span className="h-1 w-1 rounded-full bg-[var(--shop-border-medium)]" />
                              <span>{formatShopPrice(firstItem.unitPrice)} first item</span>
                              <span className="h-1 w-1 rounded-full bg-[var(--shop-border-medium)]" />
                              <span>{order.shipping_charge === 0 ? 'Free shipping' : `${formatShopPrice(order.shipping_charge)} shipping`}</span>
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            <div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--shop-text-muted)]">Total</div>
                            <div className="mt-1 text-2xl font-black text-[var(--shop-text-primary)]">{formatShopPrice(order.total_amount)}</div>
                          </div>
                        </div>

                        {moreCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpanded((current) => ({ ...current, [order.id]: !isExpanded }))}
                            className="mt-4 inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-[var(--shop-border-light)] bg-white px-3 text-sm font-black text-[var(--shop-gold)] transition hover:border-[var(--shop-border-gold)]"
                          >
                            {isExpanded ? 'Hide items' : `${moreCount} more item${moreCount === 1 ? '' : 's'}`}
                            <ChevronDown className={`h-4 w-4 transition ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        )}

                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.24 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 grid gap-2">
                                {order.items.slice(1).map((item) => (
                                  <div key={`${item.skuId}-${item.customizationText ?? ''}`} className="rounded-2xl border border-[var(--shop-border-light)] bg-white px-3 py-2 text-sm text-[var(--shop-text-secondary)]">
                                    <span className="font-black text-[var(--shop-text-primary)]">{item.productName}</span>
                                    <span> · {item.variantLabel} · Qty {item.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    <div className="mx-4 mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:mx-5 md:mt-5">
                      <div className="flex items-center gap-2 text-sm font-bold text-[var(--shop-text-secondary)]">
                        <Clock3 className="h-4 w-4 text-[var(--shop-gold)]" />
                        {order.estimated_delivery ? `Expected by ${formatShopOrderDate(order.estimated_delivery)}` : 'Tracking updates will appear here'}
                      </div>
                      <Link href={`/3d-shop/order/${order.id}`} className="inline-flex items-center rounded-[var(--shop-radius-lg)] bg-[var(--shop-gold)] px-5 text-sm font-semibold text-[var(--luxury-charcoal)] shadow-[var(--shop-shadow-gold)] transition hover:bg-[var(--shop-gold-light)] inline-flex min-h-[46px] items-center justify-center px-5">
                        <span className="relative z-10">View Order</span>
                        <ArrowRight className="relative z-10 h-4 w-4" />
                      </Link>
                    </div>

                    {hasReviewPrompt && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)] px-4 py-3 md:mx-5 md:mt-4"
                      >
                          <div className="flex items-center gap-2 text-sm font-black text-[var(--shop-gold)]">
                          <Star className="h-4 w-4 fill-[var(--shop-gold)] text-[var(--shop-gold)]" />
                          {reviewItems.length} review{reviewItems.length === 1 ? '' : 's'} waiting
                        </div>
                        <Link href={`/3d-shop/order/${order.id}?reviews=1`} className="inline-flex items-center gap-2 text-sm font-black text-[var(--shop-gold)]">
                          Write Review
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </motion.div>
                    )}
                  </motion.article>
                )
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </main>
  )
}
