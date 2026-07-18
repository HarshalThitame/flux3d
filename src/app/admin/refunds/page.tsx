'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { RefreshCcw, Undo2 } from 'lucide-react'
import DataTable from '@/components/admin/DataTable'
import SkeletonBlock from '@/components/admin/SkeletonBlock'
import type { PaymentData, PaymentRefundData } from '@/lib/admin/types'

type RefundsResponse = {
  refunds: PaymentRefundData[]
  payments: PaymentData[]
}

function formatMoney(value: number) {
  return `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`
}

export default function AdminRefundsPage() {
  const [data, setData] = useState<RefundsResponse | null>(null)
  const [loading, setLoading] = useState(true)

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

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-[520px] w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs text-[#6F7192]">Refunds</p>
          <p className="mt-1 text-xl font-bold text-[#0F1B3D]">{data.refunds.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs text-[#6F7192]">Processed</p>
          <p className="mt-1 text-xl font-bold text-emerald-600">{data.refunds.filter((refund) => refund.status === 'processed').length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs text-[#6F7192]">Pending</p>
          <p className="mt-1 text-xl font-bold text-amber-500">{data.refunds.filter((refund) => refund.status === 'pending').length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs text-[#6F7192]">Total Value</p>
          <p className="mt-1 text-xl font-bold text-[#0F1B3D]">{formatMoney(data.refunds.reduce((sum, refund) => sum + refund.amountPaise, 0))}</p>
        </div>
      </div>

      <DataTable
        title="Refund rows"
        description="Refund history across Razorpay payment attempts."
        data={data.refunds}
        searchPlaceholder="Search refund reason, refund ID, payment ID"
        searchKeys={['id', 'providerRefundId', 'paymentAttemptId', 'reason', 'status']}
        columns={[
          { key: 'id', label: 'Refund ID', sortable: true, render: (row) => <span className="font-medium text-[#0F1B3D]">{row.id}</span> },
          { key: 'paymentAttemptId', label: 'Payment', sortable: true, render: (row) => <Link href={`/admin/payments/${row.paymentAttemptId}`} className="text-[#6d28d9]">{row.paymentAttemptId}</Link> },
          { key: 'amountPaise', label: 'Amount', sortable: true, render: (row) => <span className="font-medium text-[#0F1B3D]">{formatMoney(row.amountPaise)}</span> },
          { key: 'status', label: 'Status', sortable: true, render: (row) => <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-[#0F1B3D]">{row.status}</span> },
          { key: 'reason', label: 'Reason', sortable: true, render: (row) => <span className="text-[#6F7192]">{row.reason}</span> },
          { key: 'providerRefundId', label: 'Provider Refund', sortable: true, render: (row) => <span className="text-[#6F7192] break-all">{row.providerRefundId ?? '—'}</span> },
        ]}
      />
    </div>
  )
}
