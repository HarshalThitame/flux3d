'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, PackageOpen, Boxes } from 'lucide-react'
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: selectedOrder.groupId, status }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Failed to update order status.')
      }

      const json = (await response.json()) as { order: AdminOrder }

      setOrders((current) => (current ?? []).map((order) => (order.groupId === json.order.groupId ? json.order : order)))
      setSelectedOrder(json.order)
      setToast({ type: 'success', message: `${label} for ${json.order.orderNumber}.` })
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
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#FF5C1A]/20 bg-[#FF5C1A]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#FF9A72]">
            <PackageOpen className="h-3 w-3" />
            Order Management
          </div>
          <h1 className="mt-2 font-[var(--font-syne)] text-3xl font-bold tracking-tight text-white">Orders</h1>
          <p className="mt-2 max-w-xl text-sm text-[#7a82a0]">
            {orders.length} order{orders.length !== 1 ? 's' : ''} · {totalItems} item{totalItems !== 1 ? 's' : ''} total
          </p>
        </motion.div>

        <DataTable
          title="Order Queue"
          description={`${orders.length} grouped orders`}
          data={orders}
          searchPlaceholder="Search order ID, customer, material"
          searchKeys={['id', 'orderNumber', 'groupId', 'fullName', 'material', 'status']}
          onRowClick={setSelectedOrder}
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

      <Drawer
        open={Boolean(selectedOrder)}
        onOpenChangeAction={(open) => { if (!open) setSelectedOrder(null) }}
        title={selectedOrder?.orderNumber ?? 'Order details'}
      >
        {selectedOrder && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">{selectedOrder.orderNumber}</div>
                <div className="text-xs text-[#7a82a0]">{selectedOrder.itemCount} item{selectedOrder.itemCount > 1 ? 's' : ''} in this order</div>
              </div>
              <StatusBadge status={selectedOrder.status} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoCard label="Customer" value={selectedOrder.fullName} />
              <InfoCard label="Delivery" value={selectedOrder.deliveryCharge === 0 ? 'Free' : `₹${selectedOrder.deliveryCharge.toFixed(0)}`} />
            </div>

            <InfoCard label="Address" value={
              <>
                {selectedOrder.addressLine1}
                {selectedOrder.city && `, ${selectedOrder.city}`}
                {selectedOrder.state && `, ${selectedOrder.state}`}
                {selectedOrder.pincode && ` ${selectedOrder.pincode}`}
              </>
            } />

            {selectedOrder.notes && <InfoCard label="Notes" value={selectedOrder.notes} />}

            {/* Items Section */}
            <div>
              <div className="mb-2 text-[10px] uppercase tracking-[0.15em] text-[#5a6580]">
                Order Items ({selectedOrder.items.length})
              </div>
              <div className="space-y-2">
                {selectedOrder.items.map((item, i) => (
                  <div key={item.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FF5C1A]/15 text-[10px] font-bold text-[#FF9A72]">
                            {i + 1}
                          </span>
                          <span className="text-sm font-medium text-white">{item.material}</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-[#7a82a0]">
                          {item.color && <span>Color: {item.color}</span>}
                          <span>Infill: {item.infill}%</span>
                          <span>~{item.estimatedTime}h</span>
                          {item.weight && <span>{item.weight}g</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-white">₹{item.price.toLocaleString('en-IN')}</div>
                        <StatusBadge status={item.status} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Download files */}
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a6580]">Files</div>
              {selectedOrder.items.map((item) => (
                item.fileUrl && (
                  <a
                    key={item.id}
                    href={`/api/admin/orders/${item.id}/file`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-cyan-400/15 bg-cyan-400/8 px-3 py-2 text-xs text-cyan-300 transition hover:bg-cyan-400/12"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {item.fileName || 'Download file'}
                  </a>
                )
              ))}
            </div>

            {/* Status Actions */}
            <div className="space-y-2 border-t border-white/[0.06] pt-4">
              <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a6580]">Update Status</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Reviewed', status: 'reviewed' as const, color: 'border-sky-400/20 bg-sky-400/10 text-sky-300 hover:bg-sky-400/15' },
                  { label: 'Approved', status: 'approved' as const, color: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15' },
                  { label: 'Queued', status: 'queued' as const, color: 'border-violet-400/20 bg-violet-400/10 text-violet-300 hover:bg-violet-400/15' },
                  { label: 'Printing', status: 'printing' as const, color: 'border-[#FF5C1A]/20 bg-[#FF5C1A]/10 text-[#FF9A72] hover:bg-[#FF5C1A]/15' },
                  { label: 'Shipped', status: 'shipped' as const, color: 'border-amber-400/20 bg-amber-400/10 text-amber-300 hover:bg-amber-400/15' },
                  { label: 'Completed', status: 'completed' as const, color: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15' },
                  { label: 'On Hold', status: 'on-hold' as const, color: 'border-white/10 bg-white/[0.03] text-[#8b95b5] hover:bg-white/[0.06]' },
                  { label: 'Cancel', status: 'cancelled' as const, color: 'border-rose-400/20 bg-rose-400/10 text-rose-300 hover:bg-rose-400/15' },
                  { label: 'Reject', status: 'rejected' as const, color: 'border-rose-400/20 bg-rose-400/10 text-rose-300 hover:bg-rose-400/15' },
                ].map((action) => (
                  <button
                    key={action.status}
                    type="button"
                    onClick={() => handleStatusUpdate(action.status, action.label)}
                    disabled={updatingStatus !== null}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition disabled:opacity-40 ${action.color}`}
                  >
                    {updatingStatus === action.status ? 'Updating...' : action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <AdminToast toast={toast} />
    </>
  )
}

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
      <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a6580]">{label}</div>
      <div className="mt-1.5 text-sm text-white">{value}</div>
    </div>
  )
}
