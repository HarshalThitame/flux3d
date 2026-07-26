'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { formatShopPrice } from '@/lib/shop/selection'
import {
  formatShopOrderDate,
  getShopFulfilmentStatusClasses,
  getShopFulfilmentStatusLabel,
  getShopOrderStatusClasses,
  getShopOrderStatusLabel,
  type ShopOrder,
  type ShopFulfilmentStatus,
} from '@/lib/shop/orders'
import { AlertCircle, ShoppingBag } from 'lucide-react'

type FilterKey = 'all' | 'active' | 'delivered' | 'cancelled' | 'returns'

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All Orders' },
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

function getStatusDotColor(status: ShopFulfilmentStatus): string {
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

function getPaymentBadge(order: ShopOrder) {
  if (order.payment_provider === 'razorpay') {
    return (
      <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-black text-violet-700">
        Razorpay
      </span>
    )
  }
  if (order.payment_status === 'paid') {
    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
        Paid
      </span>
    )
  }
  const method = order.payment_method?.trim().toLowerCase()
  if (method === 'cod' || method === 'cash_on_delivery' || method === 'cash on delivery') {
    return (
      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700">
        COD
      </span>
    )
  }
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-600">
      Pending
    </span>
  )
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border border-[var(--shop-border-light)] bg-white/85 shadow-[var(--shop-shadow-sm)]"
        >
          <div className="flex gap-3 p-4">
            <div className="flex flex-col items-center pt-1">
              <div className="h-3 w-3 flex-shrink-0 rounded-full bg-[var(--shop-bg-muted)]" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1.5">
                  <div className="h-4 w-3/4 animate-pulse rounded-full bg-[var(--shop-bg-muted)]" />
                  <div className="h-3 w-20 animate-pulse rounded bg-[var(--shop-bg-muted)]" />
                </div>
                <div className="h-5 w-14 flex-shrink-0 animate-pulse rounded-full bg-[var(--shop-bg-muted)]" />
              </div>
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 animate-pulse rounded bg-[var(--shop-bg-muted)]" />
                <div className="h-5 w-16 flex-shrink-0 animate-pulse rounded-full bg-[var(--shop-bg-muted)]" />
              </div>
              <div className="h-3 w-32 animate-pulse rounded bg-[var(--shop-bg-muted)]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ShopOrdersMobile() {
  const [orders, setOrders] = useState<ShopOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')

  useEffect(() => {
    let active = true

    async function loadOrders() {
      setLoading(true)
      setError('')
      try {
        const response = await fetch('/api/3d-shop/orders?limit=50')
        const data = await response.json().catch(() => ({})) as { orders?: ShopOrder[]; error?: string }
        if (!response.ok) throw new Error(data.error || 'Failed to load orders.')
        if (active) setOrders(data.orders ?? [])
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

  if (loading) return <LoadingState />

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
        <AlertCircle className="mx-auto h-8 w-8" />
        <h2 className="mt-2 text-sm font-bold text-rose-900">Orders could not be loaded</h2>
        <p className="mt-1 text-xs font-semibold">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Filter Dropdown */}
      <div className="flex items-center gap-2">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterKey)}
          className="w-full rounded-xl border border-[var(--shop-border-light)] bg-white px-3 py-2.5 text-sm font-bold text-[var(--shop-text-primary)] shadow-sm focus:border-[var(--shop-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--shop-gold)]/10"
        >
          {filters.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label} ({filterCounts[item.key] ?? 0})
            </option>
          ))}
        </select>
      </div>

      {/* Orders List */}
      {visibleOrders.length === 0 ? (
        <div className="rounded-2xl border border-[var(--shop-border-light)] bg-white/86 p-6 text-center shadow-sm backdrop-blur-xl">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)] text-[var(--shop-gold)]">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-base font-bold text-[var(--shop-text-primary)]">No orders here yet</h2>
          <p className="mt-1 text-xs font-semibold text-[var(--shop-text-secondary)]">
            Orders matching this filter will appear here.
          </p>
          <Link
            href="/3d-shop"
            className="btn-primary mt-4 inline-flex min-h-[44px] items-center px-4 text-sm"
          >
            <span className="relative z-10">Start Shopping</span>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleOrders.map((order) => {
            const firstItem = order.items[0]
            const moreCount = Math.max(0, order.items.length - 1)
            const itemCount = getOrderItemCount(order)
            const hasException = order.order_status === 'cancelled' || order.order_status === 'return_requested' || order.order_status === 'returned'
            const statusDotColor = hasException ? 'bg-orange-500' : getStatusDotColor(order.fulfilment_status)

            return (
              <Link
                key={order.id}
                href={`/3d-shop/order/${order.id}`}
                className="group block animate-slide-in-up overflow-hidden rounded-2xl border border-[var(--shop-border-light)] bg-white/88 shadow-[var(--shop-shadow-sm)] backdrop-blur-xl transition hover:shadow-[var(--shop-shadow-md)]"
              >
                <div className="flex gap-3 p-4">
                  {/* Status indicator */}
                  <div className="flex flex-col items-center pt-1">
                    <div className={`h-3 w-3 flex-shrink-0 rounded-full ${statusDotColor}`} />
                  </div>

                  {/* Content area */}
                  <div className="min-w-0 flex-1">
                    {/* Row 1: Product name + Status badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-1 text-sm font-bold leading-tight text-[var(--shop-text-primary)]">
                          {firstItem?.productName ?? '3D Shop Order'}
                        </div>
                        {moreCount > 0 && (
                          <div className="mt-0.5 text-[10px] font-bold text-[var(--shop-gold)]">
                            +{moreCount} more item{moreCount === 1 ? '' : 's'}
                          </div>
                        )}
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${
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

                    {/* Row 3: Date + Items + Total */}
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--shop-text-muted)]">
                        <span className="flex-shrink-0">Placed {formatShopOrderDate(order.placed_at)}</span>
                        <span className="text-[var(--shop-border-medium)]">·</span>
                        <span className="flex-shrink-0">{itemCount} item{itemCount === 1 ? '' : 's'}</span>
                      </div>
                      <div className="flex-shrink-0 text-sm font-black text-[var(--shop-gold)]">
                        {formatShopPrice(order.total_amount)}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
