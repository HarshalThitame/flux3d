'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, RefreshCcw, ShieldCheck, Wallet, ReceiptText } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import SkeletonBlock from '@/components/admin/SkeletonBlock'
import type { PaymentAuditLogData, PaymentData, PaymentEventData, PaymentRefundData } from '@/lib/admin/types'

type PaymentDetailResponse = {
  payment: PaymentData & {
    metadata: Record<string, unknown>
    customerId: string
  }
  order: Record<string, unknown> | null
  refunds: PaymentRefundData[]
  events: PaymentEventData[]
  auditLogs: PaymentAuditLogData[]
  providerDashboard: {
    paymentUrl: string | null
    orderUrl: string | null
  }
}

function formatMoney(value: number) {
  return `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString('en-IN') : 'Not set'
}

function statusTone(status: string) {
  if (['paid', 'captured'].includes(status)) return 'bg-emerald-100 text-emerald-700'
  if (['pending', 'created', 'authorized'].includes(status)) return 'bg-amber-100 text-amber-700'
  if (['refunded', 'partially_refunded'].includes(status)) return 'bg-rose-100 text-rose-700'
  if (status === 'failed' || status === 'cancelled') return 'bg-slate-100 text-slate-700'
  return 'bg-gray-100 text-gray-700'
}

export default function PaymentDetailClient({ paymentId }: { paymentId: string }) {
  const [data, setData] = useState<PaymentDetailResponse | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<AdminToastState>(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('Admin initiated refund')
  const [refundSpeed, setRefundSpeed] = useState<'normal' | 'optimum'>('normal')

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}`)
      const full = await response.json().catch(() => ({})) as Partial<PaymentDetailResponse> & { error?: string }
      if (!response.ok || !full.payment) {
        throw new Error(full.error || 'Failed to load payment.')
      }
      setData(full as PaymentDetailResponse)
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load payment.' })
    }
  }, [paymentId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const refundableAmount = useMemo(() => {
    if (!data) return 0
    const alreadyRefunded = data.refunds
      .filter((refund) => ['pending', 'processed'].includes(refund.status))
      .reduce((sum, refund) => sum + refund.amountPaise, 0)
    return Math.max(0, data.payment.amountPaise - alreadyRefunded)
  }, [data])

  async function refreshFromProvider() {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/refresh`, { method: 'POST' })
      const body = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(body.error || 'Refresh failed.')
      setToast({ type: 'success', message: 'Payment refreshed from provider.' })
      await load()
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Refresh failed.' })
    } finally {
      setSaving(false)
    }
  }

  async function initiateRefund() {
    const amount = Math.max(0, Math.round(Number(refundAmount) || 0))
    if (!amount || !refundReason.trim()) {
      setToast({ type: 'error', message: 'Refund amount and reason are required.' })
      return
    }
    if (amount > refundableAmount) {
      setToast({ type: 'error', message: 'Refund amount exceeds the refundable balance.' })
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountPaise: amount,
          reason: refundReason,
          speed: refundSpeed,
        }),
      })
      const body = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(body.error || 'Refund failed.')
      setToast({ type: 'success', message: 'Refund initiated.' })
      setRefundAmount('')
      await load()
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Refund failed.' })
    } finally {
      setSaving(false)
    }
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-24 w-full" />
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <SkeletonBlock className="h-[540px] w-full" />
          <SkeletonBlock className="h-[540px] w-full" />
        </div>
      </div>
    )
  }

  const { payment, order, refunds, events, auditLogs, providerDashboard } = data
  const snapshot = order && typeof order === 'object' ? order as Record<string, unknown> : {}
  const lineItems = Array.isArray(snapshot.items) ? snapshot.items as Array<Record<string, unknown>> : []

  return (
    <div className="space-y-6">
      <AdminToast toast={toast} />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/admin/payments" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#6d28d9]">
            <ArrowLeft className="h-4 w-4" />
            Back to payments
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/20 bg-[#6d28d9]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#6d28d9]">
            <Wallet className="h-3 w-3" />
            Payment Detail
          </div>
          <h1 className="mt-2 font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">{payment.orderNumber}</h1>
          <p className="mt-2 text-sm text-[#6F7192]">
            Attempt {payment.attemptNumber} · {payment.provider.toUpperCase()} · {payment.internalOrderType.replace('_', ' ')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {providerDashboard.paymentUrl && (
            <a href={providerDashboard.paymentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[#6d28d9]/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#0F1B3D]">
              Open payment
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          {providerDashboard.orderUrl && (
            <a href={providerDashboard.orderUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[#6d28d9]/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#0F1B3D]">
              Open order
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <button
            type="button"
            onClick={refreshFromProvider}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0F1B3D] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh status
          </button>
        </div>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">Status</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(payment.status)}`}>{payment.status}</span>
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-[#6F7192]">{payment.currency}</span>
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-[#6F7192]">{formatMoney(payment.amountPaise)}</span>
                </div>
              </div>
              <div className="text-right text-xs text-[#6F7192]">
                <div>Created {formatDate(payment.createdAt)}</div>
                <div>Captured {formatDate(payment.capturedAt)}</div>
                <div>Failed {formatDate(payment.failedAt)}</div>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Provider Order</div>
                <div className="mt-1 break-all text-sm font-semibold text-[#0F1B3D]">{payment.providerOrderId ?? '—'}</div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Provider Payment</div>
                <div className="mt-1 break-all text-sm font-semibold text-[#0F1B3D]">{payment.providerPaymentId ?? '—'}</div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Purpose</div>
                <div className="mt-1 text-sm font-semibold text-[#0F1B3D]">{payment.paymentPurpose}</div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Refund Balance</div>
                <div className="mt-1 text-sm font-semibold text-[#0F1B3D]">{formatMoney(refundableAmount)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-[#6d28d9]" />
              <h2 className="text-base font-bold text-[#0F1B3D]">Order Snapshot</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Customer</div>
                <div className="mt-1 font-semibold text-[#0F1B3D]">{payment.customer}</div>
                <div className="text-[#6F7192]">{payment.customerEmail ?? 'No email'}</div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Internal Order</div>
                <div className="mt-1 font-semibold text-[#0F1B3D]">{payment.internalOrderId}</div>
                <div className="text-[#6F7192]">{payment.internalOrderType.replace('_', ' ')}</div>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {lineItems.length > 0 ? lineItems.map((item, index) => (
                <div key={index} className="rounded-xl border border-gray-100 p-3 text-sm text-[#6F7192]">
                  <div className="font-semibold text-[#0F1B3D]">{String(item.productName ?? item.material ?? item.name ?? `Item ${index + 1}`)}</div>
                  <div className="mt-1 break-all">{JSON.stringify(item).slice(0, 220)}</div>
                </div>
              )) : (
                <div className="rounded-xl border border-gray-100 p-3 text-sm text-[#6F7192]">No line item snapshot available.</div>
              )}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="text-base font-bold text-[#0F1B3D]">Refunds</h2>
              <div className="mt-4 space-y-3">
                {refunds.length > 0 ? refunds.map((refund) => (
                  <div key={refund.id} className="rounded-xl border border-gray-100 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-[#0F1B3D]">{formatMoney(refund.amountPaise)}</div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusTone(refund.status)}`}>{refund.status}</span>
                    </div>
                    <div className="mt-1 text-[#6F7192]">{refund.reason}</div>
                    <div className="mt-1 break-all text-xs text-[#6F7192]">{refund.providerRefundId ?? 'Pending provider ID'}</div>
                  </div>
                )) : (
                  <div className="rounded-xl border border-gray-100 p-3 text-sm text-[#6F7192]">No refunds yet.</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="text-base font-bold text-[#0F1B3D]">Initiate Refund</h2>
              <div className="mt-4 space-y-3">
                <label className="block text-sm">
                  <span className="text-[#6F7192]">Amount (paise)</span>
                  <input
                    value={refundAmount}
                    onChange={(event) => setRefundAmount(event.target.value)}
                    inputMode="numeric"
                    className="mt-1 w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-[#0F1B3D] outline-none"
                    placeholder={`Max ${refundableAmount}`}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-[#6F7192]">Reason</span>
                  <textarea
                    value={refundReason}
                    onChange={(event) => setRefundReason(event.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-[#0F1B3D] outline-none"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-[#6F7192]">Speed</span>
                  <select
                    value={refundSpeed}
                    onChange={(event) => setRefundSpeed(event.target.value === 'optimum' ? 'optimum' : 'normal')}
                    className="mt-1 w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-[#0F1B3D] outline-none"
                  >
                    <option value="normal">Normal</option>
                    <option value="optimum">Optimum</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={initiateRefund}
                  disabled={saving || refundableAmount <= 0}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Initiate refund
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-base font-bold text-[#0F1B3D]">Timeline</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="font-semibold text-[#0F1B3D]">Payment status</div>
                <div className="text-[#6F7192]">{payment.status}</div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="font-semibold text-[#0F1B3D]">Verification</div>
                <div className="text-[#6F7192]">{formatDate(payment.capturedAt || payment.createdAt)}</div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="font-semibold text-[#0F1B3D]">Failure reason</div>
                <div className="text-[#6F7192]">{payment.failedAt ? 'See provider payment record' : 'None'}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-base font-bold text-[#0F1B3D]">Webhook Events</h2>
            <div className="mt-4 space-y-3">
              {events.length > 0 ? events.map((event) => (
                <div key={event.id} className="rounded-xl border border-gray-100 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-[#0F1B3D]">{event.eventType}</div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusTone(event.processingStatus)}`}>{event.processingStatus}</span>
                  </div>
                  <div className="mt-1 text-xs text-[#6F7192]">Event ID {event.providerEventId}</div>
                </div>
              )) : (
                <div className="rounded-xl border border-gray-100 p-3 text-sm text-[#6F7192]">No webhook events logged.</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-base font-bold text-[#0F1B3D]">Audit Log</h2>
            <div className="mt-4 space-y-3">
              {auditLogs.length > 0 ? auditLogs.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-gray-100 p-3 text-sm">
                  <div className="font-semibold text-[#0F1B3D]">{entry.action}</div>
                  <div className="mt-1 text-xs text-[#6F7192]">{entry.actorRole} · {formatDate(entry.createdAt)}</div>
                </div>
              )) : (
                <div className="rounded-xl border border-gray-100 p-3 text-sm text-[#6F7192]">No audit entries yet.</div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
