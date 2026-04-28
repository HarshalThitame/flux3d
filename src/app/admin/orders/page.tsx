'use client'

import { useEffect, useState } from 'react'
import DataTable from '@/components/admin/DataTable'
import Drawer from '@/components/admin/Drawer'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import EmptyState from '@/components/admin/EmptyState'
import SkeletonBlock from '@/components/admin/SkeletonBlock'
import StatusBadge from '@/components/admin/StatusBadge'
import type { AdminOrder } from '@/lib/admin/types'

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null)
  const [toast, setToast] = useState<AdminToastState>(null)
  const [error, setError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<AdminOrder['status'] | null>(null)

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

  async function handleStatusUpdate(status: AdminOrder['status'], label: string) {
    if (!selectedOrder) return

    setUpdatingStatus(status)

    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          status,
        }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Failed to update order status.')
      }

      const json = (await response.json()) as { order: AdminOrder }

      setOrders((current) => (current ?? []).map((order) => (order.id === json.order.id ? json.order : order)))
      setSelectedOrder(json.order)
      setToast({ type: 'success', message: `${label} for ${json.order.orderNumber ?? json.order.id}.` })
    } catch (updateError) {
      setToast({
        type: 'error',
        message: updateError instanceof Error ? updateError.message : 'Failed to update order status.',
      })
    } finally {
      setUpdatingStatus(null)
    }
  }

  if (error) {
    return <div className="rounded-[28px] border border-rose-400/15 bg-rose-400/10 p-6 text-rose-100">{error}</div>
  }

  if (orders === null) {
    return <SkeletonBlock className="h-[420px] w-full" />
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

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-[32px] border border-white/10 bg-[rgba(10,16,31,0.94)] p-6">
          <h1 className="font-[var(--font-syne)] text-4xl font-extrabold text-white">Orders</h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-[#9ca7c6]">
            Review every print request with filters, searchable tables, and a focused detail drawer for fast operator actions.
          </p>
        </section>

        <DataTable
          title="Order Queue"
          description="Filter by status, inspect jobs, and keep the print floor moving."
          data={orders}
          searchPlaceholder="Search order ID, customer, material"
          searchKeys={['id', 'orderNumber', 'fullName', 'material', 'status']}
          onRowClick={setSelectedOrder}
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: [
                { label: 'Pending', value: 'pending' },
                { label: 'Reviewed', value: 'reviewed' },
                { label: 'Approved', value: 'approved' },
                { label: 'Printing', value: 'printing' },
                { label: 'Completed', value: 'completed' },
              ],
              getValue: (row) => row.status,
            },
          ]}
          columns={[
            { key: 'id', label: 'Order ID', sortable: true, sortValue: (row) => row.orderNumber ?? row.id, render: (row) => <span className="font-medium text-white">{row.orderNumber ?? row.id}</span> },
            { key: 'fullName', label: 'User', sortable: true, sortValue: (row) => row.fullName, render: (row) => row.fullName },
            { key: 'material', label: 'Material', sortable: true, sortValue: (row) => row.material, render: (row) => row.material },
            { key: 'totalPrice', label: 'Price', sortable: true, sortValue: (row) => row.totalPrice, render: (row) => `₹${Number(row.totalPrice).toLocaleString('en-IN')}` },
            { key: 'status', label: 'Status', sortable: true, sortValue: (row) => row.status, render: (row) => <StatusBadge status={row.status} /> },
          ]}
        />
      </div>

      <Drawer
        open={Boolean(selectedOrder)}
        onOpenChange={(open) => {
          if (!open) setSelectedOrder(null)
        }}
        title={selectedOrder?.orderNumber ?? selectedOrder?.id ?? 'Order details'}
      >
        {selectedOrder ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[#7f8aac]">Customer</div>
                <div className="mt-2 text-sm text-white">{selectedOrder.fullName}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[#7f8aac]">Status</div>
                <div className="mt-2"><StatusBadge status={selectedOrder.status} /></div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[#7f8aac]">Material</div>
                <div className="mt-2 text-sm text-white">{selectedOrder.material}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[#7f8aac]">Delivery</div>
                <div className="mt-2 text-sm text-white">
                  {Number(selectedOrder.deliveryCharge) === 0 ? 'Free' : `₹${Number(selectedOrder.deliveryCharge).toFixed(0)}`}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[#7f8aac]">Address</div>
              <div className="mt-2 text-sm leading-7 text-white">
                {selectedOrder.addressLine1}
                {selectedOrder.city ? `, ${selectedOrder.city}` : ''}
                {selectedOrder.state ? `, ${selectedOrder.state}` : ''}
                {selectedOrder.pincode ? ` ${selectedOrder.pincode}` : ''}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[#7f8aac]">Notes</div>
              <div className="mt-2 text-sm leading-7 text-white">{selectedOrder.notes}</div>
            </div>

            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => {
                  window.open(`/api/admin/orders/${selectedOrder.id}/file`, '_blank', 'noopener,noreferrer')
                }}
                className="rounded-[18px] border border-sky-400/15 bg-sky-400/10 px-4 py-3 text-sm font-medium text-sky-100 transition hover:bg-sky-400/15"
              >
                Download print file
              </button>
              {[
                { label: 'Mark reviewed', status: 'reviewed' as const },
                { label: 'Approve order', status: 'approved' as const },
                { label: 'Move to printing', status: 'printing' as const },
              ].map((action) => (
                <button
                  key={action.status}
                  type="button"
                  onClick={() => handleStatusUpdate(action.status, action.label)}
                  disabled={updatingStatus !== null || selectedOrder.status === action.status}
                  className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.07]"
                >
                  {updatingStatus === action.status ? 'Updating...' : action.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </Drawer>

      <AdminToast toast={toast} />
    </>
  )
}
