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
      <div className="rounded-[28px] border border-rose-400/15 bg-rose-400/10 p-6 text-rose-100">
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
        <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#FF5C1A]/20 bg-[#FF5C1A]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#FF9A72]">
          <Ticket className="h-3 w-3" />
          Support Tickets
        </div>
        <h1 className="mt-2 font-[var(--font-syne)] text-3xl font-bold tracking-tight text-white">Support Tickets</h1>
        <p className="mt-2 max-w-xl text-sm text-[#7a82a0]">
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
                ? 'border-[#FF5C1A]/30 bg-[#FF5C1A]/10 text-[#FF9A72]'
                : 'border-white/8 bg-white/[0.03] text-[#8b95b5] hover:bg-white/[0.06]'
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
            { key: 'ticketId', label: 'Ticket ID', sortable: true, render: (row: SupportTicket) => <span className="font-medium text-white">{row.ticketId}</span> },
            { key: 'customer', label: 'Customer', sortable: true, render: (row: SupportTicket) => <span className="text-[#c6cee5]">{row.customer}</span> },
            { key: 'subject', label: 'Subject', sortable: true, render: (row: SupportTicket) => <span className="text-[#c6cee5]">{row.subject}</span> },
            { key: 'category', label: 'Category', sortable: true, render: (row: SupportTicket) => <span className="text-[#c6cee5]">{row.category}</span> },
            { key: 'priority', label: 'Priority', sortable: true, render: (row: SupportTicket) => (
              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                row.priority === 'Urgent' ? 'bg-red-400/20 text-red-400' :
                row.priority === 'High' ? 'bg-orange-400/20 text-orange-400' :
                row.priority === 'Normal' ? 'bg-blue-400/20 text-blue-400' :
                'bg-gray-400/20 text-gray-400'
              }`}>
                {row.priority}
              </span>
            )},
            { key: 'status', label: 'Status', sortable: true, render: (row: SupportTicket) => (
              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                row.status === 'Open' ? 'bg-red-400/20 text-red-400' :
                row.status === 'In Progress' ? 'bg-yellow-400/20 text-yellow-400' :
                row.status === 'Resolved' ? 'bg-emerald-400/20 text-emerald-400' :
                'bg-gray-400/20 text-gray-400'
              }`}>
                {row.status}
              </span>
            )},
            { key: 'assignedTo', label: 'Assigned To', sortable: true, render: (row: SupportTicket) => <span className="text-[#c6cee5]">{row.assignedTo}</span> },
            { key: 'created', label: 'Created', sortable: true, render: (row: SupportTicket) => <span className="text-[#8b95b5]">{row.created}</span> },
            { key: 'lastUpdated', label: 'Last Updated', sortable: true, render: (row: SupportTicket) => <span className="text-[#8b95b5]">{row.lastUpdated}</span> },
            { key: 'action', label: 'Action', render: () => (
              <button className="text-[#FF5C1A] hover:text-[#FF9A72] text-sm">View</button>
            )},
          ]}
        />
      </motion.div>
    </div>
  )
}
