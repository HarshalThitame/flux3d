'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { PackageCheck, Search } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import { formatShopPrice } from '@/lib/shop/selection'
import {
  formatShopOrderDate,
  getShopFulfilmentStatusClasses,
  getShopFulfilmentStatusLabel,
  getShopOrderStatusClasses,
  getShopOrderStatusLabel,
  getShopPaymentStatusClasses,
  getShopPaymentStatusLabel,
  type ShopAdminOrder,
  type ShopPaymentStatus,
} from '@/lib/shop/orders'

const statusOptions: Array<{ value: string; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'placed', label: 'Placed' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'pending', label: 'Fulfilment: Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'packing', label: 'Packing' },
  { value: 'packed', label: 'Packed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivering', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'return_requested', label: 'Return Requested' },
  { value: 'returned', label: 'Returned' },
]

const paymentStatuses: Array<{ value: '' | ShopPaymentStatus; label: string }> = [
  { value: '', label: 'All payments' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
]

export default function AdminShopOrdersClient() {
  const [orders, setOrders] = useState<ShopAdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<AdminToastState>(null)

  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected])

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (paymentStatus) params.set('payment_status', paymentStatus)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      if (search.trim()) params.set('search', search.trim())
      params.set('limit', '100')

      const response = await fetch(`/api/3d-shop/admin/orders?${params.toString()}`)
      const data = await response.json().catch(() => ({})) as { orders?: ShopAdminOrder[]; error?: string }
      if (!response.ok) throw new Error(data.error || 'Failed to load orders.')
      setOrders(data.orders ?? [])
      setSelected({})
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load orders.' })
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, paymentStatus, search, status])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrders()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [loadOrders])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  async function bulkUpdate(nextStatus: string) {
    if (selectedIds.length === 0) return
    const isFulfilment = nextStatus === 'packed'
    try {
      await Promise.all(selectedIds.map(async (id) => {
        const response = await fetch(`/api/3d-shop/admin/orders/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(isFulfilment ? { fulfilment_status: nextStatus } : { order_status: nextStatus }),
        })
        const data = await response.json().catch(() => ({})) as { error?: string }
        if (!response.ok) throw new Error(data.error || 'Bulk update failed.')
      }))
      setToast({ type: 'success', message: `Marked ${selectedIds.length} order${selectedIds.length === 1 ? '' : 's'} as ${nextStatus}.` })
      await loadOrders()
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Bulk update failed.' })
    }
  }

  return (
    <div className="space-y-6">
      <AdminToast toast={toast} />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/20 bg-[#6d28d9]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#6d28d9]">
            <PackageCheck className="h-3 w-3" />
            3D Shop
          </div>
          <h1 className="font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">Orders</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#6F7192]">Manage 3D Shop COD orders, status updates, and fulfilment details.</p>
        </div>
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void bulkUpdate('confirmed')}
              className="rounded-xl border border-[#6d28d9]/20 bg-white px-4 py-3 text-sm font-semibold text-[#6d28d9]"
            >
              Mark as Confirmed
            </button>
            <button
              type="button"
              onClick={() => void bulkUpdate('packed')}
              className="rounded-xl bg-[#6d28d9] px-4 py-3 text-sm font-semibold text-white"
            >
              Mark as Packed
            </button>
          </div>
        )}
      </motion.div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[180px_180px_150px_150px_1fr]">
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none">
            {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none">
            {paymentStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none" />
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none" />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F7192]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search order, customer, phone"
              className="w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-[#0F1B3D] outline-none"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={orders.length > 0 && orders.every((order) => selected[order.id])}
                    onChange={(event) => {
                      const checked = event.target.checked
                      setSelected(Object.fromEntries(orders.map((order) => [order.id, checked])))
                    }}
                  />
                </th>
                {['Order #', 'Customer Name', 'Items', 'Total', 'Payment', 'Status', 'Date', 'Actions'].map((label) => (
                  <th key={label} className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-sm text-[#6F7192]">Loading orders...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-sm text-[#6F7192]">No 3D Shop orders found.</td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={Boolean(selected[order.id])}
                        onChange={(event) => setSelected((current) => ({ ...current, [order.id]: event.target.checked }))}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#0F1B3D]">{order.order_number}</td>
                    <td className="px-4 py-3 text-sm text-[#0F1B3D]">
                      <div className="font-semibold">{order.customer?.name ?? order.shipping_address.name}</div>
                      <div className="text-xs text-[#6F7192]">{order.customer?.phone ?? order.shipping_address.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#6F7192]">{order.items.length}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#0F1B3D]">{formatShopPrice(order.total_amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getShopPaymentStatusClasses(order.payment_status)}`}>
                        {getShopPaymentStatusLabel(order.payment_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        order.order_status === 'cancelled' || order.order_status === 'returned'
                          ? getShopOrderStatusClasses(order.order_status)
                          : getShopFulfilmentStatusClasses(order.fulfilment_status)
                      }`}>
                        {order.order_status === 'cancelled' || order.order_status === 'returned'
                          ? getShopOrderStatusLabel(order.order_status)
                          : getShopFulfilmentStatusLabel(order.fulfilment_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#6F7192]">{formatShopOrderDate(order.placed_at)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/3d-shop/orders/${order.id}`} className="text-sm font-semibold text-[#6d28d9]">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
