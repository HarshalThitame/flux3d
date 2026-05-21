'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronDown, ShoppingBag, Star } from 'lucide-react'
import { formatShopPrice } from '@/lib/shop/selection'
import {
  formatShopOrderDate,
  getShopOrderStatusClasses,
  getShopOrderStatusLabel,
  type ShopOrder,
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

function matchesFilter(order: ShopOrder, filter: FilterKey) {
  if (filter === 'all') return true
  if (filter === 'active') return ['placed', 'confirmed', 'packed', 'shipped'].includes(order.order_status)
  if (filter === 'delivered') return order.order_status === 'delivered'
  if (filter === 'cancelled') return order.order_status === 'cancelled'
  return order.order_status === 'return_requested' || order.order_status === 'returned'
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

  return (
    <main className="px-4 pb-20 pt-5 md:px-8 lg:px-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 rounded-3xl border border-[var(--border-light)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <p className="text-sm font-semibold text-[var(--brand-primary)]">3D Shop</p>
          <h1 className="mt-2 text-4xl font-extrabold text-[var(--text-primary)]">My 3D Shop Orders</h1>
          <Link href="/my-orders" className="mt-4 inline-flex text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--brand-primary)]">
            ← View 3D Print Orders
          </Link>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`min-h-[42px] shrink-0 rounded-xl border px-4 text-sm font-bold ${
                filter === item.key
                  ? 'border-[var(--brand-primary)] bg-[var(--brand-faint)] text-[var(--brand-primary)]'
                  : 'border-[var(--border-light)] bg-white text-[var(--text-secondary)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-[var(--border-light)] bg-white p-8 text-center text-[var(--text-secondary)] shadow-[var(--shadow-sm)]">
            Loading orders...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700">
            {error}
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="rounded-3xl border border-[var(--border-light)] bg-white p-8 text-center shadow-[var(--shadow-sm)]">
            <ShoppingBag className="mx-auto h-12 w-12 text-[var(--brand-primary)]" />
            <h2 className="mt-4 text-2xl font-extrabold text-[var(--text-primary)]">No orders yet.</h2>
            <Link href="/3d-shop" className="btn-primary mt-6 inline-flex min-h-[48px] items-center px-5">
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleOrders.map((order) => {
              const firstItem = order.items[0]
              const moreCount = Math.max(0, order.items.length - 1)
              const isExpanded = Boolean(expanded[order.id])

              return (
                <article key={order.id} className="rounded-3xl border border-[var(--border-light)] bg-white p-5 shadow-[var(--shadow-sm)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xl font-extrabold text-[var(--text-primary)]">
                        <ShoppingBag className="h-5 w-5 text-[var(--brand-primary)]" />
                        #{order.order_number}
                      </div>
                      <div className="mt-1 text-sm text-[var(--text-secondary)]">Placed {formatShopOrderDate(order.placed_at)}</div>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getShopOrderStatusClasses(order.order_status)}`}>
                      {getShopOrderStatusLabel(order.order_status)}
                    </span>
                  </div>

                  {firstItem && (
                    <div className="mt-5 border-y border-[var(--border-light)] py-4">
                      <div className="grid grid-cols-[52px_1fr] gap-3">
                        <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-[var(--bg-muted)]">
                          {firstItem.productThumbnail ? (
                            <Image src={firstItem.productThumbnail} alt={firstItem.productName} fill sizes="48px" className="object-cover" />
                          ) : (
                            <div className="grid h-full place-items-center text-lg">🧩</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-[var(--text-primary)]">{firstItem.productName}</div>
                          <div className="mt-1 text-sm text-[var(--text-muted)]">{firstItem.variantLabel}</div>
                          <div className="mt-1 text-sm text-[var(--text-secondary)]">
                            Qty: {firstItem.quantity} · {formatShopPrice(firstItem.unitPrice)}
                          </div>
                        </div>
                      </div>

                      {moreCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpanded((current) => ({ ...current, [order.id]: !isExpanded }))}
                          className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[var(--brand-primary)]"
                        >
                          {isExpanded ? 'Hide items' : `+${moreCount} more item${moreCount === 1 ? '' : 's'}`}
                          <ChevronDown className={`h-4 w-4 transition ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      )}

                      {isExpanded && (
                        <div className="mt-3 space-y-2">
                          {order.items.slice(1).map((item) => (
                            <div key={`${item.skuId}-${item.customizationText ?? ''}`} className="rounded-xl bg-[var(--bg-soft)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                              <span className="font-bold text-[var(--text-primary)]">{item.productName}</span>
                              <span> · {item.variantLabel} · Qty {item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-[var(--text-secondary)]">
                      <span className="font-bold text-[var(--text-primary)]">Total: {formatShopPrice(order.total_amount)}</span>
                      <span> (incl. {order.shipping_charge === 0 ? 'free shipping' : `${formatShopPrice(order.shipping_charge)} shipping`})</span>
                      <span className="ml-2 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">COD</span>
                    </div>
                    <Link href={`/3d-shop/order/${order.id}`} className="btn-primary inline-flex min-h-[44px] items-center justify-center px-5">
                      View Order →
                    </Link>
                  </div>
                  {order.order_status === 'delivered' && eligibleByOrder[order.id]?.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-yellow-800">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-500" />
                        How was your order?
                      </div>
                      <Link href={`/3d-shop/order/${order.id}?reviews=1`} className="text-sm font-extrabold text-[var(--brand-primary)]">
                        Write a Review
                      </Link>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
