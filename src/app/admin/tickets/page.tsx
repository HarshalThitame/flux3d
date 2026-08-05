'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Ticket } from 'lucide-react'
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

export default function TicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch('/api/admin/tickets', { signal: controller.signal })
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
  }, [])

  const filteredTickets = tickets && activeTab !== 'all'
    ? tickets.filter((ticket) => ticket.status === activeTab)
    : tickets ?? []

  const tabCounts = {
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
          Manage customer queries and issues
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex gap-2"
      >
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-xl border px-3.5 py-2 text-xs font-medium transition ${
              activeTab === tab.value
                ? 'border-[#6d28d9]/30 bg-[#6d28d9]/10 text-[#6d28d9]'
                : 'border-gray-200 bg-gray-50 text-[#6F7192] hover:bg-gray-100'
            }`}
          >
            {tab.label} ({tabCounts[tab.value as keyof typeof tabCounts]})
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
          searchPlaceholder="Search by ticket ID, customer, subject..."
          searchKeys={['ticketId', 'customer', 'subject', 'category']}
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
                { label: 'Other', value: 'Other' },
              ],
              getValue: (row) => row.category || 'Other',
            },
          ]}
          columns={[
            { key: 'ticketId', label: 'Ticket ID', sortable: true, render: (row: SupportTicket) => <span className="font-medium text-[#0F1B3D]">{row.ticketId}</span> },
            { key: 'customer', label: 'Customer', sortable: true, render: (row: SupportTicket) => <span className="text-[#6F7192]">{row.customer}</span> },
            { key: 'subject', label: 'Subject', sortable: true, render: (row: SupportTicket) => <span className="text-[#6F7192]">{row.subject}</span> },
            { key: 'category', label: 'Category', sortable: true, render: (row: SupportTicket) => <span className="text-[#6F7192]">{row.category}</span> },
            { key: 'priority', label: 'Priority', sortable: true, render: (row: SupportTicket) => (
              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                row.priority === 'Urgent' ? 'bg-red-100 text-red-700' :
                row.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                row.priority === 'Normal' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {row.priority}
              </span>
            )},
            { key: 'status', label: 'Status', sortable: true, render: (row: SupportTicket) => (
              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                row.status === 'Open' ? 'bg-red-100 text-red-700' :
                row.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' :
                row.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {row.status}
              </span>
            )},
            { key: 'assignedTo', label: 'Assigned To', sortable: true, render: (row: SupportTicket) => <span className="text-[#6F7192]">{row.assignedTo}</span> },
            { key: 'created', label: 'Created', sortable: true, render: (row: SupportTicket) => <span className="text-[#6F7192]">{row.created}</span> },
            { key: 'lastUpdated', label: 'Last Updated', sortable: true, render: (row: SupportTicket) => <span className="text-[#6F7192]">{row.lastUpdated}</span> },
          ]}
        />
      </motion.div>
    </div>
  )
}
