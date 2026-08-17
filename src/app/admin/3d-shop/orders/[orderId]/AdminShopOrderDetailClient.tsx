'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Banknote, ChevronDown, ChevronUp, Copy, ExternalLink, FileText, PackageCheck, Printer, RotateCcw, Save, ShieldCheck, Truck } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import { formatShopPrice } from '@/lib/shop/selection'
import {
  formatShopOrderDateTime,
  formatShopPriceFromPaise,
  getShopFulfilmentStatusClasses,
  getShopFulfilmentStatusLabel,
  getShopOrderLineTotal,
  getShopOrderStatusClasses,
  getShopOrderStatusLabel,
  getShopPaymentMethodLabel,
  getShopPaymentProviderLabel,
  getShopPaymentRefundStatusClasses,
  getShopPaymentRefundStatusLabel,
  getShopPaymentStatusClasses,
  getShopPaymentStatusLabel,
  SHOP_FULFILMENT_PROGRESS,
  shopFulfilmentStatuses,
  type ShopAdminOrder,
  type ShopOrderStatus,
  type ShopFulfilmentStatus,
  type ShopPaymentAttempt,
  type ShopPaymentStatus,
} from '@/lib/shop/orders'

const lifecycleStatuses: ShopOrderStatus[] = ['placed', 'confirmed', 'cancelled', 'return_requested', 'returned']

const fulfilmentStatuses: ShopFulfilmentStatus[] = [...shopFulfilmentStatuses]

const paymentStatuses: ShopPaymentStatus[] = ['pending', 'paid', 'failed', 'refunded']

type TrackingForm = {
  courier_name: string
  tracking_number: string
  tracking_url: string
  estimated_delivery: string
}

function getDateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : ''
}

function razorpayDashboardUrl(kind: 'order' | 'payment', id: string | null | undefined) {
  if (!id) return null
  if (kind === 'order') return `https://dashboard.razorpay.com/app/orders/${id}`
  return `https://dashboard.razorpay.com/app/payments/${id}`
}

function CopyableId({ value, label, href }: { value: string | null | undefined; label: string; href?: string | null }) {
  const [copied, setCopied] = useState(false)
  if (!value) {
    return (
      <div className="flex flex-col">
        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">{label}</span>
        <span className="mt-1 text-sm text-[#6F7192]">—</span>
      </div>
    )
  }
  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(value).then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      })
    }
  }
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <code className="break-all rounded-md bg-gray-50 px-2 py-1 font-mono text-xs text-[#0F1B3D]">{value}</code>
        <button
          type="button"
          onClick={handleCopy}
          className="grid h-7 w-7 place-items-center rounded-md border border-gray-200 bg-white text-[#6F7192] transition hover:border-[#6d28d9]/30 hover:text-[#6d28d9]"
          aria-label={`Copy ${label}`}
          title={copied ? 'Copied' : `Copy ${label}`}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="grid h-7 w-7 place-items-center rounded-md border border-gray-200 bg-white text-[#6F7192] transition hover:border-[#6d28d9]/30 hover:text-[#6d28d9]"
            aria-label={`Open ${label} on Razorpay`}
            title="Open in Razorpay dashboard"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  )
}

