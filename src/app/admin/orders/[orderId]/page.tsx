'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download, Package2, FileIcon, Layers, Clock, IndianRupee, Hash, Palette, Cuboid, Ruler, ShieldCheck, Wrench } from 'lucide-react'
import SkeletonBlock from '@/components/admin/SkeletonBlock'
import StatusBadge from '@/components/admin/StatusBadge'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import type { AdminOrder } from '@/lib/admin/types'

const statusActions = [
  { label: 'Reviewed', status: 'reviewed' as const, color: 'border-sky-400/20 bg-sky-400/10 text-sky-300 hover:bg-sky-400/15' },
  { label: 'Approved', status: 'approved' as const, color: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15' },
  { label: 'Queued', status: 'queued' as const, color: 'border-violet-400/20 bg-violet-400/10 text-violet-300 hover:bg-violet-400/15' },
  { label: 'Printing', status: 'printing' as const, color: 'border-[#7C5CFF]/20 bg-[#7C5CFF]/10 text-[#A78BFA] hover:bg-[#7C5CFF]/15' },
  { label: 'Shipped', status: 'shipped' as const, color: 'border-amber-400/20 bg-amber-400/10 text-amber-300 hover:bg-amber-400/15' },
  { label: 'Completed', status: 'completed' as const, color: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15' },
  { label: 'On Hold', status: 'on-hold' as const, color: 'border-white/10 bg-white/[0.03] text-[#8b95b5] hover:bg-white/[0.06]' },
  { label: 'Cancel', status: 'cancelled' as const, color: 'border-rose-400/20 bg-rose-400/10 text-rose-300 hover:bg-rose-400/15' },
  { label: 'Reject', status: 'rejected' as const, color: 'border-rose-400/20 bg-rose-400/10 text-rose-300 hover:bg-rose-400/15' },
]

export default function AdminOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.orderId as string

  const [order, setOrder] = useState<AdminOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [toast, setToast] = useState<AdminToastState>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const res = await fetch(`/api/admin/orders/${orderId}`, { signal: controller.signal })
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(body.error ?? 'Failed to load order.')
        }
        const json = await res.json() as { order: AdminOrder }
        setOrder(json.order)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Failed to load order.')
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [orderId])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  async function handleStatusUpdate(status: string, label: string) {
    setUpdatingStatus(status)
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: order!.groupId, status }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? 'Failed to update status.')
      }
      const json = await res.json() as { order: AdminOrder }
      setOrder(json.order)
      setToast({ type: 'success', message: `${label} for ${json.order.orderNumber}.` })
    } catch (err) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to update status.' })
    } finally {
      setUpdatingStatus(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-6 w-32" />
        <SkeletonBlock className="h-10 w-72" />
        <SkeletonBlock className="h-5 w-96" />
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-40" />
        </div>
        <SkeletonBlock className="h-52" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-5 text-sm text-rose-300">
        {error ?? 'Order not found.'}
      </div>
    )
  }

  const createdDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <>
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => router.push('/admin/orders')}
          className="inline-flex items-center gap-1.5 text-xs text-[#6F7192] transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to orders
        </button>

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#7C5CFF]/20 bg-[#7C5CFF]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#A78BFA]">
              <Package2 className="h-3 w-3" />
              Order Details
            </div>
            <h1 className="font-[var(--font-syne)] text-3xl font-bold tracking-tight text-white">
              {order.orderNumber}
            </h1>
            <p className="mt-1 text-sm text-[#6F7192]">
              {order.itemCount} item{order.itemCount > 1 ? 's' : ''} · Placed on {createdDate}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <InfoCard label="Customer" value={order.fullName} icon={<Hash className="h-3.5 w-3.5" />} />
          <InfoCard label="Phone" value={order.phone ?? '—'} icon={<Hash className="h-3.5 w-3.5" />} />
          <InfoCard label="Delivery" value={order.deliveryCharge === 0 ? 'Free' : `₹${order.deliveryCharge.toFixed(0)}`} icon={<IndianRupee className="h-3.5 w-3.5" />} />
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a6580]">Delivery Address</div>
          <div className="mt-1.5 text-sm leading-6 text-white">
            {[order.addressLine1, order.addressLine2, order.city, order.state, order.pincode].filter(Boolean).join(', ')}
          </div>
        </div>

        {order.notes && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a6580]">Notes</div>
            <div className="mt-1.5 text-sm text-white">{order.notes}</div>
          </div>
        )}

        <div>
          <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-[#5a6580]">
            <Cuboid className="h-3.5 w-3.5" />
            Order Items ({order.items.length})
          </div>
          <div className="space-y-4">
            {order.items.map((item, i) => (
              <div key={item.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7C5CFF]/15 text-xs font-bold text-[#A78BFA]">
                        {i + 1}
                      </span>
                      <span className="text-base font-semibold text-white">{item.material}</span>
                      <StatusBadge status={item.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      <Spec label="Color" value={item.color} icon={<Palette className="h-3 w-3" />} />
                      <Spec label="Infill" value={`${item.infill}%`} icon={<Layers className="h-3 w-3" />} />
                      <Spec label="Layer Ht." value={`${item.layerHeight} mm`} icon={<Ruler className="h-3 w-3" />} />
                      <Spec label="Quantity" value={`${item.quantity}`} icon={<Hash className="h-3 w-3" />} />
                      <Spec label="Price/Unit" value={`₹${item.pricePerUnit.toLocaleString('en-IN')}`} icon={<IndianRupee className="h-3 w-3" />} />
                      <Spec label="Total" value={`₹${item.price.toLocaleString('en-IN')}`} icon={<IndianRupee className="h-3 w-3" />} />
                      <Spec label="Est. Time" value={`${item.estimatedTime}h`} icon={<Clock className="h-3 w-3" />} />
                      <Spec label="Supports" value={item.supports ? 'Yes' : 'No'} icon={<ShieldCheck className="h-3 w-3" />} />
                      <Spec label="Post-Process" value={item.postProcessingLevel ?? '—'} icon={<Wrench className="h-3 w-3" />} />
                      <Spec label="PP Charges" value={`₹${item.postProcessingCharges.toLocaleString('en-IN')}`} icon={<IndianRupee className="h-3 w-3" />} />
                      <Spec label="File" value={item.fileName} icon={<FileIcon className="h-3 w-3" />} />
                    </div>
                  </div>
                </div>

                {item.fileUrl && (
                  <div className="mt-3 flex gap-2">
                    <a
                      href={`/api/admin/orders/${item.id}/file`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/15 bg-cyan-400/8 px-3 py-1.5 text-xs text-cyan-300 transition hover:bg-cyan-400/12"
                    >
                      <Download className="h-3 w-3" />
                      Download File
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] p-4">
          <div className="mb-3 text-xs uppercase tracking-[0.15em] text-[#5a6580]">Update Status</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {statusActions.map((action) => (
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

      <AdminToast toast={toast} />
    </>
  )
}

function InfoCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-[#5a6580]">
        {icon && <span className="text-[#6F7192]">{icon}</span>}
        {label}
      </div>
      <div className="mt-1.5 text-sm font-medium text-white">{value}</div>
    </div>
  )
}

function Spec({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/[0.04] bg-white/[0.01] px-3 py-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-[#5a6580]">
        {icon && <span className="text-[#6a7595]">{icon}</span>}
        {label}
      </div>
      <div className="mt-0.5 text-sm text-white">{value}</div>
    </div>
  )
}
