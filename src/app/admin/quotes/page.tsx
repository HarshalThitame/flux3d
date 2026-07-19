'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, FileText, X, Zap } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import DataTable from '@/components/admin/DataTable'
import EmptyState from '@/components/admin/EmptyState'
import SkeletonBlock from '@/components/admin/SkeletonBlock'
import StatusBadge from '@/components/admin/StatusBadge'
import type { AdminQuote } from '@/lib/admin/types'

export default function AdminQuotesPage() {
  const [quotes, setQuotes] = useState<AdminQuote[] | null>(null)
  const [toast, setToast] = useState<AdminToastState>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch('/api/admin/quotes', { signal: controller.signal })
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? 'Failed to load quotes.')
        }

        const json = (await response.json()) as { quotes: AdminQuote[] }
        setQuotes(json.quotes)
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') return
        setError(loadError instanceof Error ? loadError.message : 'Failed to load quotes.')
      }
    }

    void load()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  if (error) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-600">{error}</div>
  }

  if (quotes === null) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <SkeletonBlock className="h-8 w-48" />
          <SkeletonBlock className="h-5 w-80 max-w-full" />
        </div>
        <SkeletonBlock className="h-[420px] w-full" />
      </div>
    )
  }

  if (quotes.length === 0) {
    return (
      <EmptyState
        title="No quotes yet"
        description="Quote requests will appear here when customers use the instant quote flow."
        ctaLabel="Open dashboard"
        ctaHref="/admin"
      />
    )
  }

  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function updateQuoteStatus(quote: AdminQuote, newStatus: string, _message: string) {
    const quoteId = quote.quote_id ?? String(quote.id)
    setActionLoading(quoteId)

    try {
      if (newStatus === 'approved') {
        const res = await fetch(`/api/admin/quotes/${quoteId}/approve`, { method: 'POST' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to approve')
        setQuotes((current) => (current ?? []).map((item) => (item.id === quote.id ? { ...item, status: 'approved' as AdminQuote['status'] } : item)))
        setToast({ type: 'success', message: `Quote ${quoteId} approved.` })
      } else if (newStatus === 'rejected') {
        const reason = window.prompt('Rejection reason (optional):')
        const res = await fetch(`/api/admin/quotes/${quoteId}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to reject')
        setQuotes((current) => (current ?? []).map((item) => (item.id === quote.id ? { ...item, status: 'rejected' as AdminQuote['status'] } : item)))
        setToast({ type: 'success', message: `Quote ${quoteId} rejected.` })
      } else if (newStatus === 'converted') {
        setToast({ type: 'info', message: 'Convert to order is not yet implemented.' })
      }
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Action failed.' })
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-violet-600">
            <FileText className="h-3 w-3" />
            Quote Management
          </div>
          <h1 className="mt-2 font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">Quotes</h1>
          <p className="mt-2 max-w-xl text-sm text-[#6F7192]">
            Keep inquiry flow tight with quick review actions and approval decisions.
          </p>
        </motion.div>

        <DataTable
          title="Quote Review Board"
          description={`${quotes.length} quotes total`}
          data={quotes}
          searchPlaceholder="Search quote, customer, material"
          searchKeys={['quote_id', 'name', 'email', 'status']}
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: [
                { label: 'Pending', value: 'pending' },
                { label: 'Approved', value: 'approved' },
                { label: 'Rejected', value: 'rejected' },
                { label: 'Converted', value: 'converted' },
              ],
              getValue: (row) => row.status,
            },
          ]}
          columns={[
            { key: 'id', label: 'Quote ID', sortable: true, sortValue: (row) => row.quote_id ?? String(row.id), render: (row) => <span className="font-medium text-[#0F1B3D]">{row.quote_id ?? `Q-${row.id}`}</span> },
            { key: 'customer', label: 'Customer', sortable: true, sortValue: (row) => row.name, render: (row) => <span className="text-[#6F7192]">{row.name}</span> },
            { key: 'material', label: 'Material', sortable: true, sortValue: (row) => row.config?.materialId ?? '', render: (row) => <span className="text-[#6F7192]">{row.config?.materialId ?? 'Unknown'}</span> },
            { key: 'estimate', label: 'Estimate', sortable: true, sortValue: (row) => row.estimate?.total ?? 0, render: (row) => <span className="font-medium text-[#0F1B3D]">₹{Number(row.estimate?.total ?? 0).toLocaleString('en-IN')}</span> },
            { key: 'status', label: 'Status', sortable: true, sortValue: (row) => row.status, render: (row) => <StatusBadge status={row.status} /> },
            {
              key: 'actions',
              label: 'Actions',
              render: (row) => (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      updateQuoteStatus(row, 'approved', `${row.quote_id ?? row.id} approved.`)
                    }}
                    className="rounded-lg border border-emerald-400/20 bg-emerald-50 p-2 text-emerald-600 transition hover:bg-emerald-400/15"
                    title="Approve"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      updateQuoteStatus(row, 'rejected', `${row.quote_id ?? row.id} rejected.`)
                    }}
                    className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-400 transition hover:bg-rose-400/15"
                    title="Reject"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      updateQuoteStatus(row, 'converted', `${row.quote_id ?? row.id} converted to order.`)
                    }}
                    className="rounded-lg border border-cyan-200 bg-cyan-50 p-2 text-cyan-400 transition hover:bg-cyan-400/15"
                    title="Convert to order"
                  >
                    <Zap className="h-3.5 w-3.5" />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>
      <AdminToast toast={toast} />
    </>
  )
}
