'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Search } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'

type AuditLog = {
  id: string
  admin_id: string
  action: string
  target_type: string
  target_id: string
  old_value: unknown
  new_value: unknown
  performed_at: string
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filterType, setFilterType] = useState('')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<AdminToastState>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterType) params.set('target_type', filterType)
      if (search) params.set('action', search)
      params.set('page', String(page))
      params.set('limit', '50')

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLogs(data.logs ?? [])
      setTotal(data.total ?? 0)
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to load audit logs' })
    } finally {
      setLoading(false)
    }
  }, [filterType, search, page])

  useEffect(() => {
    window.setTimeout(() => void loadLogs(), 0)
  }, [loadLogs])

  const totalPages = Math.max(1, Math.ceil(total / 50))
  const targetTypes = ['order', 'user', 'material', 'coupon', 'setting', 'payment', 'refund', 'printer', 'quote', 'manufacturing', 'admin_user']

  return (
    <div className="space-y-6">
      <AdminToast toast={toast} />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/20 bg-[#6d28d9]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#6d28d9]">
            <FileText className="h-3 w-3" /> Audit
          </div>
          <h1 className="font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">Audit Logs</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#6F7192]">Track all admin actions across orders, payments, settings, and more.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1) }}
            className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none">
            <option value="">All types</option>
            {targetTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F7192]" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Action search..." className="w-48 rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-9 py-2.5 text-sm text-[#0F1B3D] outline-none" />
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="py-12 text-center text-sm text-[#6F7192]">Loading audit logs...</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-[#6d28d9]/10 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#6d28d9]/5 bg-gray-50/50">
                  <th className="px-4 py-3 text-left font-semibold text-[#6F7192]">Time</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#6F7192]">Admin</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#6F7192]">Action</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#6F7192]">Target</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#6F7192]">Target ID</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <>
                    <tr key={log.id} className="border-b border-[#6d28d9]/5 transition hover:bg-gray-50/50 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                      <td className="px-4 py-3 text-[#6F7192]">{new Date(log.performed_at).toLocaleString()}</td>
                      <td className="px-4 py-3 font-semibold text-[#0F1B3D]">{log.admin_id.slice(0, 8)}</td>
                      <td className="px-4 py-3"><span className="rounded-full border border-[#6d28d9]/15 bg-[#6d28d9]/5 px-2.5 py-0.5 text-xs font-semibold text-[#6d28d9]">{log.action}</span></td>
                      <td className="px-4 py-3 text-[#6F7192]">{log.target_type}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[#6F7192]">{log.target_id.slice(0, 12)}...</td>
                    </tr>
                    {expandedId === log.id && (
                      <tr key={`${log.id}-detail`}>
                        <td colSpan={5} className="bg-gray-50/70 px-6 py-4">
                          <div className="grid gap-3 md:grid-cols-2">
                            {log.old_value != null && (
                              <div>
                                <div className="mb-1 text-xs font-semibold text-[#6F7192]">Previous</div>
                                <pre className="max-h-32 overflow-auto rounded-lg bg-white p-3 text-xs text-[#0F1B3D] border border-[#6d28d9]/10">{JSON.stringify(log.old_value, null, 2)}</pre>
                              </div>
                            )}
                            {log.new_value != null && (
                              <div>
                                <div className="mb-1 text-xs font-semibold text-[#6F7192]">New</div>
                                <pre className="max-h-32 overflow-auto rounded-lg bg-white p-3 text-xs text-[#0F1B3D] border border-[#6d28d9]/10">{JSON.stringify(log.new_value, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-[#6F7192]">No audit logs found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                className="rounded-lg border border-[#6d28d9]/10 px-3 py-1.5 text-sm font-semibold text-[#0F1B3D] disabled:opacity-40">Previous</button>
              <span className="text-sm text-[#6F7192]">Page {page} of {totalPages} ({total} total)</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                className="rounded-lg border border-[#6d28d9]/10 px-3 py-1.5 text-sm font-semibold text-[#0F1B3D] disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
