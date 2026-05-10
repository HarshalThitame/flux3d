'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { PackageOpen, Boxes } from 'lucide-react'
import DataTable from '@/components/admin/DataTable'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import EmptyState from '@/components/admin/EmptyState'
import SkeletonBlock from '@/components/admin/SkeletonBlock'
import StatusBadge from '@/components/admin/StatusBadge'
import type { AdminOrder } from '@/lib/admin/types'

export default function AdminOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<AdminOrder[] | null>(null)
  const [toast, setToast] = useState<AdminToastState>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch('/api/admin/orders', { signal: controller.signal })
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? 'Failed to load orders.')
        }

        const json = (await response.json()) as { orders: AdminOrder[] }
        setOrders(json.orders)
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') return
        setError(loadError instanceof Error ? loadError.message : 'Failed to load orders.')
      }
    }

    void load()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  if (error) {
    return <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-5 text-sm text-rose-300">{error}</div>
  }

  if (orders === null) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <SkeletonBlock className="h-8 w-48" />
          <SkeletonBlock className="h-5 w-96 max-w-full" />
        </div>
        <SkeletonBlock className="h-[420px] w-full" />
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        description="Orders will appear here once print requests are submitted."
        ctaLabel="Review quotes"
        ctaHref="/admin/quotes"
      />
    )
  }

  const totalItems = orders.reduce((sum, o) => sum + o.itemCount, 0)

  return (
    <>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#7C5CFF]/20 bg-[#7C5CFF]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#7C5CFF]">
            <PackageOpen className="h-3 w-3" />
            Order Management
          </div>
          <h1 className="mt-2 font-[var(--font-syne)] text-3xl font-bold tracking-tight text-white">Orders</h1>
          <p className="mt-2 max-w-xl text-sm text-[#6F7192]">
            {orders.length} order{orders.length !== 1 ? 's' : ''} · {totalItems} item{totalItems !== 1 ? 's' : ''} total
          </p>
        </motion.div>

        <DataTable
          title="Order Queue"
          description={`${orders.length} grouped orders`}
          data={orders}
          searchPlaceholder="Search order ID, customer, material"
          searchKeys={['id', 'orderNumber', 'groupId', 'fullName', 'material', 'status']}
          onRowClick={(row) => router.push(`/admin/orders/${row.groupId}`)}
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: [
                { label: 'Pending', value: 'pending' },
                { label: 'Reviewed', value: 'reviewed' },
                { label: 'Approved', value: 'approved' },
                { label: 'Queued', value: 'queued' },
                { label: 'On Hold', value: 'on-hold' },
                { label: 'Printing', value: 'printing' },
                { label: 'Shipped', value: 'shipped' },
                { label: 'Completed', value: 'completed' },
                { label: 'Cancelled', value: 'cancelled' },
                { label: 'Rejected', value: 'rejected' },
              ],
              getValue: (row) => row.status,
            },
          ]}
          columns={[
            {
              key: 'id',
              label: 'Order',
              sortable: true,
              sortValue: (row) => row.orderNumber,
              render: (row) => (
                <div>
                  <span className="font-medium text-white">{row.orderNumber}</span>
                  {row.itemCount > 1 && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-violet-400/20 bg-violet-400/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
                      <Boxes className="h-2.5 w-2.5" />
                      {row.itemCount} items
                    </span>
                  )}
                </div>
              ),
            },
            { key: 'fullName', label: 'Customer', sortable: true, sortValue: (row) => row.fullName, render: (row) => <span className="text-[#c6cee5]">{row.fullName}</span> },
            {
              key: 'material',
              label: 'Materials',
              sortable: true,
              sortValue: (row) => row.material,
              render: (row) => (
                <div className="flex flex-wrap gap-1">
                  {row.items.slice(0, 2).map((item) => (
                    <span key={item.id} className="rounded-md border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-[#8b95b5]">
                      {item.material}
                    </span>
                  ))}
                  {row.items.length > 2 && (
                    <span className="rounded-md border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-[#5a6580]">
                      +{row.items.length - 2}
                    </span>
                  )}
                </div>
              ),
            },
            { key: 'totalPrice', label: 'Total', sortable: true, sortValue: (row) => row.totalPrice, render: (row) => <span className="font-medium text-white">₹{row.totalPrice.toLocaleString('en-IN')}</span> },
            { key: 'status', label: 'Status', sortable: true, sortValue: (row) => row.status, render: (row) => <StatusBadge status={row.status} /> },
          ]}
        />
      </div>

      <AdminToast toast={toast} />
    </>
  )
}
