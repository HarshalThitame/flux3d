'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  MessageCircle,
  Search,
  ShoppingCart,
  Phone,
  Copy,
  ExternalLink,
  RefreshCw,
  MapPin,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react'
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
]

const paymentStatuses: Array<{ value: '' | ShopPaymentStatus; label: string }> = [
  { value: '', label: 'All payments' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
]

export default function WhatsAppOrdersClient() {
  const [orders, setOrders] = useState<ShopAdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<AdminToastState>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('source', 'whatsapp')
      if (status) params.set('status', status)
      if (paymentStatus) params.set('payment_status', paymentStatus)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      if (search.trim()) params.set('search', search.trim())
      params.set('limit', '100')

      const response = await fetch(`/api/3d-shop/admin/orders?${params.toString()}`)
      const data = await response.json().catch(() => ({})) as { orders?: ShopAdminOrder[]; error?: string }
      if (!response.ok) throw new Error(data.error || 'Failed to load WhatsApp orders.')
      setOrders(data.orders ?? [])
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
    const timer = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timer)
  }, [toast])

  // Statistics calculation
  const stats = useMemo(() => {
    const total = orders.length
    const paidOrders = orders.filter((o) => o.payment_status === 'paid')
    const totalPaidAmount = paidOrders.reduce((sum, o) => sum + Number(o.total_amount), 0)
    const pendingPaymentCount = orders.filter((o) => o.payment_status === 'pending').length
    const conversionRate = total > 0 ? Math.round((paidOrders.length / total) * 100) : 0

    return {
      total,
      paidCount: paidOrders.length,
      totalPaidAmount,
      pendingPaymentCount,
      conversionRate,
    }
  }, [orders])

  // Resend Payment Link Handler
  const handleResendPaymentLink = async (orderId: string, orderNumber: string) => {
    setActionLoadingId(orderId)
    try {
      const response = await fetch(`/api/admin/whatsapp/orders/${orderId}/payment-link`, {
        method: 'POST',
      })
      const data = await response.json().catch(() => ({})) as { success?: boolean; error?: string; shortUrl?: string }
      if (!response.ok) throw new Error(data.error || 'Failed to generate payment link.')
      
      setToast({
        type: 'success',
        message: `Successfully regenerated payment link for #${orderNumber} and sent via WhatsApp!`,
      })
      void loadOrders()
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to resend payment link.',
      })
    } finally {
      setActionLoadingId(null)
    }
  }

  // Helper to copy text to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setToast({ type: 'success', message: `${label} copied to clipboard!` })
  }

  return (
    <div className="space-y-6">
      <AdminToast toast={toast} />

      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            WhatsApp Automation
          </div>
          <h1 className="font-[var(--font-syne)] text-3xl font-extrabold tracking-tight text-[#0F1B3D]">
            WhatsApp Orders
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#6F7192]">
            Monitor in-chat catalog orders, validate addresses, and track automated Razorpay payment flows in real-time.
          </p>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: 'Total WhatsApp Orders',
            value: stats.total,
            icon: ShoppingCart,
            color: 'bg-indigo-50 border-indigo-100 text-indigo-700',
            desc: 'Catalog tap checkout sessions',
          },
          {
            title: 'Paid Orders Volume',
            value: formatShopPrice(stats.totalPaidAmount),
            icon: CheckCircle,
            color: 'bg-emerald-50 border-emerald-100 text-emerald-700',
            desc: `${stats.paidCount} orders paid via link`,
          },
          {
            title: 'Payment Conversion',
            value: `${stats.conversionRate}%`,
            icon: MessageCircle,
            color: 'bg-sky-50 border-sky-100 text-sky-700',
            desc: 'Percentage of orders paid',
          },
          {
            title: 'Awaiting Payment',
            value: stats.pendingPaymentCount,
            icon: Clock,
            color: 'bg-amber-50 border-amber-100 text-amber-700',
            desc: 'Requires link/follow up',
          },
        ].map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${card.color.split(' ')[1]}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6F7192]">{card.title}</span>
              <div className={`rounded-xl p-2.5 ${card.color.split(' ')[0]} ${card.color.split(' ')[2]}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold tracking-tight text-[#0F1B3D]">{card.value}</h3>
              <p className="mt-1 text-xs text-[#6F7192]">{card.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter Options */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F7192]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order #, phone, customer name..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-[#0F1B3D] outline-none transition-all focus:border-emerald-500 focus:bg-white"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none transition-all focus:border-emerald-500 focus:bg-white"
          >
            {statusOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none transition-all focus:border-emerald-500 focus:bg-white"
          >
            {paymentStatuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-1/2 rounded-xl border border-gray-200 bg-gray-50 px-2 py-2.5 text-xs text-[#0F1B3D] outline-none transition-all focus:border-emerald-500 focus:bg-white"
              title="From Date"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-1/2 rounded-xl border border-gray-200 bg-gray-50 px-2 py-2.5 text-xs text-[#0F1B3D] outline-none transition-all focus:border-emerald-500 focus:bg-white"
              title="To Date"
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/75">
              <tr>
                {['Order & Date', 'Customer (WhatsApp)', 'Items', 'Total', 'Delivery Address', 'Payment', 'Fulfilment', 'Actions'].map((label) => (
                  <th
                    key={label}
                    className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#6F7192]"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-7 w-7 animate-spin text-emerald-600" />
                      <span className="text-sm font-medium text-[#6F7192]">Loading WhatsApp orders...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShoppingCart className="h-9 w-9 text-gray-300" />
                      <span className="text-sm font-medium text-[#6F7192]">No WhatsApp orders found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const phoneClean = (order.customer?.phone ?? order.shipping_address.phone ?? '').replace(/\D/g, '')
                  const waLink = `https://wa.me/${phoneClean.length === 10 ? '91' + phoneClean : phoneClean}`
                  
                  return (
                    <tr
                      key={order.id}
                      className="group transition-colors hover:bg-gray-50/50"
                    >
                      {/* Order Number & Placed At */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <Link
                          href={`/admin/3d-shop/orders/${order.id}`}
                          className="flex flex-col group-hover:text-emerald-700"
                        >
                          <span className="text-sm font-bold text-[#0F1B3D] transition-colors group-hover:text-emerald-700">
                            {order.order_number}
                          </span>
                          <span className="text-xs text-[#6F7192] mt-0.5">
                            {formatShopOrderDate(order.placed_at)}
                          </span>
                        </Link>
                      </td>

                      {/* Customer Info */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-[#0F1B3D]">
                            {order.customer?.name ?? order.shipping_address.name ?? 'WhatsApp Customer'}
                          </span>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-[#6F7192]">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span>{order.customer?.phone ?? order.shipping_address.phone}</span>
                            <button
                              onClick={() => copyToClipboard(order.customer?.phone ?? order.shipping_address.phone, 'Phone number')}
                              className="text-gray-400 hover:text-[#0F1B3D]"
                              title="Copy Phone"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:text-emerald-700"
                              title="Open Chat"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Items */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 max-w-[200px]">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="text-xs text-[#0F1B3D]">
                              <span className="font-semibold text-emerald-700">{item.quantity}x</span>{' '}
                              <span className="text-[#0F1B3D] font-medium">{item.productName}</span>{' '}
                              <span className="text-[10px] text-[#6F7192]">({item.variantLabel})</span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-[#0F1B3D]">
                        {formatShopPrice(order.total_amount)}
                      </td>

                      {/* Delivery Address */}
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-1.5 text-xs text-[#6F7192] max-w-[240px]">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                          <div>
                            <p className="font-semibold text-[#0F1B3D]">
                              {order.shipping_address.name}
                            </p>
                            <p className="mt-0.5 line-clamp-2">
                              {order.shipping_address.line1}
                              {order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ''}
                            </p>
                            <p className="mt-0.5">
                              {order.shipping_address.city}, {order.shipping_address.state} -{' '}
                              <span className="font-bold text-[#0F1B3D]">{order.shipping_address.pincode}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Payment Status */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${getShopPaymentStatusClasses(order.payment_status)}`}>
                          {order.payment_status === 'paid' && <CheckCircle className="h-3 w-3" />}
                          {order.payment_status === 'pending' && <Clock className="h-3 w-3" />}
                          {order.payment_status === 'failed' && <AlertTriangle className="h-3 w-3" />}
                          {getShopPaymentStatusLabel(order.payment_status)}
                        </span>
                      </td>

                      {/* Fulfilment Status */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          order.order_status === 'cancelled'
                            ? getShopOrderStatusClasses(order.order_status)
                            : getShopFulfilmentStatusClasses(order.fulfilment_status)
                        }`}>
                          {order.order_status === 'cancelled'
                            ? getShopOrderStatusLabel(order.order_status)
                            : getShopFulfilmentStatusLabel(order.fulfilment_status)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/admin/3d-shop/orders/${order.id}`}
                            className="text-[#6d28d9] hover:text-[#4c1d95]"
                          >
                            View
                          </Link>
                          {order.payment_status === 'pending' && (
                            <button
                              disabled={actionLoadingId === order.id}
                              onClick={() => void handleResendPaymentLink(order.id, order.order_number)}
                              className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                              title="Resend Payment Link via WhatsApp"
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${actionLoadingId === order.id ? 'animate-spin' : ''}`} />
                              <span>Resend Link</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
