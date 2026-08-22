'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowUpDown,
  Ban,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Copy,
  Download,
  FileText,
  Gift,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  Save,
  Tag,
  Ticket,
  TriangleAlert,
  User,
  X,
} from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import type { AdminOrder, AdminOrderItem } from '@/lib/admin/types'
import {
  canCancelOrderStatus,
  getAllowedOrderStatusTransitions,
  getOrderStatusTransitionError,
  isSequentialOrderStatusTransition,
  type OrderStatus,
} from '@/lib/orders'
import {
  STATUS_LABELS,
  colorToCss,
  formatDateTime,
  formatMoney,
  formatNumber,
  postProcessingLabel,
  safeText,
  statusPillClass,
} from '../order-ui'

type Props = {
  initialOrder: AdminOrder
}

type AuditLogEntry = {
  id: string
  action: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  performed_at: string | null
}

type TimelineStepConfig = { label: string; status: OrderStatus }
type TimelineStepState = 'done' | 'current' | 'future' | 'cancelled'

const TIMELINE_STEPS: TimelineStepConfig[] = [
  { label: 'Order Placed', status: 'pending' },
  { label: 'Confirmed', status: 'confirmed' },
  { label: 'Printing', status: 'printing' },
  { label: 'Shipped', status: 'shipped' },
  { label: 'Delivered', status: 'delivered' },
  { label: 'Completed', status: 'completed' },
]

const STATUS_INDEX: Partial<Record<OrderStatus, number>> = {
  confirmed: 1,
  printing: 2,
  shipped: 3,
  delivered: 4,
  completed: 5,
}

