'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, ChevronLeft, ChevronRight, ArrowLeftRight } from 'lucide-react'
import type { AdminToastState } from '@/components/admin/AdminToast'
import { STOCK_REASON_LABELS, type StockMovementRow } from '@/lib/shop/stock'

type StockMovementsTabProps = {
  toast: AdminToastState
  setToast: (toast: AdminToastState) => void
  refresh: () => void
  refreshKey: number
}

const REASON_OPTIONS = Object.entries(STOCK_REASON_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const REASON_TONES: Record<string, string> = {
  order_placed: 'bg-violet-50 text-violet-700 border-violet-200',
  order_cancelled: 'bg-slate-100 text-slate-700 border-slate-200',
  order_returned: 'bg-blue-50 text-blue-700 border-blue-200',
  reservation_expired: 'bg-amber-50 text-amber-700 border-amber-200',
  manual_adjust: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  restock: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  release: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  system: 'bg-gray-100 text-gray-600 border-gray-200',
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

export default function StockMovementsTab({ setToast, refreshKey }: StockMovementsTabProps) {
  const [movements, setMovements] = useState<StockMovementRow[]>([])
  const [reason, setReason] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const PAGE_SIZE = 50
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (reason) params.set('reason', reason)
      if (search.trim()) params.set('search', search.trim())

      const response = await fetch(`/api/3d-shop/admin/stock/movements?${params.toString()}`)
      const data = (await response.json().catch(() => ({}))) as {
        movements?: StockMovementRow[]
        total?: number
        error?: string
      }
      if (!response.ok) throw new Error(data.error || 'Failed to load movements.')
      setMovements(data.movements ?? [])
      setTotal(data.total ?? 0)
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load movements.' })
    } finally {
      setLoading(false)
    }
  }, [page, reason, search, setToast])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250)
    return () => window.clearTimeout(timer)
  }, [load, refreshKey])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
          <select
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
              setPage(1)
            }}
            className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none min-h-[44px]"
            aria-label="Filter by movement reason"
          >
            <option value="">All reasons</option>
            {REASON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F7192]" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search by product or SKU"
              className="w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-[#0F1B3D] outline-none min-h-[44px]"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[820px] w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Product / SKU', 'Change', 'On hand', 'Reason', 'Actor / Note', 'When'].map((label) => (
                  <th key={label} className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-[#6F7192]">Loading movements…</td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-[#6F7192]">
                    <ArrowLeftRight className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-3">No stock movements recorded yet.</p>
                  </td>
                </tr>
              ) : (
                movements.map((movement) => (
                  <tr key={movement.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-[#0F1B3D]">{movement.product_name ?? 'Product'}</div>
                      <div className="text-[11px] text-[#6F7192]">{movement.sku_code}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                          movement.quantity_delta > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
                        }`}
                      >
                        {movement.quantity_delta > 0 ? '+' : ''}{movement.quantity_delta}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#6F7192]">
                      {movement.previous_quantity} → <strong className="text-[#0F1B3D]">{movement.new_quantity}</strong>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${REASON_TONES[movement.reason_type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STOCK_REASON_LABELS[movement.reason_type] ?? movement.reason_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-[#6F7192]">
                        {movement.note ? (
                          <span className="text-[#0F1B3D]">{movement.note}</span>
                        ) : movement.actor_name ? (
                          movement.actor_name
                        ) : (
                          '—'
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6F7192]">{formatDate(movement.created_at)}</td>
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
