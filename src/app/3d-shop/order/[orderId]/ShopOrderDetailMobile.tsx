'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Banknote,
  Check,
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
  Star,
  Truck,
  X,
  XCircle,
} from 'lucide-react'
import { formatShopPrice } from '@/lib/shop/selection'
import { DownloadInvoiceButton } from './DownloadInvoiceButton'
import {
  formatShopOrderDate,
  getShopFulfilmentStatusClasses,
  getShopFulfilmentStatusLabel,
  getShopOrderLineTotal,
  getShopOrderStatusClasses,
  getShopOrderStatusLabel,
  getShopPaymentStatusClasses,
  getShopPaymentStatusLabel,
  isShopOrderCancellable,
  isShopOrderPaid,
  isShopOrderReturnable,
  SHOP_FULFILMENT_PROGRESS,
  type ShopOrder,
} from '@/lib/shop/orders'

type DialogType = 'cancel' | 'return'

type EligibleReviewProduct = {
  productId: string
  productName: string
  productThumbnail: string | null
  orderId: string
  orderNumber: string
}

function getProgressStepIcon(status: string) {
  switch (status) {
    case 'pending': return Clock
    case 'processing': return Settings
    case 'packing': return Package
    case 'packed': return Check
    case 'shipped': return Truck
    case 'delivering': return Truck
    case 'delivered': return PackageCheck
    default: return CircleDot
  }
}

function getProgressStepColor(status: string, complete: boolean, current: boolean) {
  if (complete) return { bg: 'bg-[var(--shop-gold-faint)]', border: 'border-[var(--shop-border-gold)]', icon: 'bg-[var(--shop-gold)] text-[var(--luxury-charcoal)]', text: 'text-[var(--shop-gold)]' }
  if (current) return { bg: 'bg-[var(--shop-brand-faint)]', border: 'border-[var(--shop-border-indigo)]', icon: 'bg-[var(--shop-brand-primary)] text-white', text: 'text-[var(--shop-brand-primary)]' }
  return { bg: 'bg-gray-50', border: 'border-gray-200', icon: 'bg-gray-200 text-gray-500', text: 'text-gray-500' }
}