export default function OrderDetailClient({ initialOrder }: Props) {
  const [order, setOrder] = useState(initialOrder)
  const [notesDraft, setNotesDraft] = useState(initialOrder.notes ?? '')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  const [toast, setToast] = useState<AdminToastState>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[] | null>(null)
  const [auditLogsLoading, setAuditLogsLoading] = useState(false)
  const toastTimer = useRef<number | null>(null)

  const [trackingForm, setTrackingForm] = useState({
    courier_name: initialOrder.courier_name ?? '',
    tracking_number: initialOrder.tracking_number ?? '',
    tracking_url: initialOrder.tracking_url ?? '',
  })
  const [savingTracking, setSavingTracking] = useState(false)

  const itemCount = order.items.length
  const quoteId = extractQuoteId(order)
  const postProcessingCharges = order.items.reduce((sum, item) => sum + item.postProcessingCharges, 0)
  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrintTime = order.items.reduce((sum, item) => sum + item.estimatedTime, 0)
  const discountTotal = order.discountAmount ?? order.cartDiscountAmount + order.couponDiscountAmount + order.offerDiscountAmount
  const addressLines = [
    order.addressLine1,
    order.addressLine2,
    [order.city, order.state].filter(Boolean).join(', '),
    order.pincode ? `PIN ${order.pincode}` : null,
  ].filter(Boolean) as string[]
  const mapQuery = addressLines.join(', ')
  const statusOptions = getAllowedOrderStatusTransitions(order.status)

  async function loadAuditLogs() {
    if (auditLogs !== null) return // already loaded
    setAuditLogsLoading(true)
    try {
      const response = await fetch(`/api/admin/orders/${order.groupId}/audit-logs`)
      if (response.ok) {
        const data = await response.json() as { logs: AuditLogEntry[] }
        setAuditLogs(data.logs)
      }
    } catch {
      // silently fail
    } finally {
      setAuditLogsLoading(false)
    }
  }

  function showToast(nextToast: NonNullable<AdminToastState>) {
    setToast(nextToast)
    if (toastTimer.current !== null) {
      window.clearTimeout(toastTimer.current)
    }
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }

  async function copyToClipboard(label: string, value: string) {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      showToast({ type: 'success', message: `${label} copied.` })
    } catch {
      showToast({ type: 'error', message: `Could not copy ${label.toLowerCase()}.` })
    }
  }

  async function updateStatus(status: OrderStatus, reason?: string) {
    if (status === order.status) return
    if (!isSequentialOrderStatusTransition(order.status, status)) {
      showToast({ type: 'error', message: getOrderStatusTransitionError(order.status, status) })
      return
    }

    const previous = order
    setUpdatingStatus(true)
    setOrder((current) => ({
      ...current,
      status,
      items: current.items.map((item) => ({ ...item, status })),
    }))

    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: order.groupId,
          status,
          cancellationReason: reason,
          ...(status === 'shipped' && trackingForm.courier_name ? { courier_name: trackingForm.courier_name } : {}),
          ...(status === 'shipped' && trackingForm.tracking_number ? { tracking_number: trackingForm.tracking_number } : {}),
          ...(status === 'shipped' && trackingForm.tracking_url ? { tracking_url: trackingForm.tracking_url } : {}),
        }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Failed to update status.')
      }
      const json = (await response.json()) as { order: AdminOrder }
      setOrder((current) => ({
        ...current,
        ...json.order,
        paymentProvider: json.order.paymentProvider ?? current.paymentProvider,
        paymentStatus: json.order.paymentStatus ?? current.paymentStatus,
        providerOrderId: json.order.providerOrderId ?? current.providerOrderId,
        providerPaymentId: json.order.providerPaymentId ?? current.providerPaymentId,
        paymentMethod: json.order.paymentMethod ?? current.paymentMethod,
        paymentVerifiedAt: json.order.paymentVerifiedAt ?? current.paymentVerifiedAt,
        paymentFailedAt: json.order.paymentFailedAt ?? current.paymentFailedAt,
        paymentRefundStatus: json.order.paymentRefundStatus ?? current.paymentRefundStatus,
        paymentRefundAmountPaise: json.order.paymentRefundAmountPaise ?? current.paymentRefundAmountPaise,
        paymentAttemptId: json.order.paymentAttemptId ?? current.paymentAttemptId,
      }))
      setNotesDraft(json.order.notes ?? '')
      if (status === 'shipped') {
        setTrackingForm({
          courier_name: json.order.courier_name ?? '',
          tracking_number: json.order.tracking_number ?? '',
          tracking_url: json.order.tracking_url ?? '',
        })
      }
      showToast({ type: 'success', message: `${json.order.orderNumber} marked ${STATUS_LABELS[status].toLowerCase()}.` })
    } catch (error) {
      setOrder(previous)
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to update status.' })
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function saveNote() {
    setSavingNote(true)
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: order.groupId, notes: notesDraft }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Failed to save note.')
      }
      const json = (await response.json()) as { order: AdminOrder }
      setOrder((current) => ({
        ...current,
        ...json.order,
        paymentProvider: json.order.paymentProvider ?? current.paymentProvider,
      }))
      setNotesDraft(json.order.notes ?? '')
      showToast({ type: 'success', message: 'Admin note saved.' })
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to save note.' })
    } finally {
      setSavingNote(false)
    }
  }

  async function saveTracking() {
    setSavingTracking(true)
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: order.groupId,
          courier_name: trackingForm.courier_name || null,
          tracking_number: trackingForm.tracking_number || null,
          tracking_url: trackingForm.tracking_url || null,
        }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Failed to save tracking info.')
      }
      const json = (await response.json()) as { order: AdminOrder }
      setOrder((current) => ({
        ...current,
        ...json.order,
        paymentProvider: json.order.paymentProvider ?? current.paymentProvider,
      }))
      setTrackingForm({
        courier_name: json.order.courier_name ?? '',
        tracking_number: json.order.tracking_number ?? '',
        tracking_url: json.order.tracking_url ?? '',
      })
      showToast({ type: 'success', message: 'Tracking info saved.' })
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to save tracking info.' })
    } finally {
      setSavingTracking(false)
    }
  }

  useEffect(() => { loadAuditLogs() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="w-full bg-gray-50 text-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 space-y-3">
                <Link href="/admin/orders" className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-violet-700">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <h1 className="min-w-0 truncate !text-xl font-bold text-gray-900">
                    {order.orderNumber} <span className="font-semibold text-gray-500">· {itemCount} item{itemCount === 1 ? '' : 's'}</span>
                  </h1>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${statusPillClass(order.status)}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                  {order.cancelRequested && (
                    <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                      Cancellation requested
                    </span>
                  )}
                  {order.status === 'cancelled' && order.notes?.trim() && (
                    <span className="rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                      {extractCancelReason(order.notes) || 'Cancelled'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">Submitted {formatDateTime(order.createdAt)}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/api/orders/${order.id}/invoice`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" />
                  Invoice
                </a>
                <button
                  type="button"
                  onClick={() => setShowCancelDialog(true)}
                  disabled={updatingStatus || !canCancelOrderStatus(order.status)}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Ban className="h-4 w-4" />
                  Cancel
                </button>
                <select
                  value={order.status}
                  disabled={updatingStatus}
                  onChange={(event) => {
                    const nextStatus = event.target.value as OrderStatus
                    if (nextStatus === 'cancelled') {
                      setShowCancelDialog(true)
                    } else {
                      setPendingStatus(nextStatus)
                      setShowStatusDialog(true)
                    }
                    event.target.value = order.status
                  }}
                  className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 outline-none transition focus:border-violet-600 focus:ring-2 focus:ring-violet-100 disabled:opacity-50"
                  aria-label="Update order status"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="min-w-0 space-y-6 lg:col-span-3">
              <section className="w-full">
                <SectionTitle>Print Items</SectionTitle>
                <div className="mt-4 space-y-4">
                  {order.items.map((item, index) => (
                    <PrintItemCard
                      key={item.id}
                      item={item}
                      index={index}
                      count={itemCount}
                      copyToClipboard={copyToClipboard}
                    />
                  ))}
                </div>
              </section>

              <Card title="Pricing Breakdown">
                <PricingTable order={order} postProcessingCharges={postProcessingCharges} discountTotal={discountTotal} />
              </Card>

              <Card title="Order Timeline">
                <div className="space-y-4">
                  {getTimelineSteps(order).map((step, index) => (
                    <TimelineStep key={step.label} label={step.label} meta={timelineMeta(order, step, index)} state={timelineState(order.status, step, index)} />
                  ))}
                </div>
              </Card>

              <Card title="Activity Log">
                {auditLogsLoading && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Loading activity...
                  </div>
                )}
                {auditLogs !== null && !auditLogsLoading && auditLogs.length === 0 && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-600">No activity recorded for this order.</div>
                )}
                {auditLogs !== null && auditLogs.length > 0 && (
                  <div className="space-y-2">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-gray-900">{log.action.replace(/_/g, ' ')}</span>
                          <span className="shrink-0 text-xs text-gray-400">{log.performed_at ? formatDateTime(log.performed_at) : ''}</span>
                        </div>
                        {log.new_value && (
                          <div className="mt-1 text-xs text-gray-500">
                            {formatAuditValue(log.action, log.new_value)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="min-w-0 space-y-6 lg:col-span-2">
              <Card title="Customer">
                <div className="space-y-3">
                  <InfoLine icon={<User className="h-4 w-4" />} value={safeText(order.fullName)} strong />
                  <InfoLine icon={<Phone className="h-4 w-4" />}>
                    {order.phone ? (
                      <a href={`tel:${order.phone.replace(/[^0-9+]/g, '')}`} className="text-violet-600 underline-offset-2 hover:underline">{safeText(order.phone)}</a>
                    ) : <span>—</span>}
                  </InfoLine>
                  <InfoLine icon={<Mail className="h-4 w-4" />}>
                    {order.email ? (
                      <a href={`mailto:${order.email}`} className="text-violet-600 underline-offset-2 hover:underline">{safeText(order.email)}</a>
                    ) : <span>—</span>}
                  </InfoLine>
                </div>
                <Divider />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Delivery Address</div>
                  <div className="mt-3 space-y-1 text-sm leading-6 text-gray-900">
                    {addressLines.length > 0 ? addressLines.map((line) => <div key={line}>{line}</div>) : <div>—</div>}
                    <div className="text-gray-600">Landmark: {order.landmark || 'None'}</div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => copyToClipboard('Address', [...addressLines, `Landmark: ${order.landmark || 'None'}`].join('\n'))}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy Address
                    </button>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 hover:text-violet-700"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      Open in Maps
                    </a>
                  </div>
                </div>
              </Card>

              <Card title="Discounts Applied">
                {discountTotal > 0 ? (
                  <div className="space-y-3">
                    {order.cartDiscountAmount > 0 && (
                      <DiscountRow
                        icon={<Tag className="h-4 w-4" />}
                        title="Cart Discount"
                        description={`${formatNumber(order.cartDiscountPercent, 2)}% cart-level discount`}
                        saved={order.cartDiscountAmount}
                      />
                    )}
                    {order.couponDiscountAmount > 0 && (
                      <DiscountRow
                        icon={<Ticket className="h-4 w-4" />}
                        title={`Coupon${order.couponCode ? `: ${order.couponCode}` : ''}`}
                        description="Stored coupon discount"
                        saved={order.couponDiscountAmount}
                      />
                    )}
                    {order.offerDiscountAmount > 0 && (
                      <DiscountRow
                        icon={<Gift className="h-4 w-4" />}
                        title={`Offer${order.offerName ? `: ${order.offerName}` : ''}`}
                        description="Stored offer discount"
                        saved={order.offerDiscountAmount}
                      />
                    )}
                    <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
                      <span className="font-semibold text-gray-700">Total Saved</span>
                      <span className="font-bold text-emerald-600">{formatMoney(discountTotal)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-600">No discounts applied</div>
                )}
              </Card>

              <Card title="Order Meta">
                <div className="space-y-3">
                  <MetaRow label="Order Number" value={order.orderNumber} />
                  <MetaRow label="Quote ID" value={quoteId} />
                  <MetaRow
                    label="Group ID"
                    value={order.groupId}
                    action={
                      <button type="button" onClick={() => copyToClipboard('Group ID', order.groupId)} aria-label="Copy Group ID" className="text-violet-600 hover:text-violet-700">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    }
                  />
                  <MetaRow label="Payment Status" value={safeText(order.paymentStatus ?? 'Pending')} />
                  <MetaRow label="Items" value={`${itemCount} item${itemCount === 1 ? '' : 's'} · ${totalQuantity.toLocaleString('en-IN')} pcs`} />
                  <MetaRow label="Print Time" value={`${formatNumber(totalPrintTime, 1)} hrs`} />
                  <MetaRow label="Created" value={formatDateTime(order.createdAt)} />
                  <MetaRow label="Last Updated" value={formatDateTime(order.updatedAt)} />
                </div>
              </Card>

              {order.paymentProvider && (
                <Card title="Payment Details">
                  <div className="space-y-3">
                    <MetaRow label="Provider" value={order.paymentProvider} />
                    {order.paymentStatus && <MetaRow label="Status" value={safeText(order.paymentStatus)} />}
                    {order.providerOrderId && (
                      <MetaRow
                        label="Razorpay Order ID"
                        value={order.providerOrderId}
                        action={
                          <button type="button" onClick={() => copyToClipboard('Razorpay Order ID', order.providerOrderId ?? '')} aria-label="Copy Razorpay Order ID" className="text-violet-600 hover:text-violet-700">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        }
                      />
                    )}
                    {order.providerPaymentId && (
                      <MetaRow
                        label="Razorpay Payment ID"
                        value={order.providerPaymentId}
                        action={
                          <button type="button" onClick={() => copyToClipboard('Razorpay Payment ID', order.providerPaymentId ?? '')} aria-label="Copy Razorpay Payment ID" className="text-violet-600 hover:text-violet-700">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        }
                      />
                    )}
                    {order.paymentMethod && <MetaRow label="Payment Method" value={order.paymentMethod} />}
                    {order.paymentVerifiedAt && <MetaRow label="Verified At" value={formatDateTime(order.paymentVerifiedAt)} />}
                    {order.paymentFailedAt && <MetaRow label="Failed At" value={formatDateTime(order.paymentFailedAt)} />}
                    {order.paymentRefundStatus && (
                      <>
                        <MetaRow label="Refund Status" value={safeText(order.paymentRefundStatus)} />
                        {order.paymentRefundAmountPaise != null && order.paymentRefundAmountPaise > 0 && (
                          <MetaRow label="Refund Amount" value={`₹${(order.paymentRefundAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
                        )}
                      </>
                    )}
                    {order.paymentAttemptId && (
                      <div className="pt-2">
                        <a
                          href={`/admin/payments/${order.paymentAttemptId}`}
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                        >
                          View Full Payment Details →
                        </a>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {order.paymentStatus === 'paid' && order.status === 'cancelled' && (
                <Card title="Refund">
                  <div className="space-y-3">
                    {order.paymentRefundStatus ? (
                      <div>
                        <MetaRow label="Refund Status" value={safeText(order.paymentRefundStatus)} />
                        {order.paymentRefundAmountPaise != null && order.paymentRefundAmountPaise > 0 && (
                          <MetaRow label="Refunded Amount" value={`₹${(order.paymentRefundAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
                        )}
                        {order.paymentAttemptId && (
                          <div className="pt-2">
                            <a href={`/admin/payments/${order.paymentAttemptId}`} className="text-sm font-semibold text-violet-600 hover:text-violet-700">
                              Manage Refund →
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                        <div className="font-semibold">Prepaid order cancelled</div>
                        <p className="mt-1 leading-6">This order was paid but has no refund initiated yet. Process the refund from the payment details page.</p>
                        {order.paymentAttemptId && (
                          <a
                            href={`/admin/payments/${order.paymentAttemptId}`}
                            className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white transition hover:bg-amber-700"
                          >
                            Initiate Refund →
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              )}

              <Card title="Shipping &amp; Tracking">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Courier Name</label>
                    <input
                      type="text"
                      value={trackingForm.courier_name}
                      onChange={(e) => setTrackingForm((f) => ({ ...f, courier_name: e.target.value }))}
                      placeholder="e.g., Delhivery"
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Tracking Number</label>
                    <input
                      type="text"
                      value={trackingForm.tracking_number}
                      onChange={(e) => setTrackingForm((f) => ({ ...f, tracking_number: e.target.value }))}
                      placeholder="e.g., 1234567890"
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Tracking URL</label>
                    <input
                      type="text"
                      value={trackingForm.tracking_url}
                      onChange={(e) => setTrackingForm((f) => ({ ...f, tracking_url: e.target.value }))}
                      placeholder="https://..."
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={saveTracking}
                  disabled={savingTracking}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingTracking ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Tracking
                </button>
                {order.status === 'shipped' && (!order.tracking_number || !order.courier_name) && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                    <TriangleAlert className="inline h-3.5 w-3.5 mr-1" />
                    Order is marked as shipped but tracking info is missing. The customer will not receive a tracking email.
                  </div>
                )}
              </Card>

              <Card title="Admin Notes">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm leading-6 text-gray-700 whitespace-pre-wrap">
                  {order.notes?.trim() ? order.notes : '—'}
                </div>
                <textarea
                  value={notesDraft}
                  onChange={(event) => setNotesDraft(event.target.value)}
                  placeholder="Add admin note..."
                  rows={4}
                  className="mt-4 w-full resize-y rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
                />
                <button
                  type="button"
                  onClick={saveNote}
                  disabled={savingNote}
                  className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingNote ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Note
                </button>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <AdminToast toast={toast} />

      {showStatusDialog && pendingStatus && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-violet-100 text-violet-600">
                <ArrowUpDown className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Update Status</h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-600">
                Move <span className="font-semibold text-gray-900">{order.orderNumber}</span> from{' '}
                <span className="font-medium text-gray-700">{STATUS_LABELS[order.status]}</span> to{' '}
                <span className="font-medium text-violet-700">{STATUS_LABELS[pendingStatus]}</span>?
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={() => { setShowStatusDialog(false); setPendingStatus(null) }}
                className="inline-flex h-10 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => {
                  setShowStatusDialog(false)
                  if (pendingStatus) updateStatus(pendingStatus)
                  setPendingStatus(null)
                }}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
              >
                {updatingStatus ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelDialog && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-red-100 text-red-600">
                  <TriangleAlert className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Cancel Order</h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowCancelDialog(false); setCancelReason('') }}
                aria-label="Close cancel order dialog"
                className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to cancel <span className="font-semibold text-gray-900">{order.orderNumber}</span>?
              </p>
              <label className="mt-4 block">
                <span className="text-sm font-medium text-gray-700">Cancellation reason <span className="text-red-500">*</span></span>
                <textarea
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  placeholder="Why is this order being cancelled?"
                  rows={3}
                  className="mt-1.5 w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  autoFocus
                />
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={() => { setShowCancelDialog(false); setCancelReason('') }}
                className="inline-flex h-10 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={!cancelReason.trim() || updatingStatus}
                onClick={() => {
                  setShowCancelDialog(false)
                  updateStatus('cancelled', cancelReason.trim())
                }}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updatingStatus ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function PrintItemCard({
  item,
  index,
  count,
  copyToClipboard,
}: {
  item: AdminOrderItem
  index: number
  count: number
  copyToClipboard: (label: string, value: string) => void
}) {
  return (
    <article className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-2 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-semibold text-gray-900">Item {index + 1} of {count}</div>
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-700">
          <span className="truncate">{safeText(item.material)}</span>
          <span
            className="h-3.5 w-3.5 shrink-0 rounded-full border border-gray-300"
            style={{ backgroundColor: colorToCss(item.color) }}
            title={item.color}
          />
          <span className="truncate">{safeText(item.color)}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Spec label="Material" value={safeText(item.material)} />
        <Spec
          label="Color"
          value={
            <span className="inline-flex min-w-0 items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full border border-gray-300" style={{ backgroundColor: colorToCss(item.color) }} />
              <span className="truncate">{safeText(item.color)}</span>
            </span>
          }
        />
        <Spec label="Infill" value={`${formatNumber(item.infill, 0)}%`} />
        <Spec label="Layer Height" value={`${formatNumber(item.layerHeight)} mm`} />
        <Spec label="Quantity" value={`${formatNumber(item.quantity, 0)} pcs`} />
        <Spec label="Supports" value={item.supports ? 'Required' : 'None'} />
        <Spec label="Post-process" value={postProcessingLabel(item.postProcessingLevel)} />
        <Spec label="Difficulty" value={`${formatNumber(item.difficultyFactor, 2)}x`} />
        <Spec label="Dimensions" value="—" className="md:col-span-2" />
        <Spec label="Weight" value={`${formatNumber(item.weight, 2)} g/unit`} className="md:col-span-2" />
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
        <Clock className="h-4 w-4 text-gray-400" />
        <span className="font-medium text-gray-900">Estimated Print Time:</span>
        <span>{formatNumber(item.estimatedTime, 1)} hrs</span>
      </div>

      <div className="mt-4 border-t border-gray-100 pt-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2 font-semibold text-gray-900">
              <FileText className="h-4 w-4 shrink-0 text-violet-600" />
              <span className="truncate">{safeText(item.fileName)}</span>
            </div>
            <div className="mt-1 max-w-full truncate text-xs text-gray-500" title={item.fileUrl ?? undefined}>
              {safeText(item.fileUrl)}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copyToClipboard('File URL', item.fileUrl ?? '')}
              disabled={!item.fileUrl}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy URL
            </button>
            {item.fileUrl && (
              <a
                href={`/api/admin/orders/${item.id}/file`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white transition hover:bg-violet-700"
              >
                <Download className="h-3.5 w-3.5" />
                Download STL
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

function PricingTable({
  order,
  postProcessingCharges,
  discountTotal,
}: {
  order: AdminOrder
  postProcessingCharges: number
  discountTotal: number
}) {
  return (
    <div className="w-full overflow-hidden">
      <table className="w-full table-fixed text-sm">
        <tbody>
          {order.items.map((item, index) => (
            <PricingRow
              key={item.id}
              label={`Item ${index + 1} subtotal${item.fileName ? ` (${item.fileName})` : ''}`}
              value={formatMoney(item.subtotal)}
            />
          ))}
          {order.items.length > 1 && <PricingDivider />}
          <PricingRow label="Material Cost" value={formatMoney(order.materialCost)} />
          <PricingRow label="Machine Cost" value={formatMoney(order.machineCost)} />
          <PricingRow label="Post-processing" value={formatMoney(postProcessingCharges)} />
          <PricingDivider />
          <PricingRow label="Subtotal" value={formatMoney(order.subtotal)} />
          <PricingRow label={`Overhead (${formatNumber(order.overheadPercentage, 2)}%)`} value={formatMoney(order.overheadAmount)} />
          <PricingRow label={`Margin (${formatNumber(order.marginPercentage, 2)}%)`} value={formatMoney(order.marginAmount)} />
          <PricingDivider />
          <PricingRow label="Total Price" value={formatMoney(order.totalPriceBeforeDiscount)} strong />

          {discountTotal > 0 && (
            <>
              {order.cartDiscountAmount > 0 && (
                <PricingRow
                  label={`Cart Discount (${formatNumber(order.cartDiscountPercent, 2)}%)`}
                  value={`-${formatMoney(order.cartDiscountAmount)}`}
                  tone="discount"
                />
              )}
              {order.couponDiscountAmount > 0 && (
                <PricingRow
                  label={`Coupon${order.couponCode ? ` (${order.couponCode})` : ''}`}
                  value={`-${formatMoney(order.couponDiscountAmount)}`}
                  tone="discount"
                />
              )}
              {order.offerDiscountAmount > 0 && (
                <PricingRow
                  label={`Offer${order.offerName ? ` (${order.offerName})` : ''}`}
                  value={`-${formatMoney(order.offerDiscountAmount)}`}
                  tone="discount"
                />
              )}
              <PricingDivider />
            </>
          )}

          <PricingRow label="Final Price" value={formatMoney(order.finalPrice)} tone="success" strong />
          <PricingRow label="Delivery" value={order.deliveryCharge === 0 ? 'FREE' : formatMoney(order.deliveryCharge)} />
          <PricingDivider heavy />
          <PricingRow label="Grand Total" value={formatMoney(order.grandTotal)} tone="grand" strong />
        </tbody>
      </table>
    </div>
  )
}

function PricingRow({
  label,
  value,
  strong,
  tone,
}: {
  label: string
  value: string
  strong?: boolean
  tone?: 'success' | 'discount' | 'grand'
}) {
  const valueClass =
    tone === 'grand'
      ? 'text-lg font-bold text-gray-900'
      : tone === 'success'
        ? 'font-bold text-emerald-600'
        : tone === 'discount'
          ? 'font-semibold text-orange-500'
          : strong
            ? 'font-bold text-gray-900'
            : 'font-medium text-gray-900'

  return (
    <tr>
      <td className={`w-3/5 truncate py-2 pr-4 text-gray-600 ${tone === 'grand' ? 'text-base font-semibold text-gray-900' : ''}`} title={label}>
        {label}
      </td>
      <td className={`w-2/5 py-2 text-right ${valueClass}`}>{value}</td>
    </tr>
  )
}

function PricingDivider({ heavy }: { heavy?: boolean }) {
  return (
    <tr>
      <td colSpan={2} className="py-2">
        <div className={heavy ? 'border-t-2 border-gray-200' : 'border-t border-gray-100'} />
      </td>
    </tr>
  )
}

function formatAuditValue(action: string, value: Record<string, unknown> | null) {
  if (!value) return ''
  if (action === 'update_order_status') {
    const status = String(value.status ?? '')
    return status ? `Status → ${STATUS_LABELS[status as OrderStatus] ?? status}` : ''
  }
  if (action === 'update_order_notes') {
    const notes = String(value.notes ?? '')
    return notes ? `Notes updated` : 'Notes cleared'
  }
  return JSON.stringify(value)
}

function extractCancelReason(notes: string) {
  const match = notes.match(/^\[Cancellation:\s*(.+?)\]/)
  return match ? match[1] : null
}

function extractQuoteId(order: AdminOrder) {
  const fileUrl = order.fileUrl ?? order.items.find((item) => item.fileUrl)?.fileUrl ?? ''
  return fileUrl.match(/F3D-[A-Z0-9-]+/i)?.[0] ?? '—'
}

function getTimelineSteps(order: AdminOrder) {
  if (order.status === 'cancelled' || order.statusTimestamps?.cancelled) {
    return [...TIMELINE_STEPS, { label: 'Cancelled', status: 'cancelled' as const }]
  }

  return TIMELINE_STEPS
}

function timelineState(status: OrderStatus, step: TimelineStepConfig, index: number): TimelineStepState {
  if (step.status === 'cancelled') return 'cancelled'
  if (index === 0) return 'done'
  if (status === 'cancelled' || status === 'pending') return 'future'
  const currentIndex = STATUS_INDEX[status] ?? 0
  if (index < currentIndex) return 'done'
  if (index === currentIndex) return 'current'
  return 'future'
}

function timelineMeta(order: AdminOrder, step: TimelineStepConfig, index: number) {
  const state = timelineState(order.status, step, index)
  const timestamp = order.statusTimestamps?.[step.status] ?? (step.status === 'pending' ? order.createdAt : null)

  if (timestamp) return formatDateTime(timestamp)
  if (state === 'current') return 'In progress...'
  if (state === 'done' || state === 'cancelled') return 'Not recorded'
  return ''
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="!text-xs font-semibold uppercase tracking-wider text-gray-500">{children}</h2>
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <SectionTitle>{title}</SectionTitle>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Spec({ label, value, className = '' }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 ${className}`}>
      <div className="truncate text-xs text-gray-400">{label}</div>
      <div className="mt-1 min-w-0 text-sm font-medium text-gray-900">{value}</div>
    </div>
  )
}

function Divider() {
  return <div className="my-4 border-t border-gray-100" />
}

function TimelineStep({ label, meta, state }: { label: string; meta: string; state: TimelineStepState }) {
  const icon =
    state === 'done' ? (
      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
    ) : state === 'cancelled' ? (
      <Ban className="h-5 w-5 text-red-600" />
    ) : state === 'current' ? (
      <Clock className="h-5 w-5 text-blue-600" />
    ) : (
      <Circle className="h-5 w-5 text-gray-300" />
    )
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        {meta && <div className="mt-1 text-xs text-gray-500">{meta}</div>}
      </div>
    </div>
  )
}

function InfoLine({ icon, value, strong, children }: { icon: ReactNode; value?: string; strong?: boolean; children?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3 text-sm text-gray-600">
      <span className="shrink-0 text-gray-400">{icon}</span>
      {children ? (
        <span className={`min-w-0 truncate ${strong ? 'font-semibold text-gray-900' : undefined}`}>{children}</span>
      ) : (
        <span className={`min-w-0 truncate ${strong ? 'font-semibold text-gray-900' : undefined}`}>{value}</span>
      )}
    </div>
  )
}

function DiscountRow({ icon, title, description, saved }: { icon: ReactNode; title: string; description: string; saved: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-start gap-3">
        <span className="rounded-lg border border-orange-200 bg-orange-50 p-2 text-orange-500">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-gray-900">{title}</div>
          <div className="mt-1 text-xs text-gray-500">{description}</div>
          <div className="mt-2 text-sm font-semibold text-emerald-600">Saved: {formatMoney(saved)}</div>
        </div>
      </div>
    </div>
  )
}

function MetaRow({ label, value, action }: { label: string; value: string; action?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
      <span className="shrink-0 text-xs text-gray-400">{label}</span>
      <span className="flex min-w-0 items-center gap-2 text-right text-sm font-medium text-gray-900">
        <span className="truncate" title={safeText(value)}>{safeText(value)}</span>
        {action}
      </span>
    </div>
  )
}