function PaymentInfoSection({
  order,
  paymentAttempt,
  showSnapshot,
  onToggleSnapshot,
  onRefresh,
  onToast,
}: {
  order: ShopAdminOrder
  paymentAttempt: ShopPaymentAttempt | null
  showSnapshot: boolean
  onToggleSnapshot: () => void
  onRefresh: () => Promise<void>
  onToast: (toast: AdminToastState) => void
}) {
  const providerLabel = getShopPaymentProviderLabel(order.payment_provider)
  const methodLabel = getShopPaymentMethodLabel(order.payment_method ?? paymentAttempt?.payment_method ?? null)
  const purposeLabel = order.payment_purpose === 'shop_order' ? 'Shop Order' : (order.payment_purpose ?? '—')
  const totalPaise = order.payment_amount_paise > 0 ? order.payment_amount_paise : order.total_amount_paise || Math.round(order.total_amount * 100)
  const totalDisplay = totalPaise > 0
    ? formatShopPriceFromPaise(totalPaise, order.payment_currency)
    : formatShopPrice(order.total_amount)

  const showFailure =
    order.payment_status === 'failed' || order.payment_status === 'cancelled'
  const failureCode = paymentAttempt?.failure_code ?? null
  const failureDescription = paymentAttempt?.failure_description ?? null
  const hasRefund = order.payment_refund_status && order.payment_refund_status !== 'none'
  const snapshot = order.payment_snapshot
  const hasSnapshot = snapshot && Object.keys(snapshot).length > 0

  const canRefund = ['paid', 'captured', 'partially_refunded'].includes(order.payment_status)
  const totalPaiseNum = order.payment_amount_paise > 0 ? order.payment_amount_paise : order.total_amount_paise || Math.round(order.total_amount * 100)
  const shippingPaise = order.shipping_charge_paise || Math.round(order.shipping_charge * 100)
  const alreadyRefundedPaise = order.payment_refund_amount_paise || 0
  const fullRefundPaise = Math.max(0, totalPaiseNum - shippingPaise - alreadyRefundedPaise)
  const maxRefundPaise = Math.max(0, totalPaiseNum - alreadyRefundedPaise)

  const [refundMode, setRefundMode] = useState<'idle' | 'expanded'>('idle')
  const [refundPreset, setRefundPreset] = useState<'full' | 'custom'>('full')
  const [customAmountRupee, setCustomAmountRupee] = useState('')
  const [refundReason, setRefundReason] = useState('Admin initiated refund')
  const [refundSpeed, setRefundSpeed] = useState<'normal' | 'optimum'>('normal')
  const [refunding, setRefunding] = useState(false)

  // Stable ref for onRefresh to avoid stale closures in the polling interval
  const onRefreshRef = useRef(onRefresh)
  useEffect(() => {
    onRefreshRef.current = onRefresh
  })

  // Poll for refund status updates when refund is in a pending/processing state
  const pollActive = ['pending', 'pending_approval', 'partial'].includes(order.payment_refund_status ?? '')
  useEffect(() => {
    if (!pollActive) return

    const interval = setInterval(() => {
      void onRefreshRef.current()
    }, 10000)

    return () => clearInterval(interval)
  }, [pollActive])

  const customAmountPaise = Math.round(parseFloat(customAmountRupee) * 100)
  const refundAmountPaise = refundPreset === 'full' ? fullRefundPaise : (isNaN(customAmountPaise) ? 0 : customAmountPaise)
  const maxRefundRupee = maxRefundPaise / 100
  const isRefundValid = refundAmountPaise > 0 && refundAmountPaise <= maxRefundPaise

  async function initiateRefundAction() {
    if (!paymentAttempt?.id || !isRefundValid) return
    setRefunding(true)
    try {
      const response = await fetch(`/api/admin/payments/${paymentAttempt.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountPaise: refundAmountPaise,
          reason: refundReason,
          speed: refundSpeed,
        }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        refund?: Record<string, unknown>
        approvalRequired?: boolean
        error?: string
      }

      if (!response.ok) throw new Error(data.error || 'Failed to initiate refund.')

      if (data.approvalRequired) {
        onToast({ type: 'info', message: 'Refund requires second-person approval. An approval request has been created.' })
      } else {
        onToast({ type: 'success', message: `Refund of ${formatShopPriceFromPaise(refundAmountPaise, order.payment_currency)} initiated successfully.` })
      }

      setRefundMode('idle')
      setRefundPreset('full')
      setCustomAmountRupee('')
      setRefundReason('Admin initiated refund')
      await onRefresh()
    } catch (error) {
      onToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to initiate refund.' })
    } finally {
      setRefunding(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="!text-base font-bold text-[#0F1B3D]">Payment Info</h2>
          <p className="mt-1 text-xs text-[#6F7192]">Complete payment lifecycle and provider metadata.</p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getShopPaymentStatusClasses(order.payment_status)}`}>
          {getShopPaymentStatusLabel(order.payment_status)}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-white text-[#6d28d9] shadow-sm">
            <Banknote className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">Provider</div>
            <div className="mt-0.5 text-sm font-semibold text-[#0F1B3D]">{providerLabel}</div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">Amount</div>
          <div className="mt-1 text-lg font-bold text-[#0F1B3D]">{totalDisplay}</div>
          <div className="text-[11px] text-[#6F7192]">{order.payment_currency || 'INR'}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">Payment Method</div>
          <div className="mt-1 text-sm font-semibold text-[#0F1B3D]">{methodLabel}</div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">Purpose</div>
          <div className="mt-1 text-sm font-semibold text-[#0F1B3D]">{purposeLabel}</div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">Attempts</div>
          <div className="mt-1 text-sm font-semibold text-[#0F1B3D]">
            {paymentAttempt?.attempt_number ?? 1}
            {paymentAttempt?.status ? ` · ${paymentAttempt.status}` : ''}
          </div>
        </div>
      </div>

      <div className="my-4 border-t border-gray-100" />

      <div className="grid gap-4 sm:grid-cols-2">
        <CopyableId
          label="Provider Order ID"
          value={order.provider_order_id}
          href={razorpayDashboardUrl('order', order.provider_order_id)}
        />
        <CopyableId
          label="Provider Payment ID"
          value={order.provider_payment_id}
          href={razorpayDashboardUrl('payment', order.provider_payment_id)}
        />
        {order.payment_id && (
          <CopyableId label="Local Payment ID" value={order.payment_id} />
        )}
        {paymentAttempt && (
          <CopyableId label="Payment Attempt ID" value={paymentAttempt.id} />
        )}
      </div>

      <div className="my-4 border-t border-gray-100" />

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">Order Placed</div>
          <div className="mt-1 text-sm font-semibold text-[#0F1B3D]">{formatShopOrderDateTime(order.placed_at)}</div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">Verified At</div>
          <div className="mt-1 text-sm font-semibold text-[#0F1B3D]">
            {order.payment_verified_at ? formatShopOrderDateTime(order.payment_verified_at) : '—'}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">Failed At</div>
          <div className="mt-1 text-sm font-semibold text-[#0F1B3D]">
            {order.payment_failed_at ? formatShopOrderDateTime(order.payment_failed_at) : '—'}
          </div>
        </div>
      </div>

      {hasRefund && (
        <>
          <div className="my-4 border-t border-gray-100" />
          <div className={`rounded-xl border p-4 ${
            order.payment_refund_status === 'completed' || order.payment_refund_status === 'processed'
              ? 'border-emerald-200 bg-emerald-50'
              : order.payment_refund_status === 'failed'
                ? 'border-rose-200 bg-rose-50'
                : 'border-amber-200 bg-amber-50'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-orange-700">Refund</div>
                <div className="mt-1 text-sm font-bold text-orange-900">
                  {getShopPaymentRefundStatusLabel(order.payment_refund_status)}
                </div>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getShopPaymentRefundStatusClasses(order.payment_refund_status)}`}>
                {getShopPaymentRefundStatusLabel(order.payment_refund_status)}
              </span>
            </div>

            {pollActive && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-100/50 px-3 py-2">
                <svg className="h-3.5 w-3.5 animate-spin text-amber-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-xs font-medium text-amber-700">Awaiting confirmation from payment gateway — checking every 10s...</span>
              </div>
            )}

            {(order.payment_refund_status === 'completed' || order.payment_refund_status === 'processed') && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-100/50 px-3 py-2">
                <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-medium text-emerald-700">Refund confirmed by payment gateway</span>
              </div>
            )}

            {order.payment_refund_status === 'failed' && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-100/50 px-3 py-2">
                <svg className="h-3.5 w-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-xs font-medium text-rose-700">Refund failed — check payment gateway dashboard</span>
              </div>
            )}

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-orange-700">Refunded Amount</div>
                <div className="mt-1 text-sm font-bold text-orange-900">
                  {order.payment_refund_amount_paise > 0
                    ? formatShopPriceFromPaise(order.payment_refund_amount_paise, order.payment_currency)
                    : '—'}
                </div>
              </div>
              {paymentAttempt?.metadata && typeof (paymentAttempt.metadata as Record<string, unknown>).refund === 'object' && (
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-orange-700">Refund ID</div>
                  <div className="mt-1 font-mono text-xs text-orange-900">
                    {String(((paymentAttempt.metadata as Record<string, unknown>).refund as Record<string, unknown>)?.id ?? '—')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {showFailure && (failureCode || failureDescription) && (
        <>
          <div className="my-4 border-t border-gray-100" />
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-rose-700">Failure Details</div>
            {failureCode && (
              <div className="mt-2 grid gap-1">
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-rose-700">Error Code</span>
                <code className="rounded-md bg-white px-2 py-1 font-mono text-xs text-rose-900">{failureCode}</code>
              </div>
            )}
            {failureDescription && (
              <div className="mt-2">
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-rose-700">Description</span>
                <div className="mt-1 text-sm text-rose-900">{failureDescription}</div>
              </div>
            )}
          </div>
        </>
      )}

      {hasSnapshot && (
        <>
          <div className="my-4 border-t border-gray-100" />
          <button
            type="button"
            onClick={onToggleSnapshot}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#6d28d9] hover:underline"
          >
            {showSnapshot ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showSnapshot ? 'Hide raw payment data' : 'Show raw payment data'}
          </button>
          {showSnapshot && (
            <pre data-lenis-prevent className="mt-3 max-h-72 overflow-auto rounded-xl border border-gray-100 bg-gray-900 p-4 text-[11px] leading-relaxed text-gray-100">
              {JSON.stringify(snapshot, null, 2)}
            </pre>
          )}
        </>
      )}

      {canRefund && paymentAttempt?.id && (
        <>
          <div className="my-4 border-t border-gray-100" />

          {refundMode === 'idle' ? (
            <button
              type="button"
              onClick={() => setRefundMode('expanded')}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
            >
              <RotateCcw className="h-4 w-4" />
              Initiate Refund
            </button>
          ) : (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-bold uppercase tracking-[0.15em] text-rose-700">Initiate Refund</div>
                <button
                  type="button"
                  onClick={() => { setRefundMode('idle'); setRefundPreset('full'); setCustomAmountRupee('') }}
                  className="text-xs font-semibold text-rose-700 hover:underline"
                >
                  Cancel
                </button>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setRefundPreset('full')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                    refundPreset === 'full'
                      ? 'border-rose-400 bg-white text-rose-800 shadow-sm'
                      : 'border-transparent bg-white/60 text-rose-700 hover:bg-white'
                  }`}
                >
                  Full (excl. shipping)
                  <div className="mt-0.5 font-mono text-[10px] opacity-75">
                    {formatShopPriceFromPaise(fullRefundPaise, order.payment_currency)}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setRefundPreset('custom')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                    refundPreset === 'custom'
                      ? 'border-rose-400 bg-white text-rose-800 shadow-sm'
                      : 'border-transparent bg-white/60 text-rose-700 hover:bg-white'
                  }`}
                >
                  Custom
                  <div className="mt-0.5 font-mono text-[10px] opacity-75">
                    Max {formatShopPriceFromPaise(maxRefundPaise, order.payment_currency)}
                  </div>
                </button>
              </div>

              {refundPreset === 'custom' && (
                <label className="mt-3 block">
                  <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-rose-700">Amount (₹)</span>
                  <input
                    type="number"
                    min={1}
                    max={maxRefundRupee}
                    step={0.01}
                    value={customAmountRupee}
                    onChange={(event) => setCustomAmountRupee(event.target.value)}
                    placeholder={`Max ₹${maxRefundRupee.toFixed(2)}`}
                    className="mt-1 w-full rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm text-[#0F1B3D] outline-none focus:border-rose-500"
                  />
                </label>
              )}

              <label className="mt-3 block">
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-rose-700">Reason</span>
                <textarea
                  value={refundReason}
                  onChange={(event) => setRefundReason(event.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm text-[#0F1B3D] outline-none focus:border-rose-500"
                />
              </label>

              <label className="mt-3 block">
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-rose-700">Speed</span>
                <select
                  value={refundSpeed}
                  onChange={(event) => setRefundSpeed(event.target.value as 'normal' | 'optimum')}
                  className="mt-1 w-full rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm text-[#0F1B3D] outline-none focus:border-rose-500"
                >
                  <option value="normal">Normal</option>
                  <option value="optimum">Optimum (faster)</option>
                </select>
              </label>

              <div className="mt-3 rounded-lg border border-rose-200 bg-white px-3 py-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#6F7192]">Amount to refund</span>
                  <span className="font-bold text-rose-800">
                    {refundAmountPaise > 0
                      ? formatShopPriceFromPaise(refundAmountPaise, order.payment_currency)
                      : '—'}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-[#6F7192]">
                  <span>Already refunded</span>
                  <span>{alreadyRefundedPaise > 0 ? formatShopPriceFromPaise(alreadyRefundedPaise, order.payment_currency) : '₹0.00'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void initiateRefundAction()}
                disabled={refunding || !isRefundValid}
                className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
              >
                {refunding ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    {refundPreset === 'custom' && !isRefundValid && refundAmountPaise <= 0
                      ? 'Enter a valid amount'
                      : `Initiate Refund${isRefundValid ? ` (${formatShopPriceFromPaise(refundAmountPaise, order.payment_currency)})` : ''}`}
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function AdminShopOrderDetailClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<ShopAdminOrder | null>(null)
  const [paymentAttempt, setPaymentAttempt] = useState<ShopPaymentAttempt | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<AdminToastState>(null)
  const [trackingForm, setTrackingForm] = useState<TrackingForm>({
    courier_name: '',
    tracking_number: '',
    tracking_url: '',
    estimated_delivery: '',
  })
  const [adminNotes, setAdminNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [shippingToShiprocket, setShippingToShiprocket] = useState(false)
  const [showSnapshot, setShowSnapshot] = useState(false)

  const loadOrder = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/3d-shop/admin/orders/${orderId}`)
      const data = (await response.json().catch(() => ({}))) as { order?: ShopAdminOrder; paymentAttempt?: ShopPaymentAttempt | null; error?: string }
      if (!response.ok || !data.order) throw new Error(data.error || 'Failed to load order.')
      setOrder(data.order)
      setPaymentAttempt(data.paymentAttempt ?? null)
      setTrackingForm({
        courier_name: data.order.courier_name ?? '',
        tracking_number: data.order.tracking_number ?? '',
        tracking_url: data.order.tracking_url ?? '',
        estimated_delivery: getDateInputValue(data.order.estimated_delivery),
      })
      setAdminNotes(data.order.admin_notes ?? '')
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load order.' })
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
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const progressIndex = useMemo(() => {
    if (!order) return -1
    const index = SHOP_FULFILMENT_PROGRESS.indexOf(order.fulfilment_status)
    return index === -1 ? SHOP_FULFILMENT_PROGRESS.length - 1 : index
  }, [order])

  async function patchOrder(payload: Record<string, string | null>) {
    setSaving(true)
    try {
      const response = await fetch(`/api/3d-shop/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = (await response.json().catch(() => ({}))) as { order?: ShopAdminOrder; paymentAttempt?: ShopPaymentAttempt | null; error?: string }
      if (!response.ok || !data.order) throw new Error(data.error || 'Failed to update order.')
      setOrder(data.order)
      if (data.paymentAttempt !== undefined) setPaymentAttempt(data.paymentAttempt)
      setToast({ type: 'success', message: 'Order updated.' })
      return data.order
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to update order.' })
      return null
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(nextStatus: string) {
    if (!order) return
    const isFulfilment = shopFulfilmentStatuses.includes(nextStatus as ShopFulfilmentStatus)
    if (isFulfilment && nextStatus === order.fulfilment_status) return
    if (!isFulfilment && nextStatus === order.order_status) return
    let cancellationReason: string | null = null
    if (nextStatus === 'cancelled') {
      cancellationReason = window.prompt('Cancellation reason')?.trim() || null
      if (!cancellationReason) return
    }
    if (isFulfilment) {
      await patchOrder({ fulfilment_status: nextStatus })
    } else {
      await patchOrder({ order_status: nextStatus, cancellation_reason: cancellationReason })
    }
  }

  async function saveTracking() {
    await patchOrder({
      courier_name: trackingForm.courier_name || null,
      tracking_number: trackingForm.tracking_number || null,
      tracking_url: trackingForm.tracking_url || null,
      estimated_delivery: trackingForm.estimated_delivery || null,
    })
  }

  async function shipViaShiprocket() {
    setShippingToShiprocket(true)
    try {
      const response = await fetch(`/api/3d-shop/admin/orders/${orderId}/shiprocket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = (await response.json().catch(() => ({}))) as {
        error?: string
        awb?: string
        courier?: string
        trackingUrl?: string
        pickupScheduled?: boolean
      }
      if (!response.ok) throw new Error(data.error || 'Shiprocket shipment failed.')
      setToast({
        type: 'success',
        message: `Shipped via Shiprocket: ${data.awb} (${data.courier ?? ''})${data.pickupScheduled === false ? ' — pickup NOT scheduled' : ''}`,
      })
      await loadOrder()
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Shiprocket shipment failed.',
      })
    } finally {
      setShippingToShiprocket(false)
    }
  }

  async function saveNotes() {
    await patchOrder({ admin_notes: adminNotes || null })
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-[#6F7192]">
        Loading order...
      </div>
    )
  }

  if (!order) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <h1 className="!text-xl font-bold text-[#0F1B3D]">Order not found</h1>
        <Link href="/admin/3d-shop/orders" className="mt-4 inline-flex text-sm font-semibold text-[#6d28d9]">
          Back to orders
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AdminToast toast={toast} />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/admin/3d-shop/orders" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#6d28d9]">
            <ArrowLeft className="h-4 w-4" />
            Back to 3D Shop Orders
          </Link>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/20 bg-[#6d28d9]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#6d28d9]">
            <PackageCheck className="h-3 w-3" />
            3D Shop Order
          </div>
          <h1 className="font-[var(--font-syne)] !text-2xl font-bold tracking-tight text-[#0F1B3D]">#{order.order_number}</h1>
          <p className="mt-2 text-sm text-[#6F7192]">Placed {formatShopOrderDateTime(order.placed_at)}</p>
        </div>
        <a
          href={`/api/3d-shop/orders/${order.id}/invoice`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-3 text-sm font-semibold text-white shadow-sm"
        >
          <Printer className="h-4 w-4" />
          Download Invoice
        </a>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="!text-base font-bold text-[#0F1B3D]">Order Details</h2>
                <p className="mt-1 text-sm text-[#6F7192]">
                  {order.customer?.name ?? order.shipping_address.name}
                  {order.customer?.email ? (
                    <> · <a href={`mailto:${order.customer.email}`} className="text-violet-600 underline-offset-2 hover:underline">{order.customer.email}</a></>
                  ) : ' · No email'}
                </p>
              </div>
              <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
                order.order_status === 'cancelled' || order.order_status === 'returned'
                  ? getShopOrderStatusClasses(order.order_status)
                  : getShopFulfilmentStatusClasses(order.fulfilment_status)
              }`}>
                {order.order_status === 'cancelled' || order.order_status === 'returned'
                  ? getShopOrderStatusLabel(order.order_status)
                  : getShopFulfilmentStatusLabel(order.fulfilment_status)}
              </span>
            </div>

            {order.order_status === 'cancelled' ? (
              <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                Cancelled{order.cancellation_reason ? ` · ${order.cancellation_reason}` : ''}
              </div>
            ) : (
              <div className="mt-6 grid gap-3 md:grid-cols-7">
                {SHOP_FULFILMENT_PROGRESS.map((status, index) => (
                  <div key={status} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                      index < progressIndex
                        ? 'bg-emerald-600 text-white'
                        : index === progressIndex
                          ? 'bg-[#6d28d9] text-white'
                          : 'bg-white text-[#6F7192]'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="mt-2 text-xs font-semibold text-[#0F1B3D]">{getShopFulfilmentStatusLabel(status)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="!text-base font-bold text-[#0F1B3D]">Items Ordered</h2>
            <div className="mt-4 space-y-3">
              {order.items.map((item) => (
                <div key={`${item.skuId}-${item.customizationText ?? ''}`} className="grid gap-3 rounded-xl border border-gray-100 p-3 sm:grid-cols-[56px_1fr_auto]">
                  <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-gray-100">
                    {item.productThumbnail ? (
                      <Image src={item.productThumbnail} alt={item.productName} fill sizes="56px" className="object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-xs text-[#6F7192]">No img</div>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-[#0F1B3D]">{item.productName}</div>
                    <div className="mt-1 text-sm text-[#6F7192]">{item.variantLabel}</div>
                    {item.customizationText && <div className="mt-1 text-sm italic text-[#6F7192]">Engraved: {item.customizationText}</div>}
                    <div className="mt-1 text-sm text-[#6F7192]">Qty {item.quantity} x {formatShopPrice(item.unitPrice)}</div>
                  </div>
                  <div className="text-left font-bold text-[#0F1B3D] sm:text-right">{formatShopPrice(getShopOrderLineTotal(item))}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="!text-base font-bold text-[#0F1B3D]">Delivery Address</h2>
              <div className="mt-4 text-sm leading-7 text-[#6F7192]">
                <div className="font-semibold text-[#0F1B3D]">{order.shipping_address.name}</div>
                <div>
                  {order.shipping_address.phone ? (
                    <a href={`tel:${order.shipping_address.phone.replace(/[^0-9+]/g, '')}`} className="text-violet-600 underline-offset-2 hover:underline">{order.shipping_address.phone}</a>
                  ) : '—'}
                </div>
                <div>{order.shipping_address.line1}</div>
                {order.shipping_address.line2 && <div>{order.shipping_address.line2}</div>}
                <div>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.pincode}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="!text-base font-bold text-[#0F1B3D]">Order Source</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[#6F7192]">Channel</span>
                  <span className="font-semibold text-[#0F1B3D]">{order.order_source ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6F7192]">Last updated</span>
                  <span className="font-semibold text-[#0F1B3D]">
                    {order.updated_at ? formatShopOrderDateTime(order.updated_at) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6F7192]">Invoice #</span>
                  <span className="font-semibold text-[#0F1B3D]">
                    {(order as unknown as { invoice_number?: string | null }).invoice_number ?? order.order_number}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <PaymentInfoSection
            order={order}
            paymentAttempt={paymentAttempt}
            showSnapshot={showSnapshot}
            onToggleSnapshot={() => setShowSnapshot((current) => !current)}
            onRefresh={loadOrder}
            onToast={setToast}
          />
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="!text-base font-bold text-[#0F1B3D]">Pricing Summary</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between text-[#6F7192]"><span>Subtotal</span><span className="font-semibold text-[#0F1B3D]">{formatShopPrice(order.subtotal)}</span></div>
              {order.discount_amount > 0 && <div className="flex justify-between text-emerald-700"><span>Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</span><span>-{formatShopPrice(order.discount_amount)}</span></div>}
              <div className="flex justify-between text-[#6F7192]"><span>Shipping</span><span className="font-semibold text-[#0F1B3D]">{order.shipping_charge === 0 ? 'Free' : formatShopPrice(order.shipping_charge)}</span></div>
              <div className="flex justify-between border-t border-gray-100 pt-3 text-lg font-bold text-[#0F1B3D]"><span>Total</span><span>{formatShopPrice(order.total_amount)}</span></div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="!text-base font-bold text-[#0F1B3D]">Status Updater</h2>
            <label className="mt-4 block text-xs font-semibold text-[#6F7192]">Lifecycle</label>
            <select
              value={order.order_status}
              onChange={(event) => void changeStatus(event.target.value)}
              disabled={saving}
              className="mt-1 w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none"
            >
              {lifecycleStatuses.map((status) => <option key={status} value={status}>{getShopOrderStatusLabel(status)}</option>)}
            </select>
            <label className="mt-3 block text-xs font-semibold text-[#6F7192]">Fulfilment</label>
            <select
              value={order.fulfilment_status}
              onChange={(event) => void changeStatus(event.target.value)}
              disabled={saving}
              className="mt-1 w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none"
            >
              {fulfilmentStatuses.map((status) => <option key={status} value={status}>{getShopFulfilmentStatusLabel(status)}</option>)}
            </select>
            <label className="mt-3 block text-xs font-semibold text-[#6F7192]">Payment</label>
            <select
              value={order.payment_status}
              onChange={(event) => void patchOrder({ payment_status: event.target.value })}
              disabled={saving}
              className="mt-1 w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none"
            >
              {paymentStatuses.map((status) => <option key={status} value={status}>{getShopPaymentStatusLabel(status)}</option>)}
            </select>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-[#6d28d9]" />
              <h2 className="!text-base font-bold text-[#0F1B3D]">Tracking Info</h2>
            </div>
            <div className="mt-4 space-y-3">
              {([
                ['courier_name', 'Courier Name'],
                ['tracking_number', 'Tracking Number'],
                ['tracking_url', 'Tracking URL'],
              ] as Array<[keyof TrackingForm, string]>).map(([field, label]) => (
                <label key={field} className="block">
                  <span className="text-xs font-medium uppercase tracking-[0.15em] text-[#6F7192]">{label}</span>
                  <input
                    value={trackingForm[field]}
                    onChange={(event) => setTrackingForm((current) => ({ ...current, [field]: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none"
                  />
                </label>
              ))}
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-[0.15em] text-[#6F7192]">Estimated Delivery</span>
                <input
                  type="date"
                  value={trackingForm.estimated_delivery}
                  onChange={(event) => setTrackingForm((current) => ({ ...current, estimated_delivery: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none"
                />
              </label>
              {!trackingForm.tracking_number &&
                order.fulfilment_status !== 'delivered' &&
                order.order_status !== 'cancelled' && (
                  <div className="border-t border-dashed border-gray-200 pt-3">
                    <button
                      type="button"
                      onClick={() => void shipViaShiprocket()}
                      disabled={shippingToShiprocket || saving}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <Truck className="h-4 w-4" />
                      {shippingToShiprocket ? 'Creating shipment…' : 'Ship via Shiprocket'}
                    </button>
                    <p className="mt-2 text-[11px] leading-relaxed text-[#6F7192]">
                      Creates the shipment, assigns an AWB and schedules pickup automatically, then emails the customer.
                    </p>
                  </div>
                )}
              <button type="button" onClick={() => void saveTracking()} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                <Save className="h-4 w-4" />
                Save Tracking Info
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#6d28d9]" />
              <h2 className="!text-base font-bold text-[#0F1B3D]">Admin Notes</h2>
            </div>
            <textarea
              value={adminNotes}
              onChange={(event) => setAdminNotes(event.target.value)}
              className="mt-4 min-h-[140px] w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 p-3 text-sm text-[#0F1B3D] outline-none"
              placeholder="Internal notes"
            />
            <button type="button" onClick={() => void saveNotes()} disabled={saving} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
              <Save className="h-4 w-4" />
              Save Notes
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
