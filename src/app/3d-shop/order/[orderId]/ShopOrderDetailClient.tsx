'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowUpRight, Banknote, Check, PackageCheck, RotateCcw, Star, XCircle } from 'lucide-react'
import ProductRecommendations from '@/components/shop/ProductRecommendations'
import { formatShopPrice } from '@/lib/shop/selection'
import {
  formatShopOrderDate,
  formatShopOrderDateTime,
  getShopOrderLineTotal,
  getShopOrderStatusClasses,
  getShopOrderStatusLabel,
  getShopPaymentStatusClasses,
  getShopPaymentStatusLabel,
  isShopOrderCancellable,
  isShopOrderReturnable,
  SHOP_ORDER_PROGRESS,
  type ShopOrder,
  type ShopOrderItem,
} from '@/lib/shop/orders'

type DialogType = 'cancel' | 'return'
type EligibleReviewProduct = {
  productId: string
  productName: string
  productThumbnail: string | null
  orderId: string
  orderNumber: string
}

function ProductName({ item }: { item: ShopOrderItem }) {
  if (item.productSlug) {
    return (
      <Link href={`/3d-shop/product/${item.productSlug}`} className="font-bold text-[var(--text-primary)] hover:text-[var(--brand-primary)]">
        {item.productName}
      </Link>
    )
  }

  return <div className="font-bold text-[var(--text-primary)]">{item.productName}</div>
}

