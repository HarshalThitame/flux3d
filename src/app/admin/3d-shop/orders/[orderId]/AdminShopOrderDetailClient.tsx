'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Banknote, FileText, PackageCheck, Printer, Save, Truck } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
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
  SHOP_FULFILMENT_PROGRESS,
  shopFulfilmentStatuses,
  type ShopAdminOrder,
  type ShopOrderStatus,
  type ShopFulfilmentStatus,
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

export default function AdminShopOrderDetailClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<ShopAdminOrder | null>(null)
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

  const loadOrder = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/3d-shop/admin/orders/${orderId}`)
      const data = await response.json().catch(() => ({})) as { order?: ShopAdminOrder; error?: string }
      if (!response.ok || !data.order) throw new Error(data.error || 'Failed to load order.')
      setOrder(data.order)
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
      const data = await response.json().catch(() => ({})) as { order?: ShopAdminOrder; error?: string }
      if (!response.ok || !data.order) throw new Error(data.error || 'Failed to update order.')
      setOrder(data.order)
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
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .shop-invoice-print,
          .shop-invoice-print * {
            visibility: visible;
          }
          .shop-invoice-print {
            position: absolute;
            inset: 0;
            width: 100%;
            background: white;
            padding: 24px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="no-print flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-3 text-sm font-semibold text-white shadow-sm"
        >
          <Printer className="h-4 w-4" />
          Print Invoice
        </button>
      </motion.div>

      <div className="no-print grid gap-6 xl:grid-cols-[1fr_380px]">
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
              <h2 className="!text-base font-bold text-[#0F1B3D]">Payment Info</h2>
              <div className="mt-4 flex items-center gap-3">
                <Banknote className="h-5 w-5 text-[#6d28d9]" />
                <div>
                  <div className="font-semibold text-[#0F1B3D]">Cash on Delivery</div>
                  <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getShopPaymentStatusClasses(order.payment_status)}`}>
                    {getShopPaymentStatusLabel(order.payment_status)}
                  </span>
                </div>
              </div>
            </div>
          </div>
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

      <section className="shop-invoice-print hidden print:block">
        <div className="mx-auto max-w-4xl bg-white text-[#0F1B3D]">
          <div className="flex items-start justify-between border-b border-gray-200 pb-6">
            <div>
              <div className="font-[var(--font-syne)] text-3xl font-extrabold">Flux3D</div>
              <div className="mt-1 text-sm font-semibold text-[#6d28d9]">3D Shop</div>
            </div>
            <div className="text-right text-sm text-[#6F7192]">
              <div className="font-bold text-[#0F1B3D]">Invoice</div>
              <div>Order #{order.order_number}</div>
              <div>{formatShopOrderDate(order.placed_at)}</div>
            </div>
          </div>

          <div className="grid gap-6 border-b border-gray-200 py-6 md:grid-cols-2">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.15em] text-[#6F7192]">Customer</div>
              <div className="mt-2 font-bold">{order.shipping_address.name}</div>
              <div className="text-sm text-[#6F7192]">
                {order.shipping_address.phone ? (
                  <a href={`tel:${order.shipping_address.phone.replace(/[^0-9+]/g, '')}`} className="underline-offset-2 hover:underline">{order.shipping_address.phone}</a>
                ) : '—'}
              </div>
              <div className="mt-2 text-sm leading-6 text-[#6F7192]">
                {order.shipping_address.line1}
                {order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ''}
                <br />
                {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.pincode}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.15em] text-[#6F7192]">Payment</div>
              <div className="mt-2 text-sm font-bold">Cash on Delivery</div>
            </div>
          </div>

          <table className="mt-6 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-[0.15em] text-[#6F7192]">
                <th className="py-3">Name</th>
                <th className="py-3">Variant</th>
                <th className="py-3 text-right">Qty</th>
                <th className="py-3 text-right">Unit Price</th>
                <th className="py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={`${item.skuId}-${item.customizationText ?? ''}`} className="border-b border-gray-100">
                  <td className="py-3 font-semibold">{item.productName}</td>
                  <td className="py-3 text-[#6F7192]">{item.variantLabel}</td>
                  <td className="py-3 text-right">{item.quantity}</td>
                  <td className="py-3 text-right">{formatShopPrice(item.unitPrice)}</td>
                  <td className="py-3 text-right">{formatShopPrice(getShopOrderLineTotal(item))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ml-auto mt-6 w-full max-w-sm space-y-2 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatShopPrice(order.subtotal)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>-{formatShopPrice(order.discount_amount)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{order.shipping_charge === 0 ? 'Free' : formatShopPrice(order.shipping_charge)}</span></div>
            <div className="flex justify-between border-t border-gray-200 pt-3 text-lg font-bold"><span>Grand Total</span><span>{formatShopPrice(order.total_amount)}</span></div>
          </div>

          <div className="mt-10 border-t border-gray-200 pt-5 text-center text-sm text-[#6F7192]">
            Thank you for your order!
          </div>
        </div>
      </section>
    </div>
  )
}
