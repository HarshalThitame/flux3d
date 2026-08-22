'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Database, RefreshCcw, Trash2 } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'

type TableStat = {
  table: string
  oldest: string | null
  newest: string | null
  count: number
}

type PurgeResult = {
  table_name: string
  deleted_count: number
}

export default function RetentionSettingsPage() {
  const [tables, setTables] = useState<TableStat[]>([])
  const [loading, setLoading] = useState(true)
  const [purging, setPurging] = useState(false)
  const [purgeResult, setPurgeResult] = useState<PurgeResult[] | null>(null)
  const [days, setDays] = useState(90)
  const [toast, setToast] = useState<AdminToastState>(null)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/retention')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTables(data.tables ?? [])
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to load retention stats' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { window.setTimeout(() => void load(), 0) }, [load])

  async function handlePurge() {
    setPurging(true)
    setPurgeResult(null)
    try {
      const res = await fetch('/api/admin/retention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPurgeResult(data.purged ?? [])
      setToast({ type: 'success', message: `Purged records older than ${days} days` })
      await load()
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Purge failed' })
    } finally {
      setPurging(false)
    }
  }

  return (
    <div className="space-y-6">
      <AdminToast toast={toast} />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/20 bg-[#6d28d9]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#6d28d9]">
          <Database className="h-3 w-3" /> Data Management
        </div>
        <h1 className="font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">Data Retention</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#6F7192]">Manage data retention periods and purge old records for privacy compliance.</p>
      </motion.div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>Privacy compliance:</strong> Old tracking and error data is automatically retained. Use this page to manually purge records older than your retention policy.
      </div>

      <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5">
        <div>
          <label htmlFor="retention-days" className="text-xs font-semibold text-[#6F7192]">Retention period (days)</label>
          <div className="mt-1 flex items-center gap-3">
            <input
              id="retention-days"
              type="number" min={30} max={365} value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-24 rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/40"
            />
            <button
              type="button" disabled={purging} onClick={() => void handlePurge()}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
              {purging ? 'Purging...' : 'Purge old records'}
            </button>
          </div>
        </div>
        <button type="button" onClick={() => void load()} className="ml-auto rounded-xl border border-[#6d28d9]/10 bg-white px-3 py-2 text-sm text-[#0F1B3D]">
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      {purgeResult && purgeResult.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <strong>Purge complete.</strong> Deleted records:
          <ul className="mt-2 list-inside list-disc">
            {purgeResult.map((r) => (
              <li key={r.table_name}>{r.table_name}: {r.deleted_count} rows</li>
            ))}
          </ul>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-[#6F7192]">Loading retention stats...</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 text-left font-semibold text-[#6F7192]">Table</th>
                <th className="px-4 py-3 text-right font-semibold text-[#6F7192]">Row count</th>
                <th className="px-4 py-3 text-left font-semibold text-[#6F7192]">Oldest record</th>
                <th className="px-4 py-3 text-left font-semibold text-[#6F7192]">Newest record</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((t) => (
                <tr key={t.table} className="border-b border-gray-100">
                  <td className="px-4 py-3 font-semibold text-[#0F1B3D]">{t.table}</td>
                  <td className="px-4 py-3 text-right text-[#0F1B3D]">{t.count.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[#6F7192]">{t.oldest ? new Date(t.oldest).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-[#6F7192]">{t.newest ? new Date(t.newest).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
