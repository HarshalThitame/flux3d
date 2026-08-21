'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Send,
  Clock,
  Mail,
  User,
  MessageSquare,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import type { SupportTicket, SupportTicketMessage, SupportTicketAttachment } from '@/lib/admin/types'
import SkeletonBlock from '@/components/admin/SkeletonBlock'

interface TicketDetail {
  ticket: SupportTicket & { assignedToName?: string | null }
  messages: SupportTicketMessage[]
  attachments: SupportTicketAttachment[]
}

export default function TicketDetailPage() {
  const params = useParams()
  const id = (params?.id as string) ?? ''
  const [data, setData] = useState<TicketDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [updating, setUpdating] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch(`/api/admin/tickets/${id}`, { signal: controller.signal })
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? 'Failed to load ticket.')
        }
        const json = (await response.json()) as TicketDetail
        setData(json)
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') return
        setError(loadError instanceof Error ? loadError.message : 'Failed to load ticket.')
      }
    }

    void load()
    return () => controller.abort()
  }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.messages.length])

  async function sendReply() {
    if (!replyText.trim() || sending) return
    setSending(true)

    try {
      const response = await fetch(`/api/admin/tickets/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText.trim() }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Failed to send reply.')
      }

      setReplyText('')
      // Refresh ticket data
      const refresh = await fetch(`/api/admin/tickets/${id}`)
      if (refresh.ok) {
        const json = (await refresh.json()) as TicketDetail
        setData(json)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply.')
    } finally {
      setSending(false)
    }
  }

  async function updateTicket(updates: Partial<SupportTicket>) {
    setUpdating(true)
    try {
      const response = await fetch(`/api/admin/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Failed to update ticket.')
      }

      const refresh = await fetch(`/api/admin/tickets/${id}`)
      if (refresh.ok) {
        const json = (await refresh.json()) as TicketDetail
        setData(json)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ticket.')
    } finally {
      setUpdating(false)
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/admin/tickets" className="inline-flex items-center gap-1 text-sm text-[#6F7192] hover:text-[#0F1B3D]">
          <ArrowLeft className="h-4 w-4" /> Back to tickets
        </Link>
        <div className="rounded-[28px] border border-rose-400/15 bg-rose-50 p-6 text-rose-700">
          {error}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-8 w-40" />
        <SkeletonBlock className="h-32 w-full" />
        <SkeletonBlock className="h-64 w-full" />
        <SkeletonBlock className="h-24 w-full" />
      </div>
    )
  }

  const { ticket, messages, attachments } = data
  const attachmentsByMessage = attachments.reduce<Record<string, SupportTicketAttachment[]>>((acc, att) => {
    if (!acc[att.message_id]) acc[att.message_id] = []
    acc[att.message_id].push(att)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/admin/tickets" className="mb-3 inline-flex items-center gap-1 text-sm text-[#6F7192] hover:text-[#0F1B3D]">
          <ArrowLeft className="h-4 w-4" /> Back to tickets
        </Link>

        <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-[var(--font-syne)] text-xl font-bold text-[#0F1B3D]">{ticket.ticketNumber}</span>
              <StatusBadge status={ticket.status} />
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                ticket.priority === 'Urgent' ? 'bg-red-100 text-red-700' :
                ticket.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                ticket.priority === 'Normal' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {ticket.priority}
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                {ticket.source}
              </span>
            </div>
            <h1 className="text-lg font-medium text-[#0F1B3D]">{ticket.subject}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-[#6F7192]">
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {ticket.customerEmail}
              </span>
              {ticket.customerPhone && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {ticket.customerPhone}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDate(ticket.created)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={ticket.status}
              onChange={(e) => updateTicket({ status: e.target.value as SupportTicket['status'] })}
              disabled={updating}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-[#0F1B3D] outline-none focus:border-[#6d28d9]/30 focus:ring-1 focus:ring-[#6d28d9]/20"
            >
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>

            <select
              value={ticket.priority}
              onChange={(e) => updateTicket({ priority: e.target.value as SupportTicket['priority'] })}
              disabled={updating}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-[#0F1B3D] outline-none focus:border-[#6d28d9]/30 focus:ring-1 focus:ring-[#6d28d9]/20"
            >
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Normal">Normal</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Conversation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border border-gray-200 bg-white"
      >
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-[#0F1B3D]">Conversation</h2>
        </div>

        <div className="space-y-4 p-5">
          {messages.length === 0 && (
            <div className="py-8 text-center text-sm text-[#6F7192]">No messages yet.</div>
          )}

          {messages.map((message) => {
            const isCustomer = message.sender_type === 'customer'
            const isAdmin = message.sender_type === 'admin'
            const msgAttachments = attachmentsByMessage[message.id] || []

            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isAdmin ? 'flex-row-reverse' : ''}`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                  isCustomer ? 'bg-[#6d28d9]' : isAdmin ? 'bg-emerald-500' : 'bg-gray-400'
                }`}>
                  {isCustomer ? <User className="h-4 w-4" /> : isAdmin ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                </div>

                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  isAdmin
                    ? 'bg-[#6d28d9] text-white'
                    : 'bg-gray-50 text-[#0F1B3D]'
                }`}>
                  <div className={`mb-1 flex items-center gap-2 text-[11px] ${isAdmin ? 'text-white/70' : 'text-[#6F7192]'}`}>
                    <span className="font-semibold">{message.sender_name || message.sender_email || 'Unknown'}</span>
                    <span>{formatDate(message.created_at)}</span>
                  </div>

                  {message.html_body ? (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: message.html_body }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap">{message.body}</div>
                  )}

                  {msgAttachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msgAttachments.map((att) => (
                        <div
                          key={att.id}
                          className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${
                            isAdmin ? 'bg-white/10 text-white' : 'bg-white text-[#6F7192]'
                          }`}
                        >
                          <Paperclip className="h-3 w-3" />
                          <span className="truncate">{att.filename}</span>
                          {att.size && <span className="opacity-70">({(att.size / 1024).toFixed(1)} KB)</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </motion.div>

      {/* Reply composer */}
      {ticket.status !== 'Closed' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-gray-200 bg-white p-5"
        >
          <h3 className="mb-3 text-sm font-semibold text-[#0F1B3D]">Reply to Customer</h3>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write your response..."
            rows={4}
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-[#0F1B3D] placeholder:text-gray-400 outline-none focus:border-[#6d28d9]/30 focus:ring-1 focus:ring-[#6d28d9]/20"
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-[#6F7192]">
              Will be sent from complaints@flux3d.in
            </span>
            <button
              onClick={sendReply}
              disabled={!replyText.trim() || sending}
              className="inline-flex items-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#5b21b6] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? 'Sending...' : 'Send Reply'}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const classes =
    status === 'Open'
      ? 'bg-red-100 text-red-700'
      : status === 'In Progress'
      ? 'bg-yellow-100 text-yellow-700'
      : status === 'Resolved'
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-gray-100 text-gray-700'

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${classes}`}>
      {status}
    </span>
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
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
