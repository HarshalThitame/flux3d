'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus, Search, Package } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import { CustomOrder, CustomOrderStatusLabels, CustomOrderStatusColors, PaymentStatusLabels, PaymentStatusColors } from '@/lib/custom-orders/types'

type TabValue = 'all' | 'pending' | 'in_production' | 'ready' | 'delivered' | 'cancelled'

const tabs: Array<{ key: TabValue; label: string }> = [
  { key: 'all', label: 'All Orders' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_production', label: 'In Production' },
  { key: 'ready', label: 'Ready' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
]

function formatDate(value: string | null) {
  if (!value) return 'N/A'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
}

const PAGE_SIZE = 20

export default function CustomOrdersClient() {
  const router = useRouter()
  const [tab, setTab] = useState<TabValue>('all')
  const [search, setSearch] = useState('')
  const [orders, setOrders] = useState<CustomOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<AdminToastState>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  
  const [debouncedSearch, setDebouncedSearch] = useState(search)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) })
    if (tab !== 'all') params.set('status', tab)
    if (debouncedSearch) params.set('search', debouncedSearch)
    return params.toString()
  }, [tab, page, debouncedSearch])

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/custom-orders?${queryString}`)
      const data = await response.json().catch(() => ({})) as { orders?: CustomOrder[]; total?: number; error?: string }
      if (!response.ok) throw new Error(data.error || 'Failed to load orders.')
      setOrders(data.orders ?? [])
      setTotal(data.total ?? 0)
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load orders.' })
    } finally {
      setLoading(false)
    }
  }, [queryString])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  return (
    <div className="space-y-6">
      <AdminToast toast={toast} />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/20 bg-[#6d28d9]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#6d28d9]">
            <Package className="h-3 w-3" />
            Custom Orders
          </div>
          <h1 className="font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">Custom Orders</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#6F7192]">Manage personalized 3D printing requests, quotes, and manual orders.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/admin/custom-orders/create')}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#6d28d9] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#5b21b6]"
          >
            <Plus className="h-4 w-4" />
            Create Order
          </button>
        </div>
      </motion.div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-2">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => { setPage(1); setTab(item.key) }}
              className={`min-h-[42px] shrink-0 rounded-xl px-4 text-sm font-semibold ${
                tab === item.key ? 'bg-[#6d28d9] text-white' : 'text-[#6F7192] hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search orders, customers..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-[#6d28d9] focus:ring-1 focus:ring-[#6d28d9]"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Order #', 'Customer', 'Items Summary', 'Status', 'Payment', 'Total', 'Created'].map((label) => (
                  <th key={label} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6F7192]">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-[#6F7192]">Loading orders...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-[#6F7192]">No orders found.</td></tr>
              ) : (
                orders.map((order) => (
                  <tr 
                    key={order.id} 
                    onClick={() => router.push(`/admin/custom-orders/${order.id}`)}
                    className="cursor-pointer border-b border-gray-100 align-top transition-colors hover:bg-gray-50 last:border-0"
                  >
                    <td className="px-4 py-4 text-sm font-semibold text-[#0F1B3D]">{order.order_number}</td>
                    <td className="px-4 py-4 text-sm text-[#0F1B3D]">
                      <div className="font-semibold">{order.customer_name}</div>
                      <div className="text-xs text-[#6F7192]">{order.customer_phone}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-[#6F7192]">
                      <div className="line-clamp-2 max-w-[200px]">
                        {order.items && order.items.length > 0 
                          ? order.items.map(i => `${i.quantity}x ${i.description}`).join(', ')
                          : 'No items'
                        }
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${CustomOrderStatusColors[order.status]}`}>
                        {CustomOrderStatusLabels[order.status]}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${PaymentStatusColors[order.payment_status]}`}>
                        {PaymentStatusLabels[order.payment_status]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-[#0F1B3D]">
                      ₹{order.total_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-4 text-sm text-[#6F7192]">{formatDate(order.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-4 py-3">
            <div className="text-sm text-[#6F7192]">
              Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)} of {total}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="min-h-[32px] rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-[#6F7192] shadow-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page * PAGE_SIZE >= total}
                onClick={() => setPage((p) => p + 1)}
                className="min-h-[32px] rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-[#6F7192] shadow-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
