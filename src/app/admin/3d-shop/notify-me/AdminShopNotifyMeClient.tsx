'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Bell, ChevronDown } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import { formatVariantLabel } from '@/lib/shop/selection'

type NotifyEntry = {
  id: string
  product_id: string
  sku_id: string | null
  email: string
  is_notified: boolean
  created_at: string | null
  product?: { id: string; name: string; slug: string; thumbnail_url: string | null } | null
  sku?: {
    id: string
    sku_code: string
    variant_combination: Record<string, string | boolean>
    stock_quantity: number
    is_available: boolean | null
  } | null
}

type NotifyGroup = {
  key: string
  productName: string
  thumbnail: string | null
  skuLabel: string
  requestsCount: number
  lastRequest: string | null
  entries: NotifyEntry[]
}

function formatDate(value: string | null) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
}

export default function AdminShopNotifyMeClient() {
  const [entries, setEntries] = useState<NotifyEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showNotified, setShowNotified] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<AdminToastState>(null)

  const loadEntries = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (!showNotified) params.set('is_notified', 'false')
      const response = await fetch(`/api/3d-shop/admin/notify-me?${params.toString()}`)
      const data = await response.json().catch(() => ({})) as { entries?: NotifyEntry[]; error?: string }
      if (!response.ok) throw new Error(data.error || 'Failed to load notify-me requests.')
      setEntries(data.entries ?? [])
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load notify-me requests.' })
    } finally {
      setLoading(false)
    }
  }, [showNotified])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadEntries()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadEntries])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const groups = useMemo<NotifyGroup[]>(() => {
    const grouped = new Map<string, NotifyGroup>()

    for (const entry of entries) {
      const key = `${entry.product_id}:${entry.sku_id ?? 'product'}`
      const existing = grouped.get(key)
      const nextEntryDate = entry.created_at ? new Date(entry.created_at).getTime() : 0
      const currentLastDate = existing?.lastRequest ? new Date(existing.lastRequest).getTime() : 0
      const skuLabel = entry.sku
        ? `${entry.sku.sku_code} · ${formatVariantLabel(entry.sku.variant_combination)}`
        : 'Product'

      if (!existing) {
        grouped.set(key, {
          key,
          productName: entry.product?.name ?? 'Deleted product',
          thumbnail: entry.product?.thumbnail_url ?? null,
          skuLabel,
          requestsCount: 1,
          lastRequest: entry.created_at,
          entries: [entry],
        })
      } else {
        existing.requestsCount += 1
        existing.entries.push(entry)
        if (nextEntryDate > currentLastDate) existing.lastRequest = entry.created_at
      }
    }

    return Array.from(grouped.values()).sort((left, right) => right.requestsCount - left.requestsCount)
  }, [entries])

  async function markAllNotified(group: NotifyGroup) {
    const pendingEntries = group.entries.filter((entry) => !entry.is_notified)
    if (pendingEntries.length === 0) return

    try {
      await Promise.all(pendingEntries.map(async (entry) => {
        const response = await fetch(`/api/3d-shop/admin/notify-me/${entry.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_notified: true }),
        })
        const data = await response.json().catch(() => ({})) as { error?: string }
        if (!response.ok) throw new Error(data.error || 'Failed to mark notified.')
      }))
      setToast({ type: 'success', message: `Marked ${pendingEntries.length} request${pendingEntries.length === 1 ? '' : 's'} notified.` })
      await loadEntries()
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to mark notified.' })
    }
  }

  return (
    <div className="space-y-6">
      <AdminToast toast={toast} />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/20 bg-[#6d28d9]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#6d28d9]">
            <Bell className="h-3 w-3" />
            3D Shop
          </div>
          <h1 className="font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">Stock Demand</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#6F7192]">See which out-of-stock Shop SKUs customers are waiting for.</p>
        </div>
        <label className="flex min-h-[44px] items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-[#6F7192]">
          <input
            type="checkbox"
            checked={showNotified}
            onChange={(event) => setShowNotified(event.target.checked)}
            className="h-4 w-4 accent-[#6d28d9]"
          />
          Include notified
        </label>
      </motion.div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Product Name', 'SKU / Variant', 'Requests Count', 'Last Request', 'Actions'].map((label) => (
                  <th key={label} className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-[#6F7192]">Loading requests...</td></tr>
              ) : groups.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-[#6F7192]">No stock requests found.</td></tr>
              ) : (
                groups.map((group) => (
                  <tr key={group.key} className="border-b border-gray-100 align-top last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex min-w-[220px] items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                          {group.thumbnail ? <Image src={group.thumbnail} alt={group.productName} fill sizes="40px" className="object-cover" /> : null}
                        </div>
                        <div className="text-sm font-semibold text-[#0F1B3D]">{group.productName}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#6F7192]">{group.skuLabel}</td>
                    <td className="px-4 py-3 text-sm font-bold text-[#0F1B3D]">{group.requestsCount}</td>
                    <td className="px-4 py-3 text-sm text-[#6F7192]">{formatDate(group.lastRequest)}</td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-[230px] flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setExpanded((current) => ({ ...current, [group.key]: !current[group.key] }))}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-[#6F7192]"
                        >
                          <ChevronDown className={`h-3.5 w-3.5 transition ${expanded[group.key] ? 'rotate-180' : ''}`} />
                          View Emails
                        </button>
                        <button
                          type="button"
                          onClick={() => void markAllNotified(group)}
                          className="rounded-lg bg-[#6d28d9] px-3 py-2 text-xs font-semibold text-white"
                        >
                          Mark All Notified
                        </button>
                      </div>
                      {expanded[group.key] && (
                        <div className="mt-3 max-w-xl rounded-xl border border-gray-200 bg-gray-50 p-3">
                          <div className="space-y-2">
                            {group.entries.map((entry) => (
                              <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm">
                                <span className="font-medium text-[#0F1B3D]">{entry.email}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${entry.is_notified ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {entry.is_notified ? 'Notified' : 'Waiting'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
