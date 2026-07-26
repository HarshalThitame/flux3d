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
  BadgeCheck,
  Banknote,
  Bike,
  Check,
  CheckCircle,
  CircleDot,
  Clock,
  CreditCard,
  MapPin,
  Package,
  PackageCheck,
  ReceiptText,
  RotateCcw,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  X,
  XCircle,
} from 'lucide-react'
import FeaturedProductsAd from '@/components/shop/FeaturedProductsAd'
import { formatShopPrice } from '@/lib/shop/selection'
import {
  formatShopOrderDate,
  formatShopOrderDateTime,
  getShopFulfilmentStatusClasses,
  getShopFulfilmentStatusLabel,
  getShopOrderLineTotal,
  getShopOrderStatusClasses,
  getShopOrderStatusLabel,
  getShopPaymentStatusClasses,
  getShopPaymentStatusLabel,
  isShopOrderReturnable,
  SHOP_FULFILMENT_PROGRESS,
  type ShopOrder,
  type ShopOrderItem,
} from '@/lib/shop/orders'
import { DownloadInvoiceButton } from './DownloadInvoiceButton'

type DialogType = 'cancel' | 'return'
type EligibleReviewProduct = {
  productId: string
  productName: string
  productThumbnail: string | null
  orderId: string
  orderNumber: string
}

