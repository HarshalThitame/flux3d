'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCcw, Webhook } from 'lucide-react'
import DataTable from '@/components/admin/DataTable'
import SkeletonBlock from '@/components/admin/SkeletonBlock'
import type { PaymentEventData, ReconciliationRunData } from '@/lib/admin/types'

type WebhookHealthResponse = {
  health: {
    total: number
    processed: number
    failed: number
    ignored: number
    duplicateCount: number
    lastReceivedAt: string | null
    lastProcessedAt: string | null
  }
  events: PaymentEventData[]
  reconciliationRuns: ReconciliationRunData[]
}

type WhatsAppWebhookEvent = {
  id: string
  sender: string | null
  payload_hash: string | null
  signature_verified: boolean | null
  processed_at: string | null
  reply_sent: boolean | null
  retry_count: number | null
  last_error: string | null
  last_retried_at: string | null
  received_at: string | null
  created_at: string
}

export default function AdminWebhookHealthPage() {
  const [data, setData] = useState<WebhookHealthResponse | null>(null)
  const [whatsappEvents, setWhatsappEvents] = useState<WhatsAppWebhookEvent[]>([])
  const [busyEventId, setBusyEventId] = useState<string | null>(null)
  const [busyWhatsappId, setBusyWhatsappId] = useState<string | null>(null)

  async function load() {
    const response = await fetch('/api/admin/webhook-health')
    if (!response.ok) throw new Error('Failed to load webhook health.')
    const json = await response.json() as WebhookHealthResponse
    setData(json)

    const whatsappResponse = await fetch('/api/admin/whatsapp-webhook-events?status=failed&limit=20')
    if (whatsappResponse.ok) {
      const json = await whatsappResponse.json() as { events: WhatsAppWebhookEvent[] }
      setWhatsappEvents(json.events)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch(() => {})
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  async function reprocess(eventId: string) {
    setBusyEventId(eventId)
    try {
      const response = await fetch('/api/admin/webhook-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      })
      if (!response.ok) throw new Error('Failed to reprocess event.')
      await load()
    } finally {
      setBusyEventId(null)
    }
  }

  async function reprocessWhatsapp(id: string) {
    setBusyWhatsappId(id)
    try {
      const response = await fetch(`/api/admin/whatsapp-webhook-events/${id}/reprocess`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to reprocess WhatsApp event.')
      await load()
    } finally {
      setBusyWhatsappId(null)
    }
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-[420px] w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-600">
            <Webhook className="h-3 w-3" />
            Webhook Health
          </div>
          <h1 className="mt-2 font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">Webhook Health</h1>
          <p className="mt-2 text-sm text-[#6F7192]">Track recent webhook processing, duplicate events, and failed reprocessing attempts.</p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-xl border border-[#6d28d9]/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#0F1B3D]"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs text-[#6F7192]">Total</p>
          <p className="mt-1 text-xl font-bold text-[#0F1B3D]">{data.health.total}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs text-[#6F7192]">Processed</p>
          <p className="mt-1 text-xl font-bold text-emerald-600">{data.health.processed}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs text-[#6F7192]">Failed</p>
          <p className="mt-1 text-xl font-bold text-rose-600">{data.health.failed}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs text-[#6F7192]">Duplicates</p>
          <p className="mt-1 text-xl font-bold text-amber-500">{data.health.duplicateCount}</p>
        </div>
      </div>

      <DataTable
        title="Recent Webhook Events"
        description="Events stored by provider event ID."
        data={data.events}
        searchPlaceholder="Search event type, event ID, payment ID"
        searchKeys={['providerEventId', 'eventType', 'providerOrderId', 'providerPaymentId', 'processingStatus']}
        columns={[
          { key: 'eventType', label: 'Event', sortable: true, render: (row) => <span className="font-medium text-[#0F1B3D]">{row.eventType}</span> },
          { key: 'providerEventId', label: 'Event ID', sortable: true, render: (row) => <span className="break-all text-[#6F7192]">{row.providerEventId}</span> },
          { key: 'processingStatus', label: 'Processing', sortable: true, render: (row) => <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-[#0F1B3D]">{row.processingStatus}</span> },
          { key: 'providerPaymentId', label: 'Payment', sortable: true, render: (row) => <span className="break-all text-[#6F7192]">{row.providerPaymentId ?? '—'}</span> },
          { key: 'receivedAt', label: 'Received', sortable: true, render: (row) => <span className="text-[#6F7192]">{new Date(row.receivedAt).toLocaleString('en-IN')}</span> },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <button
                type="button"
                onClick={() => void reprocess(row.providerEventId)}
                disabled={busyEventId === row.providerEventId || row.signatureVerified !== true}
                className="rounded-lg border border-[#6d28d9]/10 bg-white px-3 py-2 text-xs font-semibold text-[#0F1B3D] disabled:opacity-60"
              >
                {busyEventId === row.providerEventId ? 'Reprocessing...' : 'Reprocess'}
              </button>
            ),
          },
        ]}
      />

      <DataTable
        title="Failed WhatsApp Webhook Events"
        description="Inbound WhatsApp events that exhausted retries. Reprocess to reset retry state and re-deliver."
        data={whatsappEvents}
        searchPlaceholder="Search sender, event ID, error"
        searchKeys={['id', 'sender', 'last_error']}
        columns={[
          {
            key: 'id',
            label: 'Event ID',
            sortable: true,
            render: (row) => <span className="break-all font-medium text-[#0F1B3D]">{row.id}</span>,
          },
          {
            key: 'sender',
            label: 'Sender',
            sortable: true,
            render: (row) => <span className="text-[#6F7192]">{row.sender ?? '—'}</span>,
          },
          {
            key: 'last_error',
            label: 'Error',
            render: (row) => <span className="break-all text-[#6F7192]">{row.last_error ?? '—'}</span>,
          },
          {
            key: 'received_at',
            label: 'Received',
            sortable: true,
            render: (row) => (
              <span className="text-[#6F7192]">
                {row.received_at ? new Date(row.received_at).toLocaleString('en-IN') : '—'}
              </span>
            ),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <button
                type="button"
                onClick={() => void reprocessWhatsapp(row.id)}
                disabled={busyWhatsappId === row.id}
                className="rounded-lg border border-[#6d28d9]/10 bg-white px-3 py-2 text-xs font-semibold text-[#0F1B3D] disabled:opacity-60"
              >
                {busyWhatsappId === row.id ? 'Reprocessing...' : 'Reprocess'}
              </button>
            ),
          },
        ]}
      />
    </div>
  )
}
