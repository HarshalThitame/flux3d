'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  Check,
  CircleDot,
  CreditCard,
  MapPin,
  PackageCheck,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  X,
  XCircle,
} from 'lucide-react'
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
  const className = 'font-black text-[var(--text-primary)] transition hover:text-[var(--brand-primary)]'

  if (item.productSlug) {
    return (
      <Link href={`/3d-shop/product/${item.productSlug}`} className={className}>
        {item.productName}
      </Link>
    )
  }

  return <div className={className}>{item.productName}</div>
}

function getOrderItemCount(order: ShopOrder) {
  return order.items.reduce((count, item) => count + Number(item.quantity || 0), 0)
}

function isExceptionStatus(order: ShopOrder) {
  return order.order_status === 'cancelled' || order.order_status === 'return_requested' || order.order_status === 'returned'
}

function getPrimaryItem(order: ShopOrder) {
  return order.items.find((item) => item.productThumbnail) ?? order.items[0] ?? null
}

function getPaymentModeLabel(value: string | null) {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) {
    return 'Not set'
  }
  if (normalized === 'razorpay') return 'Razorpay'
  if (normalized === 'payu') return 'PayU'
  if (normalized === 'cod' || normalized === 'cash_on_delivery' || normalized === 'cash on delivery') {
    return 'Cash on Delivery'
  }
  return value
}

