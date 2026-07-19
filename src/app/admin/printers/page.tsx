'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Printer, Plus, RefreshCcw } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'

type PrinterRecord = {
  id: string
  name: string
  model: string | null
  status: string
  build_volume: string | null
  materials: string[] | null
  last_active: string | null
  created_at: string
}

export default function AdminPrintersPage() {
  const [printers, setPrinters] = useState<PrinterRecord[]>([])
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
      const res = await fetch('/api/admin/printers')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPrinters(Array.isArray(data) ? data : data.printers ?? [])
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to load printers' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { window.setTimeout(() => void load(), 0) }, [load])

  const statusColor = (s: string) => {
    if (s === 'idle') return 'border-emerald-300 bg-emerald-50 text-emerald-700'
    if (s === 'printing') return 'border-blue-300 bg-blue-50 text-blue-700'
    if (s === 'maintenance') return 'border-amber-300 bg-amber-50 text-amber-700'
    return 'border-gray-300 bg-gray-50 text-gray-700'
  }

  return (
    <div className="space-y-6">
      <AdminToast toast={toast} />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/20 bg-[#6d28d9]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#6d28d9]">
            <Printer className="h-3 w-3" /> Printers
          </div>
          <h1 className="font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">Printer Management</h1>
          <p className="mt-2 text-sm text-[#6F7192]">Monitor printer status and manage print job scheduling.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-[#6d28d9]/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#0F1B3D]">
          <RefreshCcw className="h-4 w-4" /> Refresh
        </button>
      </motion.div>

      {loading ? (
        <div className="py-12 text-center text-sm text-[#6F7192]">Loading printers...</div>
      ) : printers.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <Printer className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-bold text-[#0F1B3D]">No printers configured</h3>
          <p className="mt-2 text-sm text-[#6F7192]">Add printers via the database or API to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {printers.map((printer) => (
            <div key={printer.id} className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-[#0F1B3D]">{printer.name}</h3>
                  <p className="text-xs text-[#6F7192]">{printer.model || 'Unknown model'}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusColor(printer.status)}`}>
                  {printer.status}
                </span>
              </div>
              {printer.build_volume && (
                <div className="mt-3 text-xs text-[#6F7192]">Build volume: {printer.build_volume}</div>
              )}
              {printer.materials && printer.materials.length > 0 && (
                <div className="mt-1 text-xs text-[#6F7192]">Materials: {printer.materials.join(', ')}</div>
              )}
              <div className="mt-3 text-xs text-[#6F7192]">
                Last active: {printer.last_active ? new Date(printer.last_active).toLocaleString() : 'Never'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