export default function ShopOrderDetailClient({ orderId }: { orderId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const showNewSuccess = searchParams?.get('new') === '1'
  const [order, setOrder] = useState<ShopOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [dialogType, setDialogType] = useState<DialogType | null>(null)
  const [reason, setReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [eligibleReviews, setEligibleReviews] = useState<EligibleReviewProduct[]>([])

  const loadOrder = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/3d-shop/orders/${orderId}`)
      const data = await response.json().catch(() => ({})) as { order?: ShopOrder; error?: string }
      if (!response.ok || !data.order) throw new Error(data.error || 'Order not found.')
      setOrder(data.order)

      if (data.order.order_status === 'delivered') {
        const eligibleResponse = await fetch('/api/3d-shop/reviews/eligible')
        const eligibleData = await eligibleResponse.json().catch(() => []) as EligibleReviewProduct[]
        setEligibleReviews(eligibleResponse.ok && Array.isArray(eligibleData)
          ? eligibleData.filter((item) => item.orderId === data.order?.id)
          : []
        )
      } else {
        setEligibleReviews([])
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Order not found.')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrder()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadOrder])

  useEffect(() => {
    if (!showNewSuccess) return
    const timer = window.setTimeout(() => {
      router.replace(`/3d-shop/order/${orderId}`)
    }, 2600)
    return () => window.clearTimeout(timer)
  }, [orderId, router, showNewSuccess])

  useEffect(() => {
    if (loading || searchParams?.get('reviews') !== '1') return
    const timer = window.setTimeout(() => {
      document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)
    return () => window.clearTimeout(timer)
  }, [loading, searchParams])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const currentProgressIndex = useMemo(() => {
    if (!order) return -1
    const index = SHOP_ORDER_PROGRESS.indexOf(order.order_status)
    return index === -1 ? SHOP_ORDER_PROGRESS.length - 1 : index
  }, [order])

  async function submitAction() {
    if (!dialogType || !order || !reason.trim()) return
    setActionLoading(true)
    try {
      const response = await fetch(`/api/3d-shop/orders/${order.id}/${dialogType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      })
      const data = await response.json().catch(() => ({})) as { success?: boolean; error?: string }
      if (!response.ok || !data.success) throw new Error(data.error || 'Request failed.')
      setDialogType(null)
      setReason('')
      setToast(dialogType === 'cancel' ? 'Order cancelled' : 'Return requested')
      await loadOrder()
    } catch (actionError) {
      setToast(actionError instanceof Error ? actionError.message : 'Request failed.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="px-4 pb-20 pt-5 md:px-8 md:pt-6 lg:px-16">
        <div className="mx-auto max-w-5xl rounded-3xl border border-[var(--border-light)] bg-white p-8 text-center text-[var(--text-secondary)] shadow-[var(--shadow-sm)]">
          Loading order...
        </div>
      </main>
    )
  }

  if (error || !order) {
    return (
      <main className="px-4 pb-20 pt-5 md:px-8 md:pt-6 lg:px-16">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[var(--border-light)] bg-white p-8 text-center shadow-[var(--shadow-sm)]">
          <XCircle className="mx-auto h-12 w-12 text-rose-600" />
          <h1 className="mt-4 !text-2xl font-extrabold text-[var(--text-primary)]">Order not found</h1>
          <p className="mt-2 text-[var(--text-secondary)]">{error || 'This order could not be loaded.'}</p>
          <Link href="/3d-shop/orders" className="btn-primary mt-6 inline-flex min-h-[48px] items-center px-5">
            View 3D Shop Orders
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="px-4 pb-20 pt-5 md:px-8 md:pt-6 lg:px-16">
      {toast && (
        <div className="fixed bottom-5 right-5 z-[120] max-w-sm rounded-2xl border border-[var(--border-light)] bg-white px-4 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-xl">
          {toast}
        </div>
      )}

      {dialogType && (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-[var(--border-light)] bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 h-5 w-5 text-amber-600" />
              <div>
                <h2 className="!text-lg font-extrabold text-[var(--text-primary)]">
                  {dialogType === 'cancel' ? 'Cancel order?' : 'Request return?'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {dialogType === 'cancel' ? 'Are you sure? This cannot be undone.' : 'Share the reason for the return request.'}
                </p>
              </div>
            </div>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={dialogType === 'cancel' ? 'Cancellation reason' : 'Return reason'}
              className="mt-5 min-h-[120px] w-full rounded-2xl border border-[var(--border-light)] p-3 text-sm outline-none focus:border-[var(--brand-primary)]"
            />
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setDialogType(null)
                  setReason('')
                }}
                className="min-h-[46px] flex-1 rounded-xl border border-[var(--border-light)] text-sm font-bold text-[var(--text-secondary)]"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={() => void submitAction()}
                disabled={!reason.trim() || actionLoading}
                className="btn-primary min-h-[46px] flex-1 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl space-y-6">
        {showNewSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-[var(--shadow-sm)]"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 240, damping: 18 }}
              className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-600 text-white"
            >
              <Check className="h-9 w-9" />
            </motion.div>
            <h1 className="mt-4 !text-2xl font-extrabold text-emerald-800">Order Placed Successfully!</h1>
            <p className="mt-2 text-emerald-700">Order #{order.order_number}</p>
          </motion.div>
        )}

        <section className="rounded-3xl border border-[var(--border-light)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--brand-primary)]">3D Shop Order</p>
              <h1 className="mt-2 !text-2xl font-extrabold text-[var(--text-primary)]">#{order.order_number}</h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">Placed on {formatShopOrderDateTime(order.placed_at)}</p>
            </div>
            <span className={`w-fit rounded-full border px-3 py-1 text-sm font-bold ${getShopOrderStatusClasses(order.order_status)}`}>
              {getShopOrderStatusLabel(order.order_status)}
            </span>
          </div>

          {order.order_status === 'cancelled' ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
              <div className="font-bold">Cancelled</div>
              {order.cancellation_reason && <div className="mt-1 text-sm">Reason: {order.cancellation_reason}</div>}
            </div>
          ) : (
            <div className="mt-7 grid gap-3 md:grid-cols-5">
              {SHOP_ORDER_PROGRESS.map((status, index) => {
                const complete = index < currentProgressIndex
                const current = index === currentProgressIndex
                return (
                  <div key={status} className="flex items-center gap-3 md:block">
                    <div className={`grid h-9 w-9 place-items-center rounded-full border text-sm font-bold ${
                      complete
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : current
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-faint)] text-[var(--brand-primary)]'
                          : 'border-gray-200 bg-gray-50 text-[#6F7192]'
                    }`}>
                      {complete ? <Check className="h-4 w-4" /> : index + 1}
                    </div>
                    <div className={`text-sm font-bold ${complete || current ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                      {getShopOrderStatusLabel(status)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-[var(--border-light)] bg-white p-5 shadow-[var(--shadow-sm)]">
              <h2 className="!text-xl font-extrabold text-[var(--text-primary)]">Items Ordered</h2>
              <div className="mt-5 space-y-4">
                {order.items.map((item) => (
                  <article key={`${item.skuId}-${item.customizationText ?? ''}`} className="rounded-2xl border border-[var(--border-light)] p-4">
                    <div className="grid gap-4 sm:grid-cols-[72px_1fr_auto]">
                      <div className="relative h-[72px] w-[72px] overflow-hidden rounded-2xl bg-[var(--bg-muted)]">
                        {item.productThumbnail ? (
                          <Image src={item.productThumbnail} alt={item.productName} fill sizes="72px" className="object-cover" />
                        ) : (
                          <div className="grid h-full place-items-center text-2xl">🧩</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <ProductName item={item} />
                        <p className="mt-1 text-sm text-[var(--text-muted)]">{item.variantLabel}</p>
                        {item.customizationText && (
                          <p className="mt-1 text-sm italic text-[var(--text-secondary)]">Engraved: {item.customizationText}</p>
                        )}
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                          Qty {item.quantity} x {formatShopPrice(item.unitPrice)}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="text-lg font-extrabold text-[var(--text-primary)]">{formatShopPrice(getShopOrderLineTotal(item))}</div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {eligibleReviews.length > 0 && (
              <div id="reviews" className="rounded-3xl border border-yellow-200 bg-yellow-50 p-5 shadow-[var(--shadow-sm)]">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-500" />
                  <h2 className="!text-xl font-extrabold text-yellow-900">Review Your Items</h2>
                </div>
                <div className="mt-5 space-y-3">
                  {eligibleReviews.map((eligible) => {
                    const orderItem = order.items.find((item) => item.productId === eligible.productId)
                    return (
                      <div key={`${eligible.orderId}-${eligible.productId}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-yellow-200 bg-white p-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--bg-muted)]">
                            {(eligible.productThumbnail || orderItem?.productThumbnail) ? (
                              <Image src={eligible.productThumbnail || orderItem?.productThumbnail || ''} alt={eligible.productName} fill sizes="48px" className="object-cover" />
                            ) : (
                              <div className="grid h-full place-items-center text-lg">🧩</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-bold text-[var(--text-primary)]">{eligible.productName}</div>
                            {orderItem?.variantLabel && <div className="text-sm text-[var(--text-muted)]">{orderItem.variantLabel}</div>}
                          </div>
                        </div>
                        <Link
                          href={orderItem?.productSlug ? `/3d-shop/product/${orderItem.productSlug}#reviews` : '/3d-shop'}
                          className="btn-primary inline-flex min-h-[42px] items-center px-4 text-sm"
                        >
                          Write Review
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-[var(--border-light)] bg-white p-5 shadow-[var(--shadow-sm)]">
                <h2 className="!text-lg font-extrabold text-[var(--text-primary)]">Delivery Address</h2>
                <div className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
                  <div className="font-bold text-[var(--text-primary)]">{order.shipping_address.name}</div>
                  <div>{order.shipping_address.phone}</div>
                  <div>{order.shipping_address.line1}</div>
                  {order.shipping_address.line2 && <div>{order.shipping_address.line2}</div>}
                  <div>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.pincode}</div>
                </div>
              </div>

              <div className="rounded-3xl border border-[var(--border-light)] bg-white p-5 shadow-[var(--shadow-sm)]">
                <h2 className="!text-lg font-extrabold text-[var(--text-primary)]">Payment Info</h2>
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[var(--border-light)] p-4">
                  <Banknote className="h-5 w-5 text-[var(--brand-primary)]" />
                  <div>
                    <div className="font-bold text-[var(--text-primary)]">Cash on Delivery</div>
                    <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getShopPaymentStatusClasses(order.payment_status)}`}>
                      {getShopPaymentStatusLabel(order.payment_status)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {(order.tracking_number || order.estimated_delivery) && (
              <div className="rounded-3xl border border-[var(--border-light)] bg-white p-5 shadow-[var(--shadow-sm)]">
                <h2 className="!text-lg font-extrabold text-[var(--text-primary)]">Tracking Info</h2>
                {order.tracking_number && (
                  <div className="mt-4 rounded-2xl border border-[var(--border-light)] p-4 text-sm text-[var(--text-secondary)]">
                    {order.courier_name && <div>Courier: <span className="font-bold text-[var(--text-primary)]">{order.courier_name}</span></div>}
                    <div className="mt-1">Tracking #: <span className="font-bold text-[var(--text-primary)]">{order.tracking_number}</span></div>
                    {order.tracking_url && (
                      <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[var(--brand-primary)]">
                        Track Package
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                )}
                {order.estimated_delivery && (
                  <div className="mt-3 text-sm font-semibold text-[var(--text-secondary)]">
                    Expected by {formatShopOrderDate(order.estimated_delivery)}
                  </div>
                )}
              </div>
            )}
          </section>

          <aside className="h-fit rounded-3xl border border-[var(--border-light)] bg-white p-5 shadow-[var(--shadow-sm)] lg:sticky lg:top-28">
            <div className="flex items-center gap-3">
              <PackageCheck className="h-5 w-5 text-[var(--brand-primary)]" />
              <h2 className="!text-lg font-extrabold text-[var(--text-primary)]">Pricing Summary</h2>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Subtotal</span>
                <span className="font-bold text-[var(--text-primary)]">{formatShopPrice(order.subtotal)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</span>
                  <span className="font-bold">-{formatShopPrice(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Shipping</span>
                <span className="font-bold text-[var(--text-primary)]">{order.shipping_charge === 0 ? 'Free' : formatShopPrice(order.shipping_charge)}</span>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-[var(--border-light)] pt-5">
              <span className="text-lg font-bold text-[var(--text-primary)]">Total</span>
              <span className="text-xl font-extrabold text-[var(--text-primary)]">{formatShopPrice(order.total_amount)}</span>
            </div>

            <div className="mt-6 space-y-3">
              {isShopOrderCancellable(order.order_status) && (
                <button
                  type="button"
                  onClick={() => setDialogType('cancel')}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 text-sm font-bold text-rose-700"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel Order
                </button>
              )}
              {isShopOrderReturnable(order.order_status, order.placed_at) && (
                <button
                  type="button"
                  onClick={() => setDialogType('return')}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 text-sm font-bold text-orange-700"
                >
                  <RotateCcw className="h-4 w-4" />
                  Request Return
                </button>
              )}
              <Link href="/3d-shop" className="btn-primary flex min-h-[48px] w-full items-center justify-center">
                Continue Shopping
              </Link>
              <Link href="/3d-shop/orders" className="block text-center text-sm font-bold text-[var(--text-secondary)]">
                Back to 3D Shop Orders
              </Link>
            </div>
          </aside>
        </div>
        <ProductRecommendations
          title="Continue Shopping"
          productId={order.items[0]?.productId}
          limit={4}
          compact
        />
      </div>
    </main>
  )
}
