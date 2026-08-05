'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarClock, ExternalLink } from 'lucide-react'
import type { AdminToastState } from '@/components/admin/AdminToast'
import type { StockReservationRow } from '@/lib/shop/stock'
import { formatVariantLabel } from '@/lib/shop/selection'

type StockReservationsTabProps = {
  toast: AdminToastState
  setToast: (toast: AdminToastState) => void
  refresh: () => void
  refreshKey: number
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'converted', label: 'Converted' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_TONES: Record<StockReservationRow['status'], string> = {
  active: 'bg-violet-50 text-violet-700 border-violet-200',
  converted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  expired: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatExpiry(value: string) {
  const diff = new Date(value).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const hours = Math.ceil(diff / (1000 * 60 * 60))
  if (hours < 24) return `${hours}h left`
  return `${Math.floor(hours / 24)}d ${hours % 24}h left`
}

export default function StockReservationsTab({
  setToast,
  refresh,
  refreshKey,
}: StockReservationsTabProps) {
  const [reservations, setReservations] = useState<StockReservationRow[]>([])
  const [status, setStatus] = useState('active')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [releasingId, setReleasingId] = useState<string | null>(null)

  const PAGE_SIZE = 50
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (status) params.set('status', status)

      const response = await fetch(`/api/3d-shop/admin/stock/reservations?${params.toString()}`)
      const data = (await response.json().catch(() => ({}))) as {
        reservations?: StockReservationRow[]
        total?: number
        error?: string
      }
      if (!response.ok) throw new Error(data.error || 'Failed to load reservations.')
      setReservations(data.reservations ?? [])
      setTotal(data.total ?? 0)
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load reservations.' })
    } finally {
      setLoading(false)
    }
  }, [page, status, setToast])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250)
    return () => window.clearTimeout(timer)
  }, [load, refreshKey])

  const releaseReservation = async (reservation: StockReservationRow) => {
    if (!window.confirm(`Release this reservation of ${reservation.quantity} unit(s) for ${reservation.sku_code}? Stock will be restored.`)) return
    setReleasingId(reservation.id)
    try {
      const response = await fetch(`/api/3d-shop/admin/stock/reservations/${reservation.id}/release`, {
        method: 'POST',
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(data.error || 'Failed to release reservation.')
      setToast({ type: 'success', message: 'Reservation released. Stock restored.' })
      await load()
      refresh()
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to release reservation.' })
    } finally {
      setReleasingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
            className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none min-h-[44px]"
            aria-label="Filter by reservation status"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <p className="flex items-center gap-2 text-xs text-[#6F7192] lg:justify-end">
            <CalendarClock className="h-4 w-4" />
            Reservations hold stock for 24h until payment or manual release.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[880px] w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Product / SKU', 'Quantity', 'Status', 'Order', 'Reserved at', 'Expires', 'Actions'].map((label) => (
                  <th key={label} className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-[#6F7192]">Loading reservations…</td>
                </tr>
              ) : reservations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-[#6F7192]">
                    <CalendarClock className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-3">No reservations found.</p>
                  </td>
                </tr>
              ) : (
                reservations.map((reservation) => (
                  <tr key={reservation.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-[#0F1B3D]">{reservation.product_name ?? 'Product'}</div>
                      <div className="text-[11px] text-[#6F7192]">
                        {reservation.sku_code} · {formatVariantLabel(reservation.variant_combination)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-[#0F1B3D]">{reservation.quantity}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_TONES[reservation.status]}`}>
                        {reservation.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`/admin/3d-shop/orders/${reservation.order_id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-[#6d28d9] transition hover:text-[#5b21b6]"
                      >
                        {reservation.order_number ?? 'Order'}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      {reservation.total_amount !== null && (
                        <div className="text-[11px] text-[#6F7192]">
                          ₹{Number(reservation.total_amount).toFixed(2)} · {reservation.payment_status}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6F7192]">{formatDate(reservation.reserved_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${reservation.status === 'active' ? 'text-amber-600' : 'text-[#6F7192]'}`}>
                        {formatDate(reservation.expires_at)}
                      </span>
                      {reservation.status === 'active' && (
                        <div className="text-[10px] text-[#9ca3af]">{formatExpiry(reservation.expires_at)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {reservation.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => void releaseReservation(reservation)}
                          disabled={releasingId === reservation.id}
                          className="inline-flex min-h-[40px] items-center rounded-lg border border-amber-200 px-3 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
                        >
                          {releasingId === reservation.id ? 'Releasing…' : 'Release early'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="text-xs text-[#6F7192]">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-gray-200 text-[#6F7192] transition disabled:opacity-30 hover:bg-gray-50"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-[#6F7192]">{page} / {totalPages}</span>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-gray-200 text-[#6F7192] transition disabled:opacity-30 hover:bg-gray-50"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
