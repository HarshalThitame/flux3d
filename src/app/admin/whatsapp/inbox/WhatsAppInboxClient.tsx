'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Bot, LoaderCircle, MessageCircle, Search, Send, User } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'

type Conversation = {
  sender: string
  contactName: string | null
  lastMessage: string
  lastTimestamp: string
  lastDirection: string
  lastAutomated: boolean
  unread: number
}

type Message = {
  id: string
  sender: string | null
  direction: 'incoming' | 'outgoing'
  message_text: string
  automated: boolean
  trigger_event: string | null
  responded: boolean
  created_at: string | null
}

function formatTime(ts: string | null) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function formatRelative(ts: string | null) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays === 1) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function WhatsAppInboxClient() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSender, setActiveSender] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [contactName, setContactName] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<AdminToastState>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const replyInputRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/whatsapp/conversations')
        if (res.ok) {
          const data = await res.json() as { conversations: Conversation[] }
          setConversations(data.conversations)
        }
      } catch {
        setToast({ type: 'error', message: 'Failed to load conversations.' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMessages = useCallback(async (sender: string) => {
    setMessagesLoading(true)
    setActiveSender(sender)
    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${encodeURIComponent(sender)}`)
      if (res.ok) {
        const data = await res.json() as { messages: Message[]; contactName: string | null }
        setMessages(data.messages)
        setContactName(data.contactName)
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to load messages.' })
    } finally {
      setMessagesLoading(false)
    }
  }, [])

  async function sendReply() {
    if (!replyText.trim() || !activeSender || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${encodeURIComponent(activeSender)}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? 'Failed to send.')
      }
      setReplyText('')
      // Reload messages to show the new reply
      await loadMessages(activeSender)
      setToast({ type: 'success', message: 'Message sent.' })
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to send.' })
    } finally {
      setSending(false)
      replyInputRef.current?.focus()
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendReply()
    }
  }

  const filteredConversations = conversations.filter((c) =>
    c.sender.includes(search) || (c.contactName ?? '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-[#6d28d9]" />
      </div>
    )
  }

  return (
    <>
      <div className="flex h-[calc(100vh-10rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Left panel — Conversation list */}
        <div className={`flex w-full flex-col border-r border-gray-200 md:w-[380px] ${activeSender ? 'hidden md:flex' : 'flex'}`}>
          <div className="border-b border-gray-200 px-4 py-4">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-[#6d28d9]" />
              <h2 className="text-lg font-bold text-[#0F1B3D]">WhatsApp</h2>
            </div>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by phone or name"
                className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/30"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageCircle className="mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm text-[#6b7280]">No conversations yet</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.sender}
                  type="button"
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      setActiveSender(conv.sender)
                    }
                    loadMessages(conv.sender)
                  }}
                  className={`flex w-full items-center gap-3 border-b border-gray-100 px-4 py-4 text-left transition hover:bg-gray-50 ${
                    activeSender === conv.sender ? 'bg-[#6d28d9]/5' : ''
                  }`}
                >
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#6d28d9]/10 text-[#6d28d9]">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-[#0F1B3D]">
                        {conv.contactName || conv.sender}
                      </span>
                      <span className="shrink-0 text-[10px] text-[#9ca3af]">{formatRelative(conv.lastTimestamp)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="truncate text-xs text-[#6b7280]">
                        {conv.lastAutomated ? '🤖 ' : ''}{conv.lastMessage}
                      </span>
                      {conv.unread > 0 && (
                        <span className="shrink-0 rounded-full bg-[#6d28d9] px-2 py-0.5 text-[10px] font-bold text-white">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right panel — Message thread */}
        <div className={`flex flex-1 flex-col ${!activeSender ? 'hidden md:flex' : 'flex'}`}>
          {!activeSender ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <MessageCircle className="mx-auto mb-4 h-16 w-16 text-gray-200" />
                <h3 className="text-lg font-semibold text-[#0F1B3D]">WhatsApp Inbox</h3>
                <p className="mt-1 text-sm text-[#6b7280]">Select a conversation to view messages</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-4">
                <button
                  type="button"
                  onClick={() => setActiveSender(null)}
                  className="grid h-9 w-9 place-items-center rounded-xl text-[#6b7280] hover:bg-gray-100 md:hidden"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#6d28d9]/10 text-[#6d28d9]">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#0F1B3D]">{contactName || activeSender}</p>
                  <p className="text-xs text-[#6b7280]">{contactName ? activeSender : 'Unknown contact'}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <LoaderCircle className="h-6 w-6 animate-spin text-[#6d28d9]" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-sm text-[#6b7280]">No messages yet</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.direction === 'outgoing'
                            ? 'rounded-br-lg bg-[#6d28d9] text-white'
                            : 'rounded-bl-lg bg-gray-100 text-[#0F1B3D]'
                        }`}
                      >
                        <p className="text-sm leading-6 whitespace-pre-wrap break-words">{msg.message_text}</p>
                        <div className={`mt-1 flex items-center gap-2 ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                          <span className={`text-[10px] ${msg.direction === 'outgoing' ? 'text-white/60' : 'text-[#9ca3af]'}`}>
                            {formatTime(msg.created_at)}
                          </span>
                          {msg.automated && (
                            <span className={`inline-flex items-center gap-1 text-[10px] ${msg.direction === 'outgoing' ? 'text-white/60' : 'text-[#6b7280]'}`}>
                              <Bot className="h-3 w-3" />
                              Auto
                            </span>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply input */}
              <div className="border-t border-gray-200 px-4 py-4">
                <div className="flex items-end gap-3">
                  <textarea
                    ref={replyInputRef}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    rows={1}
                    className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#0F1B3D] outline-none transition focus:border-[#6d28d9]/30 focus:bg-white"
                  />
                  <button
                    type="button"
                    disabled={!replyText.trim() || sending}
                    onClick={sendReply}
                    className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-2xl bg-[#6d28d9] text-white transition hover:bg-[#5b21b6] disabled:opacity-50"
                  >
                    {sending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <AdminToast toast={toast} />
    </>
  )
}
