'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Factory, RefreshCcw } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'

type QcCheck = {
  id: string
  print_job_id: string | null
  order_id: string | null
  status: string
  notes: string | null
  created_at: string
}

export default function AdminManufacturingPage() {
  const [qcChecks, setQcChecks] = useState<QcCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<AdminToastState>(null)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/analytics/alerts')
      const data = await res.json()
      setQcChecks(Array.isArray(data) ? data : [])
    } catch {
      // table may be empty
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { window.setTimeout(() => void load(), 0) }, [load])

  return (
    <div className="space-y-6">
      <AdminToast toast={toast} />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/20 bg-[#6d28d9]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#6d28d9]">
            <Factory className="h-3 w-3" /> Manufacturing
          </div>
          <h1 className="font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">Manufacturing & QC</h1>
          <p className="mt-2 text-sm text-[#6F7192]">Track quality control checks and manufacturing operations.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-[#6d28d9]/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#0F1B3D]">
          <RefreshCcw className="h-4 w-4" /> Refresh
        </button>
      </motion.div>

      {loading ? (
        <div className="py-12 text-center text-sm text-[#6F7192]">Loading...</div>
      ) : qcChecks.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <Factory className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-bold text-[#0F1B3D]">No manufacturing data yet</h3>
          <p className="mt-2 text-sm text-[#6F7192]">QC checks and manufacturing jobs will appear here once operations begin.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 text-left font-semibold text-[#6F7192]">QC ID</th>
                <th className="px-4 py-3 text-left font-semibold text-[#6F7192]">Job ID</th>
                <th className="px-4 py-3 text-left font-semibold text-[#6F7192]">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-[#6F7192]">Notes</th>
                <th className="px-4 py-3 text-left font-semibold text-[#6F7192]">Created</th>
              </tr>
            </thead>
            <tbody>
              {qcChecks.map((qc) => (
                <tr key={qc.id} className="border-b border-gray-100">
                  <td className="px-4 py-3 font-mono text-xs text-[#0F1B3D]">{qc.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-[#6F7192]">{qc.print_job_id?.slice(0, 8) ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                      qc.status === 'passed' ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : qc.status === 'failed' ? 'border-rose-300 bg-rose-50 text-rose-700'
                          : 'border-amber-300 bg-amber-50 text-amber-700'
                    }`}>{qc.status}</span>
                  </td>
                  <td className="px-4 py-3 text-[#6F7192]">{qc.notes || '—'}</td>
                  <td className="px-4 py-3 text-[#6F7192]">{new Date(qc.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
