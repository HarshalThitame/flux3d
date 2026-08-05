'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, BellRing, Check, Mail } from 'lucide-react'
import type { AdminToastState } from '@/components/admin/AdminToast'
import { ALERT_TYPE_LABELS, type StockAlertRow } from '@/lib/shop/stock'
import { formatVariantLabel } from '@/lib/shop/selection'

type StockAlertsTabProps = {
  toast: AdminToastState
  setToast: (toast: AdminToastState) => void
  refresh: () => void
  refreshKey: number
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'resolved', label: 'Resolved' },
  { value: '', label: 'All' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'low_stock', label: 'Low stock' },
  { value: 'out_of_stock', label: 'Out of stock' },
]

const SEVERITY_TONES: Record<StockAlertRow['severity'], string> = {
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  critical: 'bg-rose-50 text-rose-700 border-rose-200',
}

const STATUS_TONES: Record<StockAlertRow['status'], string> = {
  open: 'bg-rose-50 text-rose-700 border-rose-200',
  acknowledged: 'bg-amber-50 text-amber-700 border-amber-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function StockAlertsTab({
  setToast,
  refresh,
  refreshKey,
}: StockAlertsTabProps) {
  const [alerts, setAlerts] = useState<StockAlertRow[]>([])
  const [status, setStatus] = useState('open')
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)

  const PAGE_SIZE = 50
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (status) params.set('status', status)
      if (type) params.set('type', type)

      const response = await fetch(`/api/3d-shop/admin/stock/alerts?${params.toString()}`)
      const data = (await response.json().catch(() => ({}))) as {
        alerts?: StockAlertRow[]
        total?: number
        error?: string
      }
      if (!response.ok) throw new Error(data.error || 'Failed to load alerts.')
      setAlerts(data.alerts ?? [])
      setTotal(data.total ?? 0)
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load alerts.' })
    } finally {
      setLoading(false)
    }
  }, [page, status, type, setToast])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250)
    return () => window.clearTimeout(timer)
  }, [load, refreshKey])

  const act = async (alert: StockAlertRow, action: 'acknowledge' | 'resolve') => {
    setActingId(alert.id)
    try {
      const response = await fetch(`/api/3d-shop/admin/stock/alerts/${alert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(data.error || 'Update failed.')
      setToast({ type: 'success', message: action === 'acknowledge' ? 'Alert acknowledged.' : 'Alert resolved.' })
      await load()
      refresh()
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Update failed.' })
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[200px_220px_1fr]">
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
            className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none min-h-[44px]"
            aria-label="Filter by alert status"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value)
              setPage(1)
            }}
            className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none min-h-[44px]"
            aria-label="Filter by alert type"
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <p className="flex items-center gap-2 text-xs text-[#6F7192] lg:justify-end">
            <BellRing className="h-4 w-4" />
            Alerts are recomputed daily by the stock digest cron and resolve automatically when stock recovers.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Message', 'Type', 'Severity', 'Status', 'Stock at alert', 'Notified', 'Created', 'Actions'].map((label) => (
                  <th key={label} className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-[#6F7192]">Loading alerts…</td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-[#6F7192]">
                    <BellRing className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-3">No alerts found.</p>
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-[#0F1B3D]">{alert.message}</div>
                      <div className="text-[11px] text-[#6F7192]">
                        {alert.sku_code} · {formatVariantLabel(alert.variant_combination)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-[#0F1B3D]">
                      {ALERT_TYPE_LABELS[alert.alert_type]}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${SEVERITY_TONES[alert.severity]}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_TONES[alert.status]}`}>
                        {alert.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#6F7192]">{alert.stock_at_alert}</td>
                    <td className="px-4 py-3">
                      {alert.notified_at ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <Mail className="h-3.5 w-3.5" />
                          {formatDate(alert.notified_at)}
                        </span>
                      ) : (
                        <span className="text-xs text-[#9ca3af]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6F7192]">{formatDate(alert.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {(alert.status === 'open') && (
                          <button
                            type="button"
                            onClick={() => void act(alert, 'acknowledge')}
                            disabled={actingId === alert.id}
                            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-amber-200 px-3 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Acknowledge
                          </button>
                        )}
                        {(alert.status === 'open' || alert.status === 'acknowledged') && (
                          <button
                            type="button"
                            onClick={() => void act(alert, 'resolve')}
                            disabled={actingId === alert.id}
                            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
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
