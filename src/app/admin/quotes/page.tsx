'use client'

import { useEffect, useState } from 'react'
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
    return <div className="rounded-[28px] border border-rose-400/15 bg-rose-400/10 p-6 text-rose-100">{error}</div>
  }

  if (quotes === null) {
    return <SkeletonBlock className="h-[420px] w-full" />
  }

  if (quotes.length === 0) {
    return (
      <EmptyState
        title="No quotes yet"
        description="Quote requests will appear here when customers use the instant quote flow."
        ctaLabel="Open quote dashboard"
        ctaHref="/admin"
      />
    )
  }

  const updateQuoteStatus = (quote: AdminQuote, status: AdminQuote['status'], message: string) => {
    setQuotes((current) => (current ?? []).map((item) => (item.id === quote.id ? { ...item, status } : item)))
    setToast({ type: 'success', message })
  }

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-[32px] border border-white/10 bg-[rgba(10,16,31,0.94)] p-6">
          <h1 className="font-[var(--font-syne)] text-4xl font-extrabold text-white">Quotes</h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-[#9ca7c6]">
            Keep inquiry flow tight with quick review actions, approval decisions, and one-click conversion to orders.
          </p>
        </section>

        <DataTable
          title="Quote Review Board"
          description="Quotes ready for operator review and conversion."
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
            { key: 'id', label: 'Quote ID', sortable: true, sortValue: (row) => row.quote_id ?? String(row.id), render: (row) => <span className="font-medium text-white">{row.quote_id ?? `Q-${row.id}`}</span> },
            { key: 'customer', label: 'Customer', sortable: true, sortValue: (row) => row.name, render: (row) => row.name },
            { key: 'material', label: 'Material', sortable: true, sortValue: (row) => row.config?.materialId ?? '', render: (row) => row.config?.materialId ?? 'Unknown' },
            { key: 'estimate', label: 'Estimate', sortable: true, sortValue: (row) => row.estimate?.total ?? 0, render: (row) => `₹${Number(row.estimate?.total ?? 0).toLocaleString('en-IN')}` },
            { key: 'status', label: 'Status', sortable: true, sortValue: (row) => row.status, render: (row) => <StatusBadge status={row.status} /> },
            {
              key: 'actions',
              label: 'Actions',
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      updateQuoteStatus(row, 'approved', `${row.quote_id ?? row.id} approved.`)
                    }}
                    className="rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-100"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      updateQuoteStatus(row, 'rejected', `${row.quote_id ?? row.id} rejected.`)
                    }}
                    className="rounded-xl border border-rose-400/15 bg-rose-400/10 px-3 py-2 text-xs font-medium text-rose-100"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      updateQuoteStatus(row, 'converted', `${row.quote_id ?? row.id} converted to order.`)
                    }}
                    className="rounded-xl border border-sky-400/15 bg-sky-400/10 px-3 py-2 text-xs font-medium text-sky-100"
                  >
                    Convert
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