function getPaymentModeLabel(value: string | null) {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return 'Not set'
  if (normalized === 'razorpay') return 'Razorpay'
  if (normalized === 'payu') return 'PayU'
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

function getOrderItemCount(order: ShopOrder) {
  return order.items.reduce((count, item) => count + Number(item.quantity || 0), 0)
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-[var(--shop-border-light)] bg-white/85 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-xl bg-[var(--shop-bg-muted)]" />
          <div className="h-4 w-24 animate-pulse rounded-full bg-[var(--shop-bg-muted)]" />
        </div>
        <div className="mt-3 h-6 w-40 animate-pulse rounded-lg bg-[var(--shop-bg-muted)]" />
        <div className="mt-2 flex gap-2">
          <div className="h-5 w-20 animate-pulse rounded-full bg-[var(--shop-bg-muted)]" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-[var(--shop-bg-muted)]" />
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[var(--shop-border-light)] bg-white/85 p-4 shadow-sm">
        <div className="h-4 w-32 animate-pulse rounded-full bg-[var(--shop-bg-muted)]" />
        <div className="mt-3 grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-[var(--shop-bg-muted)]" />
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[var(--shop-border-light)] bg-white/85 p-4 shadow-sm">
        <div className="h-4 w-24 animate-pulse rounded-full bg-[var(--shop-bg-muted)]" />
        <div className="mt-3 flex gap-3">
          <div className="h-14 w-14 flex-shrink-0 animate-pulse rounded-xl bg-[var(--shop-bg-muted)]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--shop-bg-muted)]" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--shop-bg-muted)]" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ShopOrderDetailMobile({ orderId }: { orderId: string }) {
  const searchParams = useSearchParams()
  const [order, setOrder] = useState<ShopOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogType, setDialogType] = useState<DialogType | null>(null)
  const [reason, setReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [eligibleReviews, setEligibleReviews] = useState<EligibleReviewProduct[]>([])

  const loadOrder = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/3d-shop/orders/${orderId}`)
      const data = await response.json().catch(() => ({})) as { order?: ShopOrder; error?: string }
      if (!response.ok || !data.order) throw new Error(data.error || 'Order not found.')
      setOrder(data.order)
      try {
        const eligibleResponse = await fetch('/api/3d-shop/reviews/eligible')
        const eligibleData = await eligibleResponse.json().catch(() => []) as EligibleReviewProduct[]
        setEligibleReviews(eligibleResponse.ok && Array.isArray(eligibleData)
          ? eligibleData.filter((item) => item.orderId === data.order?.id)
          : [])
      } catch {
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

  const currentProgressIndex = order ? SHOP_FULFILMENT_PROGRESS.indexOf(order.fulfilment_status) : -1
  const itemCount = order ? getOrderItemCount(order) : 0
  const exceptionStatus = order?.order_status === 'cancelled' || order?.order_status === 'return_requested' || order?.order_status === 'returned'

  useEffect(() => {
    if (loading || !searchParams?.get('reviews')) return
    if (eligibleReviews.length > 0) {
      document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [loading, eligibleReviews, searchParams])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(timer)
  }, [toast])

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
      <div className="rounded-2xl border border-[var(--shop-border-light)] bg-white/88 p-6 text-center shadow-sm backdrop-blur-xl">
        <XCircle className="mx-auto h-12 w-12 text-rose-600" />
        <h1 className="mt-3 text-lg font-bold text-[var(--shop-text-primary)]">Order not found</h1>
        <p className="mt-2 text-sm text-[var(--shop-text-secondary)]">{error || 'This order could not be loaded.'}</p>
        <Link href="/3d-shop/orders" className="inline-flex items-center rounded-[var(--shop-radius-lg)] bg-[var(--shop-text-primary)] text-sm font-semibold text-white transition hover:bg-[var(--shop-text-secondary)] mt-5 inline-flex min-h-[44px] items-center px-4 text-sm">
          <span className="relative z-10">View 3D Shop Orders</span>
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-[120] max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--shop-border-light)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--shop-text-primary)] shadow-lg sm:bottom-5 sm:right-5 sm:max-w-sm">
          {toast}
        </div>
      )}

      {/* Cancel/Return Dialog */}
      {dialogType && (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-[#2e1065]/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[var(--shop-border-light)] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
                  <XCircle className="h-4 w-4" />
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
                onClick={() => { setDialogType(null); setReason('') }}
                aria-label="Close dialog"
                className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--shop-border-light)] bg-white text-[var(--shop-text-muted)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={dialogType === 'cancel' ? 'Cancellation reason' : 'Return reason'}
              className="mt-4 min-h-[100px] w-full resize-y rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-3 text-sm text-[var(--shop-text-primary)] outline-none focus:border-[var(--shop-gold)]"
            />
            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={() => { setDialogType(null); setReason('') }}
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
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Hero Section */}
        <section className="overflow-hidden rounded-2xl border border-[var(--shop-border-light)] bg-white/82 p-4 shadow-sm backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <Link href="/3d-shop/orders" aria-label="Back to my orders" className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-[var(--shop-border-light)] bg-white px-2 text-xs font-semibold text-[var(--shop-text-secondary)] shadow-sm transition hover:border-[var(--shop-border-gold)] hover:text-[var(--shop-gold)]">
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--shop-gold)]">
              Order Detail
            </div>
          </div>

          <p className="mt-3 text-sm font-bold tracking-tight text-[var(--shop-text-primary)]">
            #{order.order_number}
          </p>
          <p className="mt-1 text-xs text-[var(--shop-text-secondary)]">
            Placed on {formatShopOrderDate(order.placed_at)}
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
            ].map((metric) => {
              const Icon = metric.Icon
              return (
                <div
                  key={metric.label}
                  className="min-w-[100px] flex-shrink-0 rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-3"
                >
                  <div className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${metric.bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${metric.tone}`} />
                  </div>
                  <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--shop-text-muted)]">{metric.label}</div>
                  <div className="mt-0.5 truncate text-sm font-bold text-[var(--shop-text-primary)]">{metric.value}</div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Fulfillment Timeline */}
        {!exceptionStatus && (
          <section className="rounded-2xl border border-[var(--shop-border-light)] bg-white/88 p-4 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--shop-gold)]">
                  <CircleDot className="h-3.5 w-3.5" />
                  Fulfillment
                </div>
                <h2 className="mt-1 text-sm font-bold text-[var(--shop-text-primary)]">Order status</h2>
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

            <div className="mt-3 grid grid-cols-4 gap-2">
              {SHOP_FULFILMENT_PROGRESS.map((status, index) => {
                const complete = index < currentProgressIndex
                const current = index === currentProgressIndex
                const colors = getProgressStepColor(status, complete, current)
                const StepIcon = getProgressStepIcon(status)
                return (
                  <div
                    key={status}
                    className={`min-h-[56px] rounded-xl border p-2 ${colors.bg} ${colors.border}`}
                  >
                    <div className="flex h-full flex-col items-center justify-between gap-1">
                      <div className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold ${colors.icon}`}>
                        {complete ? <Check className="h-3 w-3" /> : <StepIcon className="h-3 w-3" />}
                      </div>
                      <div className={`text-[9px] font-bold leading-tight text-center ${colors.text}`}>
                        {getShopFulfilmentStatusLabel(status)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Exception Status */}
        {exceptionStatus && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-orange-800">
            <div className="flex items-start gap-2.5">
              {order.order_status === 'cancelled' ? <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <RotateCcw className="mt-0.5 h-4 w-4 shrink-0" />}
              <div>
                <div className="text-sm font-bold">{getShopOrderStatusLabel(order.order_status)}</div>
                {order.cancellation_reason && <div className="mt-1 text-xs text-orange-700">Reason: {order.cancellation_reason}</div>}
              </div>
            </div>
          </div>
        )}

        {/* Items Ordered */}
        <section className="rounded-2xl border border-[var(--shop-border-light)] bg-white/88 p-4 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--shop-gold)]">
                <PackageCheck className="h-3.5 w-3.5" />
                Items
              </div>
              <h2 className="mt-1 text-sm font-bold text-[var(--shop-text-primary)]">Items ordered</h2>
            </div>
            <div className="rounded-full border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] px-2 py-0.5 text-xs font-bold text-[var(--shop-text-secondary)]">
              {itemCount} item{itemCount === 1 ? '' : 's'}
            </div>
          </div>

          <div className="mt-3 space-y-3">
            {order.items.map((item) => (
              <div
                key={`${item.skuId}-${item.customizationText ?? ''}`}
                className="rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-3"
              >
                <div className="flex gap-3">
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-[var(--shop-bg-muted)]">
                    {item.productThumbnail ? (
                      <Image src={item.productThumbnail} alt={item.productName} fill sizes="56px" className="object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center">
                        <Package className="h-6 w-6 text-[var(--shop-text-muted)]" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-[var(--shop-text-primary)] transition hover:text-[var(--shop-gold)]">
                          {item.productSlug ? (
                            <Link href={`/3d-shop/product/${item.productSlug}`}>{item.productName}</Link>
                          ) : (
                            item.productName
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-[var(--shop-text-muted)]">{item.variantLabel}</p>
                        {item.customizationText && (
                          <p className="mt-0.5 text-xs italic text-[var(--shop-text-secondary)]">Engraved: {item.customizationText}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--shop-text-muted)]">Total</div>
                        <div className="text-sm font-bold text-[var(--shop-text-primary)]">{formatShopPrice(getShopOrderLineTotal(item))}</div>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-[var(--shop-text-secondary)]">
                      Qty {item.quantity} x {formatShopPrice(item.unitPrice)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Reviews */}
        {eligibleReviews.length > 0 && (
          <section
            id="reviews"
            className="rounded-2xl border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)] p-4 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-[var(--shop-gold)] text-[var(--shop-gold)]" />
              <h2 className="text-sm font-bold text-yellow-900">Review your items</h2>
            </div>
            <div className="mt-3 space-y-2.5">
              {eligibleReviews.map((eligible) => {
                const orderItem = order.items.find((item) => item.productId === eligible.productId)
                return (
                  <div key={`${eligible.orderId}-${eligible.productId}`} className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-yellow-200 bg-white p-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--shop-bg-muted)]">
                        {(eligible.productThumbnail || orderItem?.productThumbnail) ? (
                          <Image src={eligible.productThumbnail || orderItem?.productThumbnail || ''} alt={eligible.productName} fill sizes="40px" className="object-cover" />
                        ) : (
                          <div className="grid h-full place-items-center">
                            <Star className="h-4 w-4 text-[var(--shop-gold)]" />
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
                      className="inline-flex min-h-[36px] items-center rounded-[var(--shop-radius-lg)] bg-[var(--shop-text-primary)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--shop-text-secondary)]"
                    >
                      Write Review
                    </Link>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Address & Payment */}
        <div className="grid items-stretch gap-3">
          {/* Address */}
          <section className="rounded-2xl border border-[var(--shop-border-light)] bg-white/88 p-4 shadow-sm backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50">
                <MapPin className="h-3.5 w-3.5 text-rose-600" />
              </span>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--shop-text-muted)]">Delivery</div>
                <h2 className="text-sm font-bold text-[var(--shop-text-primary)]">Address</h2>
              </div>
            </div>
            <div className="mt-3 break-words text-xs leading-6 text-[var(--shop-text-secondary)]">
              <div className="font-bold text-[var(--shop-text-primary)]">{order.shipping_address.name}</div>
              <div>{order.shipping_address.phone}</div>
              <div>{order.shipping_address.line1}</div>
              {order.shipping_address.line2 && <div>{order.shipping_address.line2}</div>}
              <div>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.pincode}</div>
            </div>
          </section>

          {/* Payment */}
          <section className="rounded-2xl border border-[var(--shop-border-light)] bg-white/88 p-4 shadow-sm backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50">
                <CreditCard className="h-3.5 w-3.5 text-violet-600" />
              </span>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--shop-text-muted)]">Payment</div>
                <h2 className="text-sm font-bold text-[var(--shop-text-primary)]">Info</h2>
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
            {order.payment_status !== 'paid' && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-bold">Payment is still pending or failed.</p>
                <Link
                  href={`/3d-shop/payment/${order.id}`}
                  className="mt-2 inline-flex min-h-[36px] items-center justify-center rounded-lg bg-[var(--shop-gold)] px-3 text-xs font-bold text-[var(--luxury-charcoal)]"
                >
                  Complete payment
                </Link>
              </div>
            )}
            <div className="mt-3">
              {isShopOrderPaid(order.payment_status) && <DownloadInvoiceButton orderId={order.id} />}
            </div>
          </section>
        </div>

        {/* Pricing Summary */}
        <section className="rounded-2xl border border-[var(--shop-border-light)] bg-white/88 p-4 shadow-sm backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)] text-[var(--shop-gold)]">
              <ReceiptText className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--shop-text-muted)]">Receipt</div>
              <h2 className="text-sm font-bold text-[var(--shop-text-primary)]">Pricing</h2>
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
        </section>

        {/* Tracking */}
        {(order.tracking_number || order.estimated_delivery) && (
          <section className="rounded-2xl border border-[var(--shop-border-light)] bg-white/88 p-4 shadow-sm backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50">
                <Truck className="h-3.5 w-3.5 text-sky-600" />
              </span>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--shop-text-muted)]">Tracking</div>
                <h2 className="text-sm font-bold text-[var(--shop-text-primary)]">Info</h2>
              </div>
            </div>
            {order.tracking_number && (
              <div className="mt-3 rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-3 text-xs text-[var(--shop-text-secondary)]">
                {order.courier_name && <div>Courier: <span className="font-bold text-[var(--shop-text-primary)]">{order.courier_name}</span></div>}
                <div className="mt-0.5">Tracking: <span className="break-all font-bold text-[var(--shop-text-primary)]">{order.tracking_number}</span></div>
              </div>
            )}
            {order.estimated_delivery && (
              <div className="mt-2 text-xs text-[var(--shop-text-secondary)]">
                Expected by {formatShopOrderDate(order.estimated_delivery)}
              </div>
            )}
            {order.tracking_events && order.tracking_events.length > 0 && (
              <div className="mt-3 rounded-xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--shop-text-muted)]">Journey</div>
                <ol className="mt-2 space-y-2.5">
                  {[...order.tracking_events].reverse().slice(0, 10).map((event, index) => (
                    <li key={`${event.date}-${index}`} className="flex gap-2.5 text-xs">
                      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${index === 0 ? 'bg-[var(--shop-gold)]' : 'bg-[var(--shop-border-medium)]'}`} />
                      <div className="min-w-0">
                        <div className={`font-bold ${index === 0 ? 'text-[var(--shop-text-primary)]' : 'text-[var(--shop-text-secondary)]'}`}>
                          {event.activity || event.label || event.status}
                        </div>
                        <div className="mt-0.5 text-[11px] font-semibold text-[var(--shop-text-muted)]">
                          {event.date}
                          {event.location ? ` · ${event.location}` : ''}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        )}

        {/* Spacer for sticky bottom bar */}
        <div className="h-20" />
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--shop-border-light)] bg-white/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-xl">
        <div className="mx-auto max-w-lg space-y-2">
          {isShopOrderCancellable(order.order_status) && (
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
          <div className="flex gap-2">
            <Link href="/3d-shop" className="inline-flex items-center rounded-[var(--shop-radius-lg)] bg-[var(--shop-text-primary)] text-sm font-semibold text-white transition hover:bg-[var(--shop-text-secondary)] flex min-h-[40px] flex-1 items-center justify-center text-xs">
              <span className="relative z-10">Continue Shopping</span>
            </Link>
            <Link href="/3d-shop/orders" className="flex min-h-[40px] flex-1 items-center justify-center rounded-lg border border-[var(--shop-border-light)] bg-white text-xs font-bold text-[var(--shop-text-secondary)] transition hover:border-[var(--shop-border-gold)] hover:text-[var(--shop-gold)]">
              All Orders
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