function ProductName({ item }: { item: ShopOrderItem }) {
  const className = 'font-black text-[var(--shop-text-primary)] transition hover:text-[var(--shop-gold)]'

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

function getProgressStepIcon(status: string) {
  switch (status) {
    case 'pending': return Clock
    case 'processing': return Settings
    case 'packing': return Package
    case 'packed': return CheckCircle
    case 'shipped': return Truck
    case 'delivering': return Bike
    case 'delivered': return BadgeCheck
    default: return CircleDot
  }
}

function getProgressStepColor(status: string, complete: boolean, current: boolean) {
  if (complete) return { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-500 text-white', text: 'text-emerald-700' }
  if (current) return { bg: 'bg-violet-50', border: 'border-violet-200', icon: 'bg-violet-500 text-white', text: 'text-violet-700' }
  return { bg: 'bg-gray-50', border: 'border-gray-200', icon: 'bg-gray-200 text-gray-500', text: 'text-gray-500' }
}

function CinematicStatusRow({ currentProgressIndex }: { currentProgressIndex: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mt-4 overflow-hidden rounded-xl border border-[var(--shop-border-light)] bg-gradient-to-r from-gray-50 via-white to-violet-50/40 p-2.5 shadow-sm"
    >
      <div className="flex items-stretch gap-0 overflow-x-auto pb-1">
        {SHOP_FULFILMENT_PROGRESS.map((status, index) => {
          const complete = index < currentProgressIndex
          const current = index === currentProgressIndex
          const StepIcon = getProgressStepIcon(status)
          return (
            <motion.div
              key={status}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.06 + index * 0.07 }}
              className="flex items-center flex-shrink-0"
            >
              <div className="flex items-center gap-1.5">
                <div className="relative flex h-7 w-7 items-center justify-center rounded-full">
                  {complete ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, delay: 0.1 + index * 0.05 }}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30"
                    >
                      <Check className="h-3.5 w-3.5 text-white" />
                    </motion.div>
                  ) : current ? (
                    <>
                      <motion.div
                        animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute inset-0 rounded-full bg-violet-400"
                      />
                      <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-violet-500 shadow-sm shadow-violet-500/30">
                        <StepIcon className="h-3.5 w-3.5 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200">
                      <StepIcon className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                  )}
                </div>
                <span className={`whitespace-nowrap text-[10px] font-bold ${complete ? 'text-emerald-700' : current ? 'text-violet-700' : 'text-gray-400'}`}>
                  {getShopFulfilmentStatusLabel(status)}
                </span>
              </div>
              {index < SHOP_FULFILMENT_PROGRESS.length - 1 && (
                <div className={`mx-1 h-px w-3 flex-shrink-0 ${complete ? 'bg-emerald-400' : 'bg-gray-200'}`} />
              )}
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

function getPaymentModeLabel(value: string | null) {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return 'Not set'
  if (normalized === 'razorpay') return 'Razorpay'
  if (normalized === 'payu') return 'PayU'
  if (normalized === 'cod' || normalized === 'cash_on_delivery' || normalized === 'cash on delivery') return 'Cash on Delivery'
  if (normalized === 'upi') return 'UPI'
  if (normalized === 'card') return 'Credit / Debit Card'
  if (normalized === 'netbanking') return 'Net Banking'
  if (normalized === 'wallet') return 'Wallet'
  if (normalized === 'emi') return 'EMI'
  if (normalized === 'bank_transfer') return 'Bank Transfer'
  if (normalized === 'paylater') return 'Pay Later'
  if (normalized === 'cardless_emi') return 'Cardless EMI'
  return value
}

function LoadingState() {
  return (
    <main className="relative isolate overflow-hidden px-4 pb-20 pt-5 md:px-8 md:pt-6 lg:px-16">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(118deg,#f9f7f4_0%,#ffffff_46%,#f5f3ff_100%)]" />
      <div className="mx-auto max-w-7xl space-y-4">
        {/* Hero skeleton */}
        <div className="overflow-hidden rounded-2xl border border-[var(--shop-border-light)] bg-white/85 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-xl bg-[var(--bg-muted)]" />
            <div className="h-4 w-24 animate-pulse rounded-full bg-[var(--bg-muted)]" />
          </div>
          <div className="mt-3 h-6 w-40 animate-pulse rounded-lg bg-[var(--bg-muted)]" />
          <div className="mt-2 flex gap-2">
            <div className="h-5 w-20 animate-pulse rounded-full bg-[var(--bg-muted)]" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-[var(--bg-muted)]" />
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 w-24 flex-shrink-0 animate-pulse rounded-xl bg-[var(--bg-muted)]" />
            ))}
          </div>
        </div>

        {/* Progress skeleton */}
        <div className="overflow-hidden rounded-2xl border border-[var(--shop-border-light)] bg-white/85 p-4 shadow-sm">
          <div className="h-4 w-32 animate-pulse rounded-full bg-[var(--bg-muted)]" />
          <div className="mt-3 grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-[var(--bg-muted)]" />
            ))}
          </div>
        </div>

        {/* Items skeleton */}
        <div className="overflow-hidden rounded-2xl border border-[var(--shop-border-light)] bg-white/85 p-4 shadow-sm">
          <div className="h-4 w-24 animate-pulse rounded-full bg-[var(--bg-muted)]" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="mt-3 flex gap-3">
              <div className="h-14 w-14 flex-shrink-0 animate-pulse rounded-xl bg-[var(--bg-muted)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--bg-muted)]" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--bg-muted)]" />
              </div>
            </div>
          ))}
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

      if (data.order.fulfilment_status === 'delivered') {
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
    const index = SHOP_FULFILMENT_PROGRESS.indexOf(order.fulfilment_status)
    return index === -1 ? SHOP_FULFILMENT_PROGRESS.length - 1 : index
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
          className="mx-auto max-w-3xl rounded-2xl border border-[var(--shop-border-light)] bg-white/88 p-6 text-center shadow-sm backdrop-blur-xl"
        >
          <XCircle className="mx-auto h-12 w-12 text-rose-600" />
          <h1 className="mt-3 text-lg font-bold text-[var(--shop-text-primary)]">Order not found</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--shop-text-secondary)]">
            {error || 'This order could not be loaded.'}
          </p>
          <Link href="/3d-shop/orders" className="inline-flex items-center rounded-[var(--shop-radius-lg)] bg-[var(--shop-text-primary)] text-sm font-semibold text-white transition hover:bg-[var(--shop-text-secondary)] mt-5 inline-flex min-h-[44px] items-center px-4 text-sm">
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
            className="fixed bottom-5 right-5 z-[120] max-w-sm rounded-xl border border-[var(--shop-border-light)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--shop-text-primary)] shadow-lg"
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
              className="w-full max-w-md rounded-2xl border border-[var(--shop-border-light)] bg-white p-5 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-[var(--shop-text-primary)]">
                      {dialogType === 'cancel' ? 'Cancel order?' : 'Request return?'}
                    </h2>
                    <p className="mt-1.5 text-sm text-[var(--shop-text-secondary)]">
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
                  className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--shop-border-light)] bg-white text-[var(--shop-text-muted)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={dialogType === 'cancel' ? 'Cancellation reason' : 'Return reason'}
                className="mt-4 min-h-[100px] w-full resize-y rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-3 text-sm text-[var(--shop-text-primary)] outline-none focus:border-[var(--shop-gold)]"
              />
              <div className="mt-4 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setDialogType(null)
                    setReason('')
                  }}
                  className="min-h-[40px] flex-1 rounded-lg border border-[var(--shop-border-light)] bg-white text-sm font-semibold text-[var(--shop-text-secondary)]"
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  onClick={() => void submitAction()}
                  disabled={!reason.trim() || actionLoading}
                  className="inline-flex items-center rounded-[var(--shop-radius-lg)] bg-[var(--shop-text-primary)] text-sm font-semibold text-white transition hover:bg-[var(--shop-text-secondary)] min-h-[40px] flex-1 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="relative z-10">{actionLoading ? 'Saving...' : 'Confirm'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-7xl space-y-4">
        {showNewSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center shadow-sm"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 240, damping: 18 }}
              className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-600 text-white"
            >
              <Check className="h-6 w-6" />
            </motion.div>
            <h1 className="mt-2 text-base font-bold text-emerald-800">Order Placed Successfully</h1>
            <p className="mt-0.5 text-[10px] font-medium text-emerald-700">Order #{order.order_number}</p>
          </motion.div>
        )}

        {/* Hero Section - Slim Modern Design */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden rounded-2xl border border-[var(--shop-border-light)] bg-white/82 p-4 shadow-sm backdrop-blur-xl md:p-5"
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,390px)] lg:items-start">
            <div className="min-w-0 self-start">
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                <Link href="/3d-shop/orders" className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[var(--shop-border-light)] bg-white px-2.5 text-xs font-semibold text-[var(--shop-text-secondary)] shadow-sm transition hover:border-[var(--border-brand)] hover:text-[var(--shop-gold)]">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </Link>

                <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-brand)] bg-[var(--brand-faint)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--shop-gold)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Order Detail
                </div>
              </div>

              <p className="mt-3 text-sm font-bold tracking-tight text-[var(--shop-text-primary)]">
                #{order.order_number}
              </p>
              <p className="mt-1.5 text-xs text-[var(--shop-text-secondary)]">
                Placed on {formatShopOrderDateTime(order.placed_at)}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                  order.order_status === 'cancelled' || order.order_status === 'returned'
                    ? getShopOrderStatusClasses(order.order_status)
                    : getShopFulfilmentStatusClasses(order.fulfilment_status)
                }`}>
                  {order.order_status === 'cancelled' || order.order_status === 'returned'
                    ? getShopOrderStatusLabel(order.order_status)
                    : getShopFulfilmentStatusLabel(order.fulfilment_status)}
                </span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getShopPaymentStatusClasses(order.payment_status)}`}>
                  {getShopPaymentStatusLabel(order.payment_status)}
                </span>
                <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                  {getPaymentModeLabel(order.payment_provider ?? order.payment_method)}
                </span>
              </div>

              {/* Compact Metrics - Horizontal Scroll */}
              <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                {[
                  { label: 'Items', value: `${itemCount}`, Icon: ShoppingBag, tone: 'text-violet-600', bg: 'bg-violet-50' },
                  { label: 'Total', value: formatShopPrice(order.total_amount), Icon: ReceiptText, tone: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Shipping', value: order.shipping_charge === 0 ? 'Free' : formatShopPrice(order.shipping_charge), Icon: Truck, tone: 'text-sky-600', bg: 'bg-sky-50' },
                  { label: 'Destination', value: order.shipping_address.city || 'Delivery', Icon: MapPin, tone: 'text-rose-600', bg: 'bg-rose-50' },
                ].map((metric, index) => {
                  const Icon = metric.Icon
                  return (
                    <motion.div
                      key={metric.label}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.06 }}
                      className="min-w-[100px] flex-shrink-0 rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-3"
                    >
                      <div className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${metric.bg}`}>
                        <Icon className={`h-3.5 w-3.5 ${metric.tone}`} />
                      </div>
                      <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--shop-text-muted)]">{metric.label}</div>
                      <div className="mt-0.5 truncate text-sm font-bold text-[var(--shop-text-primary)]">{metric.value}</div>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Product Image */}
            <div className="relative overflow-hidden rounded-xl border border-[var(--shop-border-light)] bg-white shadow-sm lg:self-stretch">
              {primaryItem?.productThumbnail ? (
                <div className="relative aspect-[4/3] min-h-[180px] bg-[var(--bg-muted)] lg:h-full lg:min-h-[280px]">
                  <Image
                    src={primaryItem.productThumbnail}
                    alt={primaryItem.productName}
                    fill
                    sizes="(min-width: 1024px) 390px, 100vw"
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_38%,rgba(255,255,255,0.96))]" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="line-clamp-1 text-base font-bold text-[var(--shop-text-primary)]">{primaryItem.productName}</div>
                    <div className="mt-0.5 line-clamp-1 text-xs text-[var(--shop-text-secondary)]">{primaryItem.variantLabel}</div>
                  </div>
                </div>
              ) : (
                <div className="grid aspect-[4/3] min-h-[180px] place-items-center bg-[linear-gradient(135deg,#f5f3ff,#ecfdf5)] p-4 text-center lg:h-full lg:min-h-[280px]">
                  <PackageCheck className="mx-auto h-12 w-12 text-emerald-600" />
                  <div className="mt-3 text-base font-bold text-[var(--shop-text-primary)]">Order package ready</div>
                </div>
              )}
            </div>
          </div>
        </motion.section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:items-start">
          <section className="space-y-4">
            {/* Fulfillment Timeline - Cinematic Row (Mobile) + Grid (Desktop) */}
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="rounded-2xl border border-[var(--shop-border-light)] bg-white/88 p-4 shadow-sm backdrop-blur-xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--shop-gold)]">
                    <CircleDot className="h-3.5 w-3.5" />
                    Fulfillment Timeline
                  </div>
                  <h2 className="mt-1.5 text-base font-bold text-[var(--shop-text-primary)]">Current order status</h2>
                </div>
                <span className={`w-fit rounded-full border px-2 py-0.5 text-xs font-bold ${
                  order.order_status === 'cancelled' || order.order_status === 'returned'
                    ? getShopOrderStatusClasses(order.order_status)
                    : getShopFulfilmentStatusClasses(order.fulfilment_status)
                }`}>
                  {order.order_status === 'cancelled' || order.order_status === 'returned'
                    ? getShopOrderStatusLabel(order.order_status)
                    : getShopFulfilmentStatusLabel(order.fulfilment_status)}
                </span>
              </div>

              {exceptionStatus ? (
                <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-orange-800">
                  <div className="flex items-start gap-2.5">
                    {order.order_status === 'cancelled' ? <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <RotateCcw className="mt-0.5 h-4 w-4 shrink-0" />}
                    <div>
                      <div className="text-sm font-bold">{getShopOrderStatusLabel(order.order_status)}</div>
                      {order.cancellation_reason && <div className="mt-1 text-xs text-orange-700">Reason: {order.cancellation_reason}</div>}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Mobile: Cinematic single row */}
                  <div className="sm:hidden">
                    <CinematicStatusRow currentProgressIndex={currentProgressIndex} />
                  </div>
                  {/* Desktop: Grid layout */}
                  <div className="mt-4 hidden gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-7">
                    {SHOP_FULFILMENT_PROGRESS.map((status, index) => {
                      const complete = index < currentProgressIndex
                      const current = index === currentProgressIndex
                      const colors = getProgressStepColor(status, complete, current)
                      const StepIcon = getProgressStepIcon(status)
                      return (
                        <motion.div
                          key={status}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.14 + index * 0.05 }}
                          className={`min-h-[64px] rounded-xl border p-2.5 ${colors.bg} ${colors.border}`}
                        >
                          <div className="flex h-full items-center gap-2 lg:flex-col lg:items-start lg:justify-between">
                            <div className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${colors.icon}`}>
                              {complete ? <Check className="h-3.5 w-3.5" /> : <StepIcon className="h-3.5 w-3.5" />}
                            </div>
                            <div className={`text-[11px] font-bold leading-tight ${colors.text}`}>
                              {getShopFulfilmentStatusLabel(status)}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </>
              )}
            </motion.section>

            {/* Items Ordered - Slim Cards */}
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="rounded-2xl border border-[var(--shop-border-light)] bg-white/88 p-4 shadow-sm backdrop-blur-xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--shop-gold)]">
                    <PackageCheck className="h-3.5 w-3.5" />
                    Items
                  </div>
                  <h2 className="mt-1.5 text-base font-bold text-[var(--shop-text-primary)]">Items ordered</h2>
                </div>
                <div className="rounded-full border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--shop-text-secondary)]">
                  {itemCount} item{itemCount === 1 ? '' : 's'}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {order.items.map((item, index) => (
                  <motion.article
                    key={`${item.skuId}-${item.customizationText ?? ''}`}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.16 + index * 0.05 }}
                    className="rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-3 transition hover:border-[var(--border-brand)] hover:bg-white"
                  >
                    <div className="flex gap-3">
                      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-[var(--bg-muted)]">
                        {item.productThumbnail ? (
                          <Image src={item.productThumbnail} alt={item.productName} fill sizes="56px" className="object-cover transition duration-500 hover:scale-105" />
                        ) : (
                          <div className="grid h-full place-items-center">
                            <Package className="h-6 w-6 text-[var(--shop-text-muted)]" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <ProductName item={item} />
                            <p className="mt-0.5 text-xs text-[var(--shop-text-muted)]">{item.variantLabel}</p>
                            {item.customizationText && (
                              <p className="mt-0.5 text-xs italic text-[var(--shop-text-secondary)]">Engraved: {item.customizationText}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--shop-text-muted)]">Line total</div>
                            <div className="text-sm font-bold text-[var(--shop-text-primary)]">{formatShopPrice(getShopOrderLineTotal(item))}</div>
                          </div>
                        </div>
                        <p className="mt-1.5 text-xs text-[var(--shop-text-secondary)]">
                          Qty {item.quantity} x {formatShopPrice(item.unitPrice)}
                        </p>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            </motion.section>

            {/* Reviews Section */}
            {eligibleReviews.length > 0 && (
              <motion.section
                id="reviews"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-500" />
                  <h2 className="text-base font-bold text-yellow-900">Review your items</h2>
                </div>
                <div className="mt-3 space-y-2.5">
                  {eligibleReviews.map((eligible) => {
                    const orderItem = order.items.find((item) => item.productId === eligible.productId)
                    return (
                      <div key={`${eligible.orderId}-${eligible.productId}`} className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-yellow-200 bg-white p-2.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--bg-muted)]">
                            {(eligible.productThumbnail || orderItem?.productThumbnail) ? (
                              <Image src={eligible.productThumbnail || orderItem?.productThumbnail || ''} alt={eligible.productName} fill sizes="40px" className="object-cover" />
                            ) : (
                              <div className="grid h-full place-items-center">
                                <Star className="h-4 w-4 text-yellow-500" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-[var(--shop-text-primary)]">{eligible.productName}</div>
                            {orderItem?.variantLabel && <div className="text-xs text-[var(--shop-text-muted)]">{orderItem.variantLabel}</div>}
                          </div>
                        </div>
                        <Link
                          href={orderItem?.productSlug ? `/3d-shop/product/${orderItem.productSlug}#reviews` : '/3d-shop'}
                          className="inline-flex items-center rounded-[var(--shop-radius-lg)] bg-[var(--shop-text-primary)] text-sm font-semibold text-white transition hover:bg-[var(--shop-text-secondary)] inline-flex min-h-[36px] items-center px-3 text-xs"
                        >
                          <span className="relative z-10">Write Review</span>
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </motion.section>
            )}

            {/* Address & Payment - Side by Side */}
            <div className="grid items-stretch gap-4 md:grid-cols-2">
              <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="h-full rounded-2xl border border-[var(--shop-border-light)] bg-white/88 p-4 shadow-sm backdrop-blur-xl"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50">
                    <MapPin className="h-3.5 w-3.5 text-rose-600" />
                  </span>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--shop-text-muted)]">Delivery</div>
                    <h2 className="text-sm font-bold text-[var(--shop-text-primary)]">Delivery address</h2>
                  </div>
                </div>
                <div className="mt-3 break-words text-xs leading-6 text-[var(--shop-text-secondary)]">
                  <div className="font-bold text-[var(--shop-text-primary)]">{order.shipping_address.name}</div>
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
                className="h-full rounded-2xl border border-[var(--shop-border-light)] bg-white/88 p-4 shadow-sm backdrop-blur-xl"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50">
                    <CreditCard className="h-3.5 w-3.5 text-violet-600" />
                  </span>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--shop-text-muted)]">Payment</div>
                    <h2 className="text-sm font-bold text-[var(--shop-text-primary)]">Payment info</h2>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-3">
                  <Banknote className="h-4 w-4 shrink-0 text-[var(--shop-gold)]" />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[var(--shop-text-primary)]">
                      {getPaymentModeLabel(order.payment_provider ?? order.payment_method)}
                    </div>
                    <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${getShopPaymentStatusClasses(order.payment_status)}`}>
                      {getShopPaymentStatusLabel(order.payment_status)}
                    </span>
                  </div>
                </div>
                {order.payment_status !== 'paid' && order.payment_method?.toLowerCase() !== 'cod' && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    <p className="font-bold">Payment is still pending or failed.</p>
                    <p className="mt-0.5">
                      You can retry the secure Razorpay checkout for this order.
                    </p>
                    <Link
                      href={`/3d-shop/payment/${order.id}`}
                      className="mt-2 inline-flex min-h-[36px] items-center justify-center rounded-lg bg-[var(--shop-gold)] px-3 text-xs font-bold text-white"
                    >
                      Complete payment
                    </Link>
                  </div>
                )}
              </motion.section>
            </div>

            {/* Tracking Section */}
            {(order.tracking_number || order.estimated_delivery) && (
              <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-[var(--shop-border-light)] bg-white/88 p-4 shadow-sm backdrop-blur-xl"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50">
                    <Truck className="h-3.5 w-3.5 text-sky-600" />
                  </span>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--shop-text-muted)]">Tracking</div>
                    <h2 className="text-sm font-bold text-[var(--shop-text-primary)]">Tracking info</h2>
                  </div>
                </div>
                {order.tracking_number && (
                  <div className="mt-3 rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-3 text-xs text-[var(--shop-text-secondary)]">
                    {order.courier_name && <div>Courier: <span className="font-bold text-[var(--shop-text-primary)]">{order.courier_name}</span></div>}
                    <div className="mt-0.5">Tracking: <span className="break-all font-bold text-[var(--shop-text-primary)]">{order.tracking_number}</span></div>
                    {order.tracking_url && (
                      <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--shop-gold)]">
                        Track Package
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}
                {order.estimated_delivery && (
                  <div className="mt-2 text-xs text-[var(--shop-text-secondary)]">
                    Expected by {formatShopOrderDate(order.estimated_delivery)}
                  </div>
                )}
              </motion.section>
            )}
          </section>

          {/* Receipt Sidebar - Mobile Compact */}
          <motion.aside
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="h-fit rounded-2xl border border-[var(--shop-border-light)] bg-white/90 p-4 shadow-sm backdrop-blur-xl lg:sticky lg:top-28 lg:self-start"
          >
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-brand)] bg-[var(--brand-faint)] text-[var(--shop-gold)]">
                <ReceiptText className="h-4 w-4" />
              </span>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--shop-text-muted)]">Receipt</div>
                <h2 className="text-sm font-bold text-[var(--shop-text-primary)]">Pricing summary</h2>
              </div>
            </div>

            <div className="mt-3 space-y-2 rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-3 text-xs">
              <div className="flex items-start justify-between gap-3 text-[var(--shop-text-secondary)]">
                <span className="min-w-0 break-words">Subtotal</span>
                <span className="shrink-0 font-bold text-[var(--shop-text-primary)]">{formatShopPrice(order.subtotal)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex items-start justify-between gap-3 text-emerald-700">
                  <span className="min-w-0 break-words">Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</span>
                  <span className="shrink-0 font-bold">-{formatShopPrice(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex items-start justify-between gap-3 text-[var(--shop-text-secondary)]">
                <span className="min-w-0 break-words">Shipping</span>
                <span className="shrink-0 font-bold text-[var(--shop-text-primary)]">{order.shipping_charge === 0 ? 'Free' : formatShopPrice(order.shipping_charge)}</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-[var(--shop-border-light)] pt-3">
              <span className="text-sm font-bold text-[var(--shop-text-primary)]">Total</span>
              <span className="text-right text-lg font-bold text-[var(--shop-text-primary)]">{formatShopPrice(order.total_amount)}</span>
            </div>

            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Server verified price, stock, and order details.
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {order.order_status === 'placed' && (
                <button
                  type="button"
                  onClick={() => setDialogType('cancel')}
                  className="flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-bold text-rose-700"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel Order
                </button>
              )}
              {isShopOrderReturnable(order.fulfilment_status, order.placed_at) && (
                <button
                  type="button"
                  onClick={() => setDialogType('return')}
                  className="flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 text-xs font-bold text-orange-700"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Request Return
                </button>
              )}
              <DownloadInvoiceButton />
              <Link href="/3d-shop" className="inline-flex items-center rounded-[var(--shop-radius-lg)] bg-[var(--shop-text-primary)] text-sm font-semibold text-white transition hover:bg-[var(--shop-text-secondary)] flex min-h-[40px] w-full items-center justify-center text-xs">
                <span className="relative z-10">Continue Shopping</span>
              </Link>
              <Link href="/3d-shop/orders" className="block rounded-lg border border-[var(--shop-border-light)] bg-white px-3 py-2.5 text-center text-xs font-bold text-[var(--shop-text-secondary)] transition hover:border-[var(--border-brand)] hover:text-[var(--shop-gold)]">
                Back to 3D Shop Orders
              </Link>
            </div>
          </motion.aside>
        </div>

        {/* Cinematic Featured Products */}
        <FeaturedProductsAd
          productId={order.items[0]?.productId}
        />
      </div>
    </main>
  )
}
