'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCcw, ScanSearch } from 'lucide-react'
import DataTable from '@/components/admin/DataTable'
import SkeletonBlock from '@/components/admin/SkeletonBlock'
import type { ReconciliationRunData } from '@/lib/admin/types'

type ReconciliationResponse = {
  reconciliationRuns: ReconciliationRunData[]
  webhookHealth: {
    total: number
    processed: number
    failed: number
    ignored: number
    duplicateCount: number
    lastReceivedAt: string | null
    lastProcessedAt: string | null
  }
}

export default function AdminReconciliationPage() {
  const [data, setData] = useState<ReconciliationResponse | null>(null)
  const [running, setRunning] = useState(false)
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null)

  async function load() {
    const response = await fetch('/api/admin/reconciliation')
    if (!response.ok) throw new Error('Failed to load reconciliation data.')
    const json = await response.json() as ReconciliationResponse
    setData(json)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch(() => {})
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  async function runReconciliation() {
    setRunning(true)
    try {
      const response = await fetch('/api/admin/reconciliation', { method: 'POST' })
      if (!response.ok) throw new Error('Failed to run reconciliation.')
      const json = await response.json() as { summary?: Record<string, unknown> }
      setSummary(json.summary ?? null)
      await load()
    } finally {
      setRunning(false)
    }
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-[420px] w-full" />
      </div>
    )
  }

  const latest = data.reconciliationRuns[0]

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-600">
            <ScanSearch className="h-3 w-3" />
            Reconciliation
          </div>
          <h1 className="mt-2 font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">Razorpay Reconciliation</h1>
          <p className="mt-2 text-sm text-[#6F7192]">Run a live check against Razorpay payment records and compare them with the local ledger.</p>
        </div>
        <button
          type="button"
          onClick={runReconciliation}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0F1B3D] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          <RefreshCcw className="h-4 w-4" />
          {running ? 'Running...' : 'Run reconciliation'}
        </button>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs text-[#6F7192]">Webhook events</p>
          <p className="mt-1 text-xl font-bold text-[#0F1B3D]">{data.webhookHealth.total}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs text-[#6F7192]">Processed</p>
          <p className="mt-1 text-xl font-bold text-emerald-600">{data.webhookHealth.processed}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs text-[#6F7192]">Duplicates</p>
          <p className="mt-1 text-xl font-bold text-amber-500">{data.webhookHealth.duplicateCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs text-[#6F7192]">Latest run</p>
          <p className="mt-1 text-xl font-bold text-[#0F1B3D]">{latest ? latest.status : 'None'}</p>
        </div>
      </div>

      {summary && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Reconciliation complete. Matched: {String(summary.matchedCount ?? 0)} · Mismatches: {String(summary.mismatchCount ?? 0)} · Missing: {String(summary.missingLocallyCount ?? 0)}
        </div>
      )}

      <DataTable
        title="Reconciliation Runs"
        description="Each row is a stored run result."
        data={data.reconciliationRuns}
        searchPlaceholder="Search run id, status, mismatch"
        searchKeys={['id', 'status']}
        exportFilename="reconciliation-runs.csv"
        columns={[
          { key: 'id', label: 'Run ID', sortable: true, exportValue: (row) => row.id, render: (row) => <span className="font-medium text-[#0F1B3D]">{row.id}</span> },
          { key: 'status', label: 'Status', sortable: true, exportValue: (row) => row.status, render: (row) => <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-[#0F1B3D]">{row.status}</span> },
          { key: 'matchedCount', label: 'Matched', sortable: true, exportValue: (row) => row.matchedCount, render: (row) => <span className="text-[#6F7192]">{row.matchedCount}</span> },
          { key: 'mismatchCount', label: 'Mismatch', sortable: true, exportValue: (row) => row.mismatchCount, render: (row) => <span className="text-[#6F7192]">{row.mismatchCount}</span> },
          { key: 'missingCount', label: 'Missing', sortable: true, exportValue: (row) => row.missingCount, render: (row) => <span className="text-[#6F7192]">{row.missingCount}</span> },
          { key: 'startedAt', label: 'Started', sortable: true, exportValue: (row) => new Date(row.startedAt).toISOString(), render: (row) => <span className="text-[#6F7192]">{new Date(row.startedAt).toLocaleString('en-IN')}</span> },
        ]}
      />
    </div>
  )
}
