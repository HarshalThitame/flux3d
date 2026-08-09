'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { RefreshCcw, Undo2, Check, X } from 'lucide-react'
import DataTable from '@/components/admin/DataTable'
import SkeletonBlock from '@/components/admin/SkeletonBlock'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import type { PaymentData, PaymentRefundData } from '@/lib/admin/types'

type RefundsResponse = {
  refunds: PaymentRefundData[]
  payments: PaymentData[]
}

function formatMoney(value: number) {
  return `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    pending_approval: 'border-amber-300 bg-amber-50 text-amber-700',
    pending: 'border-blue-300 bg-blue-50 text-blue-700',
    processed: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    failed: 'border-rose-300 bg-rose-50 text-rose-700',
    created: 'border-gray-300 bg-gray-50 text-gray-700',
    cancelled: 'border-slate-300 bg-slate-50 text-slate-700',
  }
  return `rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${colors[status] || 'border-gray-200 bg-gray-50 text-[#6F7192]'}`
}

export default function AdminRefundsPage() {
  const [data, setData] = useState<RefundsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<AdminToastState>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState('')

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch('/api/admin/refunds', { signal: controller.signal })
        if (!response.ok) throw new Error('Failed to load refunds.')
        const json = await response.json() as RefundsResponse
        setData(json)
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
      } finally {
        setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [])

  async function handleApprove(refundId: string) {
    setActioningId(refundId)
    try {
      const res = await fetch(`/api/admin/refunds/${refundId}/approve`, { method: 'POST' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Failed to approve')
      setData((prev) => prev ? {
        ...prev,
        refunds: prev.refunds.map((r) => r.id === refundId ? { ...r, status: 'pending' as const } : r),
      } : null)
      setToast({ type: 'success', message: 'Refund approved and sent to gateway.' })
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Approval failed' })
    } finally {
      setActioningId(null)
    }
  }

  async function handleReject(refundId: string) {
    const reason = window.prompt('Rejection reason:')
    if (reason === null) return
    setActioningId(refundId)
    try {
      const res = await fetch(`/api/admin/refunds/${refundId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'Rejected by admin' }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Failed to reject')
      setData((prev) => prev ? {
        ...prev,
        refunds: prev.refunds.map((r) => r.id === refundId ? { ...r, status: 'cancelled' as const } : r),
      } : null)
      setToast({ type: 'success', message: 'Refund rejected and cancelled.' })
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Rejection failed' })
    } finally {
      setActioningId(null)
    }
  }

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-[520px] w-full" />
      </div>
    )
  }

  const filteredRefunds = selectedStatus
    ? data.refunds.filter((r) => r.status === selectedStatus)
    : data.refunds
  const pendingApproval = data.refunds.filter((r) => r.status === 'pending_approval')

  return (
    <div className="space-y-6">
      <AdminToast toast={toast} />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-rose-600">
            <Undo2 className="h-3 w-3" />
            Refunds
          </div>
          <h1 className="mt-2 font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">Refund Ledger</h1>
          <p className="mt-2 text-sm text-[#6F7192]">Review refunded amounts, provider references, and live status from Razorpay.</p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-xl border border-[#6d28d9]/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#0F1B3D]"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs text-[#6F7192]">Total Refunds</p>
          <p className="mt-1 text-xl font-bold text-[#0F1B3D]">{data.refunds.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs text-[#6F7192]">Needs Approval</p>
          <p className="mt-1 text-xl font-bold text-amber-600">{pendingApproval.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs text-[#6F7192]">Processed</p>
          <p className="mt-1 text-xl font-bold text-emerald-600">{data.refunds.filter((r) => r.status === 'processed').length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs text-[#6F7192]">Pending</p>
          <p className="mt-1 text-xl font-bold text-amber-500">{data.refunds.filter((r) => r.status === 'pending').length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs text-[#6F7192]">Total Value</p>
          <p className="mt-1 text-xl font-bold text-[#0F1B3D]">{formatMoney(data.refunds.reduce((sum, r) => sum + r.amountPaise, 0))}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-[#6F7192]">Filter by status:</label>
        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}
          className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2 text-sm text-[#0F1B3D] outline-none">
          <option value="">All refunds</option>
          <option value="pending_approval">Needs Approval</option>
          <option value="pending">Pending (at gateway)</option>
          <option value="processed">Processed</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
          <option value="created">Created</option>
        </select>
      </div>

      {pendingApproval.length > 0 && selectedStatus === '' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong className="font-bold">{pendingApproval.length}</strong> refund{pendingApproval.length === 1 ? '' : 's'} need approval.
        </div>
      )}

      <DataTable
        title="Refund rows"
        description="Refund history across Razorpay payment attempts."
        data={filteredRefunds}
        searchPlaceholder="Search refund reason, refund ID, payment ID"
        searchKeys={['id', 'providerRefundId', 'paymentAttemptId', 'reason', 'status']}
        exportFilename="refunds.csv"
        columns={[
          { key: 'id', label: 'Refund ID', sortable: true, exportValue: (row) => row.id, render: (row) => <span className="font-mono text-xs text-[#0F1B3D]">{row.id.slice(0, 8)}...</span> },
          { key: 'paymentAttemptId', label: 'Payment', sortable: true, exportValue: (row) => row.paymentAttemptId, render: (row) => <Link href={`/admin/payments/${row.paymentAttemptId}`} className="text-[#6d28d9]">{row.paymentAttemptId.slice(0, 8)}...</Link> },
          { key: 'amountPaise', label: 'Amount', sortable: true, exportValue: (row) => (row.amountPaise / 100).toFixed(2), render: (row) => <span className="font-semibold text-[#0F1B3D]">{formatMoney(row.amountPaise)}</span> },
          { key: 'status', label: 'Status', sortable: true, exportValue: (row) => row.status, render: (row) => <span className={statusBadge(row.status)}>{row.status}</span> },
          { key: 'reason', label: 'Reason', sortable: true, exportValue: (row) => row.reason, render: (row) => <span className="text-[#6F7192]">{row.reason}</span> },
          { key: 'providerRefundId', label: 'Provider Ref', sortable: true, exportValue: (row) => row.providerRefundId ?? '', render: (row) => <span className="text-[#6F7192] break-all">{row.providerRefundId?.slice(0, 20) ?? '—'}</span> },
          {
            key: 'actions', label: 'Actions',
            render: (row) => row.status === 'pending_approval' ? (
              <div className="flex gap-1.5">
                <button type="button" disabled={actioningId === row.id} onClick={() => handleApprove(row.id)}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 p-1.5 text-emerald-600 hover:bg-emerald-100 disabled:opacity-40" title="Approve">
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button type="button" disabled={actioningId === row.id} onClick={() => handleReject(row.id)}
                  className="rounded-lg border border-rose-300 bg-rose-50 p-1.5 text-rose-500 hover:bg-rose-100 disabled:opacity-40" title="Reject">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null,
          },
        ]}
      />
    </div>
  )
}
