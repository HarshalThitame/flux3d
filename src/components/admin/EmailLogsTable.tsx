'use client'

import { useEffect, useRef, useState } from 'react'
import { Mail, RefreshCw, Search, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Clock, Eye, Ban, XCircle, LoaderCircle } from 'lucide-react'
import type { EmailLogRow, EmailEventRow, EmailLogStatus, EmailType } from '../../../types/database'

const STATUS_OPTIONS: EmailLogStatus[] = [
  'queued',
  'sent',
  'delivered',
  'opened',
  'bounced',
  'failed',
  'complained',
  'dropped',
]

const TYPE_OPTIONS: EmailType[] = [
  'welcome',
  'email_verification',
  'password_reset',
  'order_placed_customer',
  'order_placed_admin',
  'model_validation_pass',
  'model_validation_fail',
  'production_started',
  'order_shipped',
  'delivery_confirmation',
  'payment_receipt',
  'payment_failed',
  'refund_issued',
  'contact_notification',
]

function statusBadgeClass(status: EmailLogStatus): string {
  switch (status) {
    case 'delivered':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'sent':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'opened':
      return 'bg-violet-100 text-violet-700 border-violet-200'
    case 'queued':
      return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'bounced':
    case 'failed':
    case 'dropped':
      return 'bg-red-100 text-red-700 border-red-200'
    case 'complained':
      return 'bg-orange-100 text-orange-700 border-orange-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

function statusIcon(status: EmailLogStatus) {
  switch (status) {
    case 'delivered':
      return <CheckCircle2 className="h-3.5 w-3.5" />
    case 'sent':
      return <Mail className="h-3.5 w-3.5" />
    case 'opened':
      return <Eye className="h-3.5 w-3.5" />
    case 'queued':
      return <Clock className="h-3.5 w-3.5" />
    case 'bounced':
    case 'failed':
    case 'dropped':
      return <XCircle className="h-3.5 w-3.5" />
    case 'complained':
      return <AlertTriangle className="h-3.5 w-3.5" />
    default:
      return null
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type Props = {
  initialData: EmailLogRow[]
  initialTotal: number
}

export default function EmailLogsTable({ initialData, initialTotal }: Props) {
  const [logs, setLogs] = useState<EmailLogRow[]>(initialData)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [statusFilter, setStatusFilter] = useState<EmailLogStatus | ''>('')
  const [typeFilter, setTypeFilter] = useState<EmailType | ''>('')
  const [recipientFilter, setRecipientFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [selectedLog, setSelectedLog] = useState<EmailLogRow | null>(null)
  const [events, setEvents] = useState<EmailEventRow[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchLogs = async (p: number, l: number) => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(p))
    params.set('limit', String(l))
    if (statusFilter) params.set('status', statusFilter)
    if (typeFilter) params.set('email_type', typeFilter)
    if (recipientFilter) params.set('recipient', recipientFilter)

    try {
      const res = await fetch(`/api/admin/email-logs?${params.toString()}`)
      const json = await res.json()
      if (res.ok) {
        setLogs((json.data as EmailLogRow[]) ?? [])
        setTotal(json.total ?? 0)
      } else {
        console.error('[EmailLogsTable] API error:', json.error)
      }
    } catch (err) {
      console.error('[EmailLogsTable] Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setPage(1)
      fetchLogs(1, limit)
    }, 350)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter, recipientFilter, limit])

  useEffect(() => {
    fetchLogs(page, limit)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const handleResend = async (log: EmailLogRow) => {
    setResendingId(log.id)
    try {
      const res = await fetch(`/api/admin/email-logs/${log.id}/resend`, { method: 'POST' })
      const json = await res.json()
      if (res.ok) {
        alert('Email re-queued successfully')
        fetchLogs(page, limit)
      } else {
        alert(json.error ?? 'Failed to resend email')
      }
    } catch (err) {
      alert('Network error while resending')
    } finally {
      setResendingId(null)
    }
  }

  const openDetail = async (log: EmailLogRow) => {
    setSelectedLog(log)
    setEventsLoading(true)
    try {
      // Fetch events from a simple client-side query (no dedicated API needed;
      // we can use the Supabase client if available, but for simplicity we
      // query via a lightweight route or just show limited info.)
      const res = await fetch(`/api/admin/email-logs?order_id=${log.order_id ?? ''}&limit=1`)
      // Actually, let's just show log metadata for now and skip full event
      // timeline to avoid creating another API route. We'll show what we have.
      setEvents([])
    } finally {
      setEventsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EmailLogStatus | '')}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-violet-500 focus:outline-none"
          >
            <option value="">All</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as EmailType | '')}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-violet-500 focus:outline-none"
          >
            <option value="">All</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Recipient</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search email..."
              value={recipientFilter}
              onChange={(e) => setRecipientFilter(e.target.value)}
              className="w-64 rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-700 focus:border-violet-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => fetchLogs(page, limit)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Recipient</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Type</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Subject</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Sent At</th>
              <th className="px-4 py-3 font-semibold text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map((log) => (
              <tr
                key={log.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => openDetail(log)}
              >
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(log.status)}`}
                  >
                    {statusIcon(log.status)}
                    {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">{log.recipient}</td>
                <td className="px-4 py-3 text-gray-600">
                  {log.email_type.replace(/_/g, ' ')}
                </td>
                <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{log.subject}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {formatDate(log.sent_at ?? log.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleResend(log)
                    }}
                    disabled={resendingId === log.id || (log.status === 'bounced' && log.bounce_type === 'hard')}
                    className="inline-flex items-center gap-1 rounded-md bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                    title={log.status === 'bounced' && log.bounce_type === 'hard' ? 'Hard bounce — cannot resend' : 'Resend this email'}
                  >
                    {resendingId === log.id ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Resend
                  </button>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  No email logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
        <div className="text-sm text-gray-600">
          Showing <strong>{logs.length}</strong> of <strong>{total}</strong> results
        </div>
        <div className="flex items-center gap-2">
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value))
              setPage(1)
            }}
            className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700"
          >
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-gray-300 bg-white p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-700">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-gray-300 bg-white p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Detail modal (simple) */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Email Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">ID</span>
                <span className="font-mono text-gray-700">{selectedLog.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Recipient</span>
                <span className="text-gray-700">{selectedLog.recipient}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className="text-gray-700">{selectedLog.email_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(selectedLog.status)}`}>
                  {statusIcon(selectedLog.status)}
                  {selectedLog.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Subject</span>
                <span className="text-gray-700 text-right max-w-xs">{selectedLog.subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Provider Message ID</span>
                <span className="font-mono text-gray-700">{selectedLog.provider_message_id ?? '—'}</span>
              </div>
              {selectedLog.error_message && (
                <div className="rounded-lg bg-red-50 p-3 text-red-700">
                  <span className="font-semibold">Error:</span> {selectedLog.error_message}
                </div>
              )}
              {eventsLoading && (
                <div className="py-4 text-center text-gray-500">
                  <LoaderCircle className="mx-auto h-5 w-5 animate-spin" />
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => handleResend(selectedLog)}
                disabled={resendingId === selectedLog.id || (selectedLog.status === 'bounced' && selectedLog.bounce_type === 'hard')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:bg-gray-300"
              >
                <RefreshCw className="h-4 w-4" />
                Resend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
