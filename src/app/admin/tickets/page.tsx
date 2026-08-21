'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Ticket, MessageSquare } from 'lucide-react'
import DataTable from '@/components/admin/DataTable'
import type { SupportTicket } from '@/lib/admin/types'
import SkeletonBlock from '@/components/admin/SkeletonBlock'

const statusTabs = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'Open' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Resolved', value: 'Resolved' },
  { label: 'Closed', value: 'Closed' },
]

const sourceTabs = [
  { label: 'All Sources', value: 'all' },
  { label: 'Email', value: 'email' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'Manual', value: 'manual' },
]

export default function TicketsPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeStatus, setActiveStatus] = useState('all')
  const [activeSource, setActiveSource] = useState('all')

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const params = new URLSearchParams()
        if (activeStatus !== 'all') params.set('status', activeStatus)
        if (activeSource !== 'all') params.set('source', activeSource)

        const response = await fetch(`/api/admin/tickets?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? 'Failed to load tickets data.')
        }

        const json = (await response.json()) as { tickets: SupportTicket[] }
        setTickets(json.tickets)
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') {
          return
        }
        setError(loadError instanceof Error ? loadError.message : 'Failed to load tickets data.')
      }
    }

    void load()
    return () => controller.abort()
  }, [activeStatus, activeSource])

  const filteredTickets = tickets ?? []

  const statusCounts = {
    all: tickets?.length ?? 0,
    'Open': tickets?.filter((t) => t.status === 'Open').length ?? 0,
    'In Progress': tickets?.filter((t) => t.status === 'In Progress').length ?? 0,
    'Resolved': tickets?.filter((t) => t.status === 'Resolved').length ?? 0,
    'Closed': tickets?.filter((t) => t.status === 'Closed').length ?? 0,
  }

  if (error) {
    return (
      <div className="rounded-[28px] border border-rose-400/15 bg-rose-50 p-6 text-rose-100">
        {error}
      </div>
    )
  }

  if (!tickets) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-32 w-full" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-10 w-24" />
          ))}
        </div>
        <SkeletonBlock className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/20 bg-[#6d28d9]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#6d28d9]">
          <Ticket className="h-3 w-3" />
          Support Tickets
        </div>
        <h1 className="mt-2 font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">Support Tickets</h1>
        <p className="mt-2 max-w-xl text-sm text-[#6F7192]">
          Manage customer queries and issues across email, WhatsApp, and manual channels
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-wrap gap-2"
      >
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveStatus(tab.value)}
            className={`rounded-xl border px-3.5 py-2 text-xs font-medium transition ${
              activeStatus === tab.value
                ? 'border-[#6d28d9]/30 bg-[#6d28d9]/10 text-[#6d28d9]'
                : 'border-gray-200 bg-gray-50 text-[#6F7192] hover:bg-gray-100'
            }`}
          >
            {tab.label} ({statusCounts[tab.value as keyof typeof statusCounts]})
          </button>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="flex flex-wrap gap-2"
      >
        {sourceTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveSource(tab.value)}
            className={`rounded-xl border px-3 py-1.5 text-[11px] font-medium transition ${
              activeSource === tab.value
                ? 'border-gray-300 bg-gray-100 text-[#0F1B3D]'
                : 'border-gray-200 bg-white text-[#6F7192] hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <DataTable
          title="Support Tickets"
          description="Track and manage customer support tickets"
          data={filteredTickets}
          searchPlaceholder="Search by ticket number, customer, subject..."
          searchKeys={['ticketNumber', 'customer', 'subject', 'category']}
          exportFilename="support-tickets.csv"
          onRowClick={(row: SupportTicket) => router.push(`/admin/tickets/${row.id}`)}
          filters={[
            {
              key: 'priority',
              label: 'Priority',
              options: [
                { label: 'All', value: 'all' },
                { label: 'Urgent', value: 'Urgent' },
                { label: 'High', value: 'High' },
                { label: 'Normal', value: 'Normal' },
                { label: 'Low', value: 'Low' },
              ],
              getValue: (row) => row.priority || 'Normal',
            },
            {
              key: 'category',
              label: 'Category',
              options: [
                { label: 'All', value: 'all' },
                { label: 'Print Quality', value: 'Print Quality' },
                { label: 'Order Issue', value: 'Order Issue' },
                { label: 'Billing', value: 'Billing' },
                { label: 'Shipping', value: 'Shipping' },
                { label: 'Product Inquiry', value: 'Product Inquiry' },
                { label: 'Other', value: 'Other' },
              ],
              getValue: (row) => row.category || 'Other',
            },
          ]}
          columns={[
            { key: 'ticketNumber', label: 'Ticket', sortable: true, exportValue: (row: SupportTicket) => row.ticketNumber, render: (row: SupportTicket) => (
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#0F1B3D]">{row.ticketNumber}</span>
                {row.messageCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-[#6F7192]">
                    <MessageSquare className="h-2.5 w-2.5" />
                    {row.messageCount}
                  </span>
                )}
              </div>
            )},
            { key: 'customer', label: 'Customer', sortable: true, exportValue: (row: SupportTicket) => row.customer, render: (row: SupportTicket) => (
              <div>
                <div className="text-[#0F1B3D]">{row.customer}</div>
                {row.customerEmail && <div className="text-[11px] text-[#6F7192]">{row.customerEmail}</div>}
              </div>
            )},
            { key: 'subject', label: 'Subject', sortable: true, exportValue: (row: SupportTicket) => row.subject, render: (row: SupportTicket) => <span className="text-[#6F7192]">{row.subject}</span> },
            { key: 'source', label: 'Source', sortable: true, exportValue: (row: SupportTicket) => row.source, render: (row: SupportTicket) => (
              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                row.source === 'email' ? 'bg-blue-50 text-blue-600' :
                row.source === 'whatsapp' ? 'bg-green-50 text-green-600' :
                row.source === 'manual' ? 'bg-gray-100 text-gray-600' :
                'bg-purple-50 text-purple-600'
              }`}>
                {row.source}
              </span>
            )},
            { key: 'category', label: 'Category', sortable: true, exportValue: (row: SupportTicket) => row.category, render: (row: SupportTicket) => <span className="text-[#6F7192]">{row.category}</span> },
            { key: 'priority', label: 'Priority', sortable: true, exportValue: (row: SupportTicket) => row.priority || 'Normal', render: (row: SupportTicket) => (
              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                row.priority === 'Urgent' ? 'bg-red-100 text-red-700' :
                row.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                row.priority === 'Normal' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {row.priority}
              </span>
            )},
            { key: 'status', label: 'Status', sortable: true, exportValue: (row: SupportTicket) => row.status, render: (row: SupportTicket) => (
              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                row.status === 'Open' ? 'bg-red-100 text-red-700' :
                row.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' :
                row.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {row.status}
              </span>
            )},
            { key: 'lastMessageAt', label: 'Last Activity', sortable: true, exportValue: (row: SupportTicket) => row.lastMessageAt, render: (row: SupportTicket) => (
              <span className="text-[#6F7192]">{formatDate(row.lastMessageAt)}</span>
            )},
          ]}
        />
      </motion.div>
    </div>
  )
}

function formatDate(dateString: string): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