function LoadingState() {
  return (
    <main className="relative isolate overflow-hidden px-4 pb-20 pt-5 md:px-8 md:pt-6 lg:px-16">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(118deg,#f9f7f4_0%,#ffffff_46%,#f5f3ff_100%)]" />
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[30px] border border-[var(--border-light)] bg-white/85 p-6 shadow-[var(--shadow-sm)]">
          <div className="h-5 w-32 animate-pulse rounded-full bg-[var(--bg-muted)]" />
          <div className="mt-5 h-12 w-full max-w-xl animate-pulse rounded-2xl bg-[var(--bg-muted)]" />
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-[var(--bg-muted)]" />
            ))}
          </div>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-[28px] border border-[var(--border-light)] bg-white/85 p-5 shadow-[var(--shadow-sm)]">
                <div className="grid gap-4 sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:items-center">
                  <div className="aspect-square animate-pulse rounded-2xl bg-[var(--bg-muted)]" />
                  <div className="space-y-3">
                    <div className="h-5 w-full max-w-sm animate-pulse rounded-full bg-[var(--bg-muted)]" />
                    <div className="h-4 w-48 animate-pulse rounded-full bg-[var(--bg-muted)]" />
                    <div className="h-4 w-36 animate-pulse rounded-full bg-[var(--bg-muted)]" />
                  </div>
                  <div className="h-8 w-24 animate-pulse rounded-xl bg-[var(--bg-muted)] sm:justify-self-end" />
                </div>
              </div>
            ))}
          </div>
          <div className="h-80 animate-pulse rounded-[30px] border border-[var(--border-light)] bg-white/85 shadow-[var(--shadow-sm)]" />
        </div>
      </div>
    </main>
  )
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

  if (loading) return <LoadingState />

  if (error || !order) {
    return (
      <main className="relative isolate overflow-hidden px-4 pb-20 pt-5 md:px-8 md:pt-6 lg:px-16">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(118deg,#f9f7f4_0%,#ffffff_46%,#f5f3ff_100%)]" />
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-3xl rounded-[30px] border border-[var(--border-light)] bg-white/88 p-8 text-center shadow-[var(--shadow-md)] backdrop-blur-xl"
        >
          <XCircle className="mx-auto h-14 w-14 text-rose-600" />
          <h1 className="mt-4 !text-2xl font-black text-[var(--text-primary)]">Order not found</h1>
          <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[var(--text-secondary)]">
            {error || 'This order could not be loaded.'}
          </p>
          <Link href="/3d-shop/orders" className="btn-primary mt-6 inline-flex min-h-[48px] items-center px-5">
            <span className="relative z-10">View 3D Shop Orders</span>
          </Link>
        </motion.div>
      </main>
    )
  }

  const primaryItem = getPrimaryItem(order)
  const itemCount = getOrderItemCount(order)
  const exceptionStatus = isExceptionStatus(order)

  return (
    <main className="relative isolate overflow-hidden px-4 pb-20 pt-5 md:px-8 md:pt-6 lg:px-16">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(118deg,#f9f7f4_0%,#ffffff_46%,#f5f3ff_100%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.28] [background-image:linear-gradient(rgba(109,40,217,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(109,40,217,0.06)_1px,transparent_1px)] [background-size:42px_42px]" />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className="fixed bottom-5 right-5 z-[120] max-w-sm rounded-2xl border border-[var(--border-light)] bg-white px-4 py-3 text-sm font-bold text-[var(--text-primary)] shadow-[var(--shadow-lg)]"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dialogType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/40 px-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              className="w-full max-w-md rounded-[28px] border border-white bg-white p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
                    <AlertTriangle className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="!text-lg font-black text-[var(--text-primary)]">
                      {dialogType === 'cancel' ? 'Cancel order?' : 'Request return?'}
                    </h2>
                    <p className="mt-2 text-sm font-semibold leading-6 text-[var(--text-secondary)]">
                      {dialogType === 'cancel' ? 'Are you sure? This cannot be undone.' : 'Share the reason for the return request.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDialogType(null)
                    setReason('')
                  }}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border-light)] bg-white text-[var(--text-muted)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={dialogType === 'cancel' ? 'Cancellation reason' : 'Return reason'}
                className="mt-5 min-h-[120px] w-full resize-y rounded-2xl border border-[var(--border-light)] bg-[var(--bg-soft)] p-3 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
              />
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDialogType(null)
                    setReason('')
                  }}
                  className="min-h-[46px] flex-1 rounded-xl border border-[var(--border-light)] bg-white text-sm font-bold text-[var(--text-secondary)]"
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  onClick={() => void submitAction()}
                  disabled={!reason.trim() || actionLoading}
                  className="btn-primary min-h-[46px] flex-1 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="relative z-10">{actionLoading ? 'Saving...' : 'Confirm'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-7xl space-y-6">
        {showNewSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 text-center shadow-[var(--shadow-sm)]"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 240, damping: 18 }}
              className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-600 text-white"
            >
              <Check className="h-8 w-8" />
            </motion.div>
            <h1 className="mt-3 !text-xl font-black text-emerald-800">Order Placed Successfully</h1>
            <p className="mt-1 text-[10px] font-bold text-emerald-700">Order #{order.order_number}</p>
          </motion.div>
        )}

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden rounded-[34px] border border-white bg-white/82 p-5 shadow-[0_28px_90px_rgba(26,26,26,0.11)] backdrop-blur-2xl md:p-6"
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,390px)] lg:items-start">
            <div className="min-w-0 self-start">
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                <Link href="/3d-shop/orders" className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-[var(--border-light)] bg-white px-3 text-sm font-bold text-[var(--text-secondary)] shadow-[var(--shadow-sm)] transition hover:border-[var(--border-brand)] hover:text-[var(--brand-primary)]">
                  <ArrowLeft className="h-4 w-4" />
                  All Shop Orders
                </Link>

                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-brand)] bg-[var(--brand-faint)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--brand-primary)]">
                  <Sparkles className="h-4 w-4" />
                  Order Detail
                </div>
              </div>

              <p className="mt-5 max-w-full break-words text-[10px] font-black leading-4 tracking-[0] text-[var(--text-primary)]">
                #{order.order_number}
              </p>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[var(--text-secondary)]">
                Placed on {formatShopOrderDateTime(order.placed_at)}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-black ${getShopOrderStatusClasses(order.order_status)}`}>
                  {getShopOrderStatusLabel(order.order_status)}
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs font-black ${getShopPaymentStatusClasses(order.payment_status)}`}>
                  {getShopPaymentStatusLabel(order.payment_status)}
                </span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                  {getPaymentModeLabel(order.payment_method)}
                </span>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Items', value: `${itemCount}`, icon: ShoppingBag, tone: 'text-[var(--brand-primary)]' },
                  { label: 'Total', value: formatShopPrice(order.total_amount), icon: ReceiptText, tone: 'text-emerald-600' },
                  { label: 'Shipping', value: order.shipping_charge === 0 ? 'Free' : formatShopPrice(order.shipping_charge), icon: Truck, tone: 'text-sky-600' },
                  { label: 'Destination', value: order.shipping_address.city || 'Delivery', icon: MapPin, tone: 'text-rose-600' },
                ].map((metric, index) => {
                  const Icon = metric.icon
                  return (
                    <motion.div
                      key={metric.label}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.06 }}
                      className="min-w-0 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-soft)] p-4"
                    >
                      <div className="flex min-w-0 items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--text-muted)]">
                        <Icon className={`h-4 w-4 shrink-0 ${metric.tone}`} />
                        <span className="truncate">{metric.label}</span>
                      </div>
                      <div className="mt-2 break-words text-[clamp(1.15rem,1.7vw,1.5rem)] font-black leading-tight text-[var(--text-primary)]">{metric.value}</div>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[28px] border border-[var(--border-light)] bg-white shadow-[var(--shadow-md)] lg:self-stretch">
              {primaryItem?.productThumbnail ? (
                <div className="relative aspect-[4/3] min-h-[240px] bg-[var(--bg-muted)] lg:h-full lg:min-h-[320px]">
                  <Image
                    src={primaryItem.productThumbnail}
                    alt={primaryItem.productName}
                    fill
                    sizes="(min-width: 1024px) 390px, 100vw"
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_38%,rgba(255,255,255,0.96))]" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className="line-clamp-1 text-lg font-black text-[var(--text-primary)]">{primaryItem.productName}</div>
                    <div className="mt-1 line-clamp-1 text-sm font-bold text-[var(--text-secondary)]">{primaryItem.variantLabel}</div>
                  </div>
                </div>
              ) : (
                <div className="grid aspect-[4/3] min-h-[240px] place-items-center bg-[linear-gradient(135deg,#f5f3ff,#ecfdf5)] p-6 text-center lg:h-full lg:min-h-[320px]">
                  <PackageCheck className="mx-auto h-16 w-16 text-emerald-600" />
                  <div className="mt-4 text-lg font-black text-[var(--text-primary)]">Order package ready</div>
                </div>
              )}
            </div>
          </div>
        </motion.section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:items-start">
          <section className="space-y-6">
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="rounded-[30px] border border-[var(--border-light)] bg-white/88 p-5 shadow-[var(--shadow-sm)] backdrop-blur-xl"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--brand-primary)]">
                    <CircleDot className="h-4 w-4" />
                    Fulfillment Timeline
                  </div>
                  <h2 className="mt-2 !text-xl font-black text-[var(--text-primary)]">Current order status</h2>
                </div>
                <span className={`w-fit rounded-full border px-3 py-1 text-sm font-black ${getShopOrderStatusClasses(order.order_status)}`}>
                  {getShopOrderStatusLabel(order.order_status)}
                </span>
              </div>

              {exceptionStatus ? (
                <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-orange-800">
                  <div className="flex items-start gap-3">
                    {order.order_status === 'cancelled' ? <XCircle className="mt-0.5 h-5 w-5 shrink-0" /> : <RotateCcw className="mt-0.5 h-5 w-5 shrink-0" />}
                    <div>
                      <div className="font-black">{getShopOrderStatusLabel(order.order_status)}</div>
                      {order.cancellation_reason && <div className="mt-1 text-sm font-semibold">Reason: {order.cancellation_reason}</div>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {SHOP_ORDER_PROGRESS.map((status, index) => {
                    const complete = index < currentProgressIndex
                    const current = index === currentProgressIndex
                    return (
                      <motion.div
                        key={status}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.14 + index * 0.05 }}
                        className={`min-h-[92px] rounded-2xl border p-3 lg:min-h-[118px] ${
                          complete
                            ? 'border-emerald-200 bg-emerald-50'
                            : current
                              ? 'border-[var(--border-brand)] bg-[var(--brand-faint)]'
                              : 'border-[var(--border-light)] bg-[var(--bg-soft)]'
                        }`}
                      >
                        <div className="flex h-full w-full items-center gap-3 lg:flex-col lg:items-start lg:justify-between">
                          <div className={`grid h-9 w-9 place-items-center rounded-full border text-sm font-black ${
                            complete
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : current
                                ? 'border-[var(--brand-primary)] bg-white text-[var(--brand-primary)]'
                                : 'border-[var(--border-light)] bg-white text-[var(--text-muted)]'
                          }`}>
                            {complete ? <Check className="h-4 w-4" /> : index + 1}
                          </div>
                          <div className={`text-sm font-black leading-tight ${complete || current ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                            {getShopOrderStatusLabel(status)}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="rounded-[30px] border border-[var(--border-light)] bg-white/88 p-5 shadow-[var(--shadow-sm)] backdrop-blur-xl"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--brand-primary)]">
                    <PackageCheck className="h-4 w-4" />
                    Items
                  </div>
                  <h2 className="mt-2 !text-xl font-black text-[var(--text-primary)]">Items ordered</h2>
                </div>
                <div className="rounded-full border border-[var(--border-light)] bg-[var(--bg-soft)] px-3 py-1 text-sm font-black text-[var(--text-secondary)]">
                  {itemCount} item{itemCount === 1 ? '' : 's'}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {order.items.map((item, index) => (
                  <motion.article
                    key={`${item.skuId}-${item.customizationText ?? ''}`}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.16 + index * 0.05 }}
                    className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-soft)] p-3 transition hover:border-[var(--border-brand)] hover:bg-white"
                  >
                    <div className="grid grid-cols-[82px_minmax(0,1fr)] gap-4 sm:grid-cols-[82px_minmax(0,1fr)_minmax(120px,auto)] sm:items-center">
                      <div className="relative h-[82px] w-[82px] overflow-hidden rounded-2xl bg-[var(--bg-muted)]">
                        {item.productThumbnail ? (
                          <Image src={item.productThumbnail} alt={item.productName} fill sizes="82px" className="object-cover transition duration-500 hover:scale-105" />
                        ) : (
                          <div className="grid h-full place-items-center">
                            <PackageCheck className="h-8 w-8 text-[var(--text-muted)]" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <ProductName item={item} />
                        <p className="mt-1 text-sm font-bold text-[var(--text-muted)]">{item.variantLabel}</p>
                        {item.customizationText && (
                          <p className="mt-1 text-sm font-semibold italic text-[var(--text-secondary)]">Engraved: {item.customizationText}</p>
                        )}
                        <p className="mt-2 text-sm font-semibold text-[var(--text-secondary)]">
                          Qty {item.quantity} x {formatShopPrice(item.unitPrice)}
                        </p>
                      </div>
                      <div className="col-span-full rounded-xl border border-[var(--border-light)] bg-white/65 px-3 py-2 text-left sm:col-auto sm:border-0 sm:bg-transparent sm:p-0 sm:justify-self-end sm:text-right">
                        <div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Line total</div>
                        <div className="mt-1 text-lg font-black text-[var(--text-primary)]">{formatShopPrice(getShopOrderLineTotal(item))}</div>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            </motion.section>

            {eligibleReviews.length > 0 && (
              <motion.section
                id="reviews"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[30px] border border-yellow-200 bg-yellow-50 p-5 shadow-[var(--shadow-sm)]"
              >
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-500" />
                  <h2 className="!text-xl font-black text-yellow-900">Review your items</h2>
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
                              <div className="grid h-full place-items-center">
                                <Star className="h-5 w-5 text-yellow-500" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-black text-[var(--text-primary)]">{eligible.productName}</div>
                            {orderItem?.variantLabel && <div className="text-sm font-semibold text-[var(--text-muted)]">{orderItem.variantLabel}</div>}
                          </div>
                        </div>
                        <Link
                          href={orderItem?.productSlug ? `/3d-shop/product/${orderItem.productSlug}#reviews` : '/3d-shop'}
                          className="btn-primary inline-flex min-h-[42px] items-center px-4 text-sm"
                        >
                          <span className="relative z-10">Write Review</span>
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </motion.section>
            )}

            <div className="grid items-stretch gap-6 md:grid-cols-2">
              <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="h-full rounded-[30px] border border-[var(--border-light)] bg-white/88 p-5 shadow-[var(--shadow-sm)] backdrop-blur-xl"
              >
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--brand-primary)]">
                  <MapPin className="h-4 w-4" />
                  Delivery
                </div>
                <h2 className="mt-2 !text-lg font-black text-[var(--text-primary)]">Delivery address</h2>
                <div className="mt-4 break-words text-sm font-semibold leading-7 text-[var(--text-secondary)]">
                  <div className="font-black text-[var(--text-primary)]">{order.shipping_address.name}</div>
                  <div>{order.shipping_address.phone}</div>
                  <div>{order.shipping_address.line1}</div>
                  {order.shipping_address.line2 && <div>{order.shipping_address.line2}</div>}
                  <div>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.pincode}</div>
                </div>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
                className="h-full rounded-[30px] border border-[var(--border-light)] bg-white/88 p-5 shadow-[var(--shadow-sm)] backdrop-blur-xl"
              >
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--brand-primary)]">
                  <CreditCard className="h-4 w-4" />
                  Payment
                </div>
                <h2 className="mt-2 !text-lg font-black text-[var(--text-primary)]">Payment info</h2>
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-soft)] p-4">
                  <Banknote className="h-5 w-5 shrink-0 text-[var(--brand-primary)]" />
                  <div className="min-w-0">
                <div className="font-black text-[var(--text-primary)]">
                  {getPaymentModeLabel(order.payment_provider ?? order.payment_method)}
                </div>
                <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${getShopPaymentStatusClasses(order.payment_status)}`}>
                  {getShopPaymentStatusLabel(order.payment_status)}
                </span>
              </div>
            </div>
                {order.payment_status !== 'paid' && order.payment_method?.toLowerCase() !== 'cod' && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
                    <p className="font-bold">Payment is still pending or failed.</p>
                    <p className="mt-1">
                      You can retry the secure Razorpay checkout for this order.
                    </p>
                    <Link
                      href={`/3d-shop/payment/${order.id}`}
                      className="mt-3 inline-flex min-h-[42px] items-center justify-center rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-black text-white"
                    >
                      Complete payment
                    </Link>
                  </div>
                )}
              </motion.section>
            </div>

            {(order.tracking_number || order.estimated_delivery) && (
              <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[30px] border border-[var(--border-light)] bg-white/88 p-5 shadow-[var(--shadow-sm)] backdrop-blur-xl"
              >
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--brand-primary)]">
                  <Truck className="h-4 w-4" />
                  Tracking
                </div>
                <h2 className="mt-2 !text-lg font-black text-[var(--text-primary)]">Tracking info</h2>
                {order.tracking_number && (
                  <div className="mt-4 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-soft)] p-4 text-sm font-semibold text-[var(--text-secondary)]">
                    {order.courier_name && <div>Courier: <span className="font-black text-[var(--text-primary)]">{order.courier_name}</span></div>}
                    <div className="mt-1">Tracking: <span className="break-all font-black text-[var(--text-primary)]">{order.tracking_number}</span></div>
                    {order.tracking_url && (
                      <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-black text-[var(--brand-primary)]">
                        Track Package
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                )}
                {order.estimated_delivery && (
                  <div className="mt-3 text-sm font-bold text-[var(--text-secondary)]">
                    Expected by {formatShopOrderDate(order.estimated_delivery)}
                  </div>
                )}
              </motion.section>
            )}
          </section>

          <motion.aside
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="h-fit rounded-[30px] border border-white bg-white/90 p-5 shadow-[0_26px_90px_rgba(26,26,26,0.12)] backdrop-blur-xl lg:sticky lg:top-28 lg:self-start"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[var(--border-brand)] bg-[var(--brand-faint)] text-[var(--brand-primary)]">
                <ReceiptText className="h-5 w-5" />
              </span>
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--text-muted)]">Receipt</div>
                <h2 className="!text-lg font-black text-[var(--text-primary)]">Pricing summary</h2>
              </div>
            </div>

            <div className="mt-5 space-y-3 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-soft)] p-4 text-sm">
              <div className="flex items-start justify-between gap-4 text-[var(--text-secondary)]">
                <span className="min-w-0 break-words">Subtotal</span>
                <span className="shrink-0 font-black text-[var(--text-primary)]">{formatShopPrice(order.subtotal)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex items-start justify-between gap-4 text-emerald-700">
                  <span className="min-w-0 break-words">Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</span>
                  <span className="shrink-0 font-black">-{formatShopPrice(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex items-start justify-between gap-4 text-[var(--text-secondary)]">
                <span className="min-w-0 break-words">Shipping</span>
                <span className="shrink-0 font-black text-[var(--text-primary)]">{order.shipping_charge === 0 ? 'Free' : formatShopPrice(order.shipping_charge)}</span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-light)] pt-5">
              <span className="text-base font-black text-[var(--text-primary)]">Total</span>
              <span className="break-words text-right text-[clamp(1.45rem,2.5vw,1.65rem)] font-black leading-tight text-[var(--text-primary)]">{formatShopPrice(order.total_amount)}</span>
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Server verified price, stock, and order details.
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {isShopOrderCancellable(order.order_status) && (
                <button
                  type="button"
                  onClick={() => setDialogType('cancel')}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 text-sm font-black text-rose-700"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel Order
                </button>
              )}
              {isShopOrderReturnable(order.order_status, order.placed_at) && (
                <button
                  type="button"
                  onClick={() => setDialogType('return')}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 text-sm font-black text-orange-700"
                >
                  <RotateCcw className="h-4 w-4" />
                  Request Return
                </button>
              )}
              <Link href="/3d-shop" className="btn-primary flex min-h-[48px] w-full items-center justify-center">
                <span className="relative z-10">Continue Shopping</span>
              </Link>
              <Link href="/3d-shop/orders" className="block rounded-xl border border-[var(--border-light)] bg-white px-4 py-3 text-center text-sm font-black text-[var(--text-secondary)] transition hover:border-[var(--border-brand)] hover:text-[var(--brand-primary)]">
                Back to 3D Shop Orders
              </Link>
            </div>
          </motion.aside>
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
