'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Bot,
  CheckCheck,
  Download,
  FileText,
  LoaderCircle,
  MessageCircle,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  User,
  X,
  Box,
  ShoppingCart,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  Pencil,
} from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'

type Conversation = {
  sender: string
  contactName: string | null
  contactEmail: string | null
  lastMessage: string
  lastTimestamp: string
  lastDirection: string
  lastAutomated: boolean
  unread: number
  hasMedia: boolean
  mediaType: string | null
  tags: string[]
  isArchived: boolean
  windowActive: boolean
  remainingWindowMinutes: number
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
  media_type: 'image' | 'document' | 'audio' | 'video' | 'sticker' | 'stl' | 'template' | null
  media_url: string | null
  media_filename: string | null
  media_mime_type: string | null
  media_size_bytes: number | null
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | null
  meta_message_id: string | null
}

type ShopOrder = {
  id: string
  order_number: string
  total_amount: number
  currency: string
  status: string
  payment_status: string
  fulfilment_status: string
  items: Array<{ name: string; quantity: number; price: number }>
  created_at: string
}

type InternalNote = {
  id: string
  note_text: string
  created_at: string
  author_id: string | null
}

type QuickReply = {
  id: string
  title: string
  shortcut: string
  content: string
  category: string
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

function formatBytes(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function WhatsAppInboxClient() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSender, setActiveSender] = useState<string | null>(null)
  
  // Message Thread State
  const [messages, setMessages] = useState<Message[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [contactName, setContactName] = useState<string | null>(null)
  const [contactEmail, setContactEmail] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [orders, setOrders] = useState<ShopOrder[]>([])
  const [notes, setNotes] = useState<InternalNote[]>([])
  const [windowActive, setWindowActive] = useState(false)
  const [remainingWindowMinutes, setRemainingWindowMinutes] = useState(0)

  // Composer & UI State
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [selectedFile, setSelectedFile] = useState<{ url: string; filename: string; mimeType: string; size: number; mediaType: 'image' | 'document' | 'audio' | 'video' } | null>(null)
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'archived'>('all')
  const [showDrawer, setShowDrawer] = useState(true)
  const [showQuickRepliesModal, setShowQuickRepliesModal] = useState(false)
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [newNoteText, setNewNoteText] = useState('')
  const [toast, setToast] = useState<AdminToastState>(null)
  const [sessionStats, setSessionStats] = useState<{ totalSessions: number; active24h: number; staleCount: number } | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const replyInputRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const loadConversations = useCallback(async () => {
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

    try {
      const statsRes = await fetch('/api/admin/whatsapp-sessions/stats')
      if (statsRes.ok) {
        setSessionStats(await statsRes.json())
      }
    } catch {}
  }, [])

  const loadQuickReplies = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/whatsapp/quick-replies')
      if (res.ok) {
        const data = await res.json() as { quickReplies: QuickReply[] }
        setQuickReplies(data.quickReplies)
      }
    } catch {}
  }, [])

  const [editingQr, setEditingQr] = useState<QuickReply | null>(null)
  const [editContent, setEditContent] = useState('')

  async function saveQuickReply(id: string) {
    if (!editContent.trim()) return
    try {
      const res = await fetch(`/api/admin/whatsapp/quick-replies?id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({})) as { error?: string })?.error || 'Update failed')
      await loadQuickReplies()
      setToast({ type: 'success', message: 'Instant reply updated.' })
    } catch (err) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Update failed.' })
    } finally {
      setEditingQr(null)
      setEditContent('')
    }
  }

  async function deleteQuickReply(id: string, shortcut: string) {
    if (!confirm(`Delete instant reply "${shortcut}"?`)) return
    try {
      const res = await fetch(`/api/admin/whatsapp/quick-replies?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      await loadQuickReplies()
      setToast({ type: 'success', message: 'Instant reply deleted.' })
    } catch (err) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Delete failed.' })
    }
  }

  useEffect(() => {
    async function load() {
      await Promise.all([loadConversations(), loadQuickReplies()])
    }
    load()
  }, [loadConversations, loadQuickReplies])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMessages = useCallback(async (sender: string) => {
    setMessagesLoading(true)
    setActiveSender(sender)
    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${encodeURIComponent(sender)}`)
      if (res.ok) {
        const data = await res.json() as {
          messages: Message[]
          contactName: string | null
          contactEmail: string | null
          profileId: string | null
          orders: ShopOrder[]
          notes: InternalNote[]
          tags: string[]
          isArchived: boolean
          windowActive: boolean
          remainingWindowMinutes: number
        }
        setMessages(data.messages)
        setContactName(data.contactName)
        setContactEmail(data.contactEmail)
        setProfileId(data.profileId)
        setOrders(data.orders)
        setNotes(data.notes)
        setWindowActive(data.windowActive)
        setRemainingWindowMinutes(data.remainingWindowMinutes)
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to load conversation details.' })
    } finally {
      setMessagesLoading(false)
    }
  }, [])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/whatsapp/upload-media', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error || 'Upload failed')
      }

      const data = await res.json() as { mediaUrl: string; mediaType: 'image' | 'document' | 'audio' | 'video'; mediaFilename: string; mediaMimeType: string; mediaSizeBytes: number }
      setSelectedFile({
        url: data.mediaUrl,
        filename: data.mediaFilename,
        mimeType: data.mediaMimeType,
        size: data.mediaSizeBytes,
        mediaType: data.mediaType,
      })
      setToast({ type: 'success', message: 'File ready to attach.' })
    } catch (err) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Upload failed.' })
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function sendReply() {
    if ((!replyText.trim() && !selectedFile) || !activeSender || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${encodeURIComponent(activeSender)}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyText.trim(),
          mediaUrl: selectedFile?.url,
          mediaType: selectedFile?.mediaType,
          mediaFilename: selectedFile?.filename,
          mediaSizeBytes: selectedFile?.size,
          mediaMimeType: selectedFile?.mimeType,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? 'Failed to send reply.')
      }

      setReplyText('')
      setSelectedFile(null)
      await loadMessages(activeSender)
      await loadConversations()
      setToast({ type: 'success', message: 'Message sent to WhatsApp.' })
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to send.' })
    } finally {
      setSending(false)
      replyInputRef.current?.focus()
    }
  }

  async function generateAiDraft() {
    if (!activeSender || aiLoading) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/admin/whatsapp/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: activeSender, userPrompt: replyText }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error || 'Failed to generate AI draft.')
      }
      const data = await res.json() as { draftReply: string }
      setReplyText(data.draftReply)
      setToast({ type: 'success', message: 'AI reply generated! Edit before sending.' })
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'AI Co-Pilot error.' })
    } finally {
      setAiLoading(false)
    }
  }

  async function addInternalNote() {
    if (!newNoteText.trim() || !activeSender) return
    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${encodeURIComponent(activeSender)}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteText: newNoteText.trim() }),
      })
      if (res.ok) {
        setNewNoteText('')
        await loadMessages(activeSender)
        setToast({ type: 'success', message: 'Internal note saved.' })
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to save note.' })
    }
  }

  async function shareOrderUpdateInChat(order: ShopOrder) {
    const text = `Order #${order.order_number} Update:\nStatus: ${order.status.toUpperCase()}\nPayment: ${order.payment_status.toUpperCase()}\nTotal: ₹${order.total_amount}`
    setReplyText(text)
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendReply()
    }
  }

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch = c.sender.includes(search) || (c.contactName ?? '').toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    if (filterTab === 'unread') return c.unread > 0
    if (filterTab === 'archived') return c.isArchived
    return !c.isArchived
  })

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-[#6d28d9]" />
      </div>
    )
  }

  return (
    <div data-lenis-prevent className="flex flex-col h-[calc(100vh-8rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
      {/* Top Header Stats Banner */}
      {sessionStats && (
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/80 px-6 py-2.5 text-xs text-[#6F7192]">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 font-medium text-[#0F1B3D]">
              <MessageCircle className="h-3.5 w-3.5 text-[#6d28d9]" />
              WhatsApp Enterprise Workspace
            </span>
            <span>Total Sessions: <strong className="text-[#0F1B3D]">{sessionStats.totalSessions}</strong></span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              24h Active: <strong className="text-emerald-600">{sessionStats.active24h}</strong>
            </span>
          </div>
          <button
            onClick={() => loadConversations()}
            className="flex items-center gap-1 hover:text-[#6d28d9] transition"
          >
            <RefreshCw className="h-3 w-3" /> Refresh Inbox
          </button>
        </div>
      )}

      {/* Main 3-Column Inbox Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Column 1: Conversations List & Filters (Left) */}
        <div className={`flex w-full flex-col border-r border-gray-200 bg-white md:w-[360px] lg:w-[380px] shrink-0 ${activeSender ? 'hidden md:flex' : 'flex'}`}>
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0F1B3D] flex items-center gap-2">
                Inbox
              </h2>
              <button
                type="button"
                onClick={() => setShowQuickRepliesModal(true)}
                className="flex items-center gap-1 rounded-xl bg-purple-50 px-2.5 py-1.5 text-xs font-semibold text-[#6d28d9] hover:bg-purple-100 transition"
              >
                <ZapIcon className="h-3.5 w-3.5" /> Instant Replies
              </button>
            </div>

            {/* Search */}
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search phone, customer name..."
                className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-xs text-[#0F1B3D] outline-none focus:border-[#6d28d9]/40 focus:bg-white"
              />
            </div>

            {/* Filter Tabs */}
            <div className="mt-3 flex items-center gap-1 rounded-xl bg-gray-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`flex-1 rounded-lg py-1 font-medium transition ${filterTab === 'all' ? 'bg-white text-[#0F1B3D] shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('unread')}
                className={`flex-1 rounded-lg py-1 font-medium transition ${filterTab === 'unread' ? 'bg-white text-[#0F1B3D] shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Unread
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('archived')}
                className={`flex-1 rounded-lg py-1 font-medium transition ${filterTab === 'archived' ? 'bg-white text-[#0F1B3D] shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Archived
              </button>
            </div>
          </div>

          {/* Conversation List Stream */}
           <div data-lenis-prevent className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
                <MessageCircle className="mb-2 h-10 w-10 stroke-1" />
                <p className="text-xs">No conversations match criteria</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.sender}
                  type="button"
                  onClick={() => loadMessages(conv.sender)}
                  className={`flex w-full items-start gap-3 p-3.5 text-left transition hover:bg-purple-50/50 ${
                    activeSender === conv.sender ? 'bg-[#6d28d9]/5 border-l-4 border-[#6d28d9]' : ''
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-purple-100 text-[#6d28d9] font-bold text-sm">
                      {conv.contactName ? conv.contactName.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                    </div>
                    {conv.windowActive && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" title="24h Window Active" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-xs font-bold text-[#0F1B3D]">
                        {conv.contactName || conv.sender}
                      </span>
                      <span className="shrink-0 text-[10px] text-gray-400">{formatRelative(conv.lastTimestamp)}</span>
                    </div>

                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-gray-500 flex items-center gap-1">
                        {conv.lastAutomated && <Bot className="h-3 w-3 text-purple-600 shrink-0" />}
                        {conv.hasMedia && <Paperclip className="h-3 w-3 text-blue-500 shrink-0" />}
                        {conv.lastMessage}
                      </p>
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

        {/* Column 2: Active Chat Stream & Composer (Middle) */}
        <div className={`flex flex-1 flex-col bg-gray-50 ${!activeSender ? 'hidden md:flex' : 'flex'}`}>
          {!activeSender ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="text-center">
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-purple-100 text-[#6d28d9]">
                  <MessageCircle className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-[#0F1B3D]">Select a Conversation</h3>
                <p className="mt-1 text-xs text-gray-500">Pick a customer thread on the left to start live chatting, manage 3D orders, or share files.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Active Chat Header */}
              <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveSender(null)}
                    aria-label="Back to conversations"
                    className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 md:hidden"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-purple-600 text-white font-bold text-sm">
                    {contactName ? contactName.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F1B3D] flex items-center gap-2">
                      {contactName || activeSender}
                      {profileId && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          <ShieldCheck className="h-3 w-3" /> Account Linked
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-gray-400">{contactName ? activeSender : 'WhatsApp Contact'}</p>
                  </div>
                </div>

                {/* Header Actions & 24h Window Indicator */}
                <div className="flex items-center gap-3">
                  {windowActive ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      24h Window Active ({Math.floor(remainingWindowMinutes / 60)}h {remainingWindowMinutes % 60}m)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[11px] font-semibold text-amber-700">
                      <AlertCircle className="h-3.5 w-3.5" /> 24h Window Expired
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowDrawer(!showDrawer)}
                    className={`grid h-8 w-8 place-items-center rounded-lg border transition ${
                      showDrawer ? 'border-[#6d28d9] bg-purple-50 text-[#6d28d9]' : 'border-gray-200 text-gray-500 hover:bg-gray-100'
                    }`}
                    title="Toggle Orders Drawer"
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div data-lenis-prevent className="flex-1 overflow-y-auto p-4 space-y-3">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoaderCircle className="h-6 w-6 animate-spin text-[#6d28d9]" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-xs">No messages found in thread.</div>
                ) : (
                  messages.map((msg) => {
                    const isOutgoing = msg.direction === 'outgoing'
                    return (
                      <div key={msg.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[78%] rounded-2xl p-3 shadow-sm ${
                            isOutgoing
                              ? 'bg-[#6d28d9] text-white rounded-br-none'
                              : 'bg-white text-[#0F1B3D] border border-gray-200/80 rounded-bl-none'
                          }`}
                        >
                          {/* Render Media Cards */}
                          {msg.media_type && (
                            <div className="mb-2">
                              {msg.media_type === 'image' && msg.media_url && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImage(msg.media_url)}
                                  className="group relative overflow-hidden rounded-xl border border-black/10"
                                >
                                  <img src={msg.media_url} alt="WhatsApp Media" className="max-h-60 rounded-xl object-cover transition group-hover:scale-105" />
                                </button>
                              )}

                              {msg.media_type === 'stl' && (
                                <div className={`flex items-center gap-3 rounded-xl border p-2.5 ${isOutgoing ? 'bg-white/10 border-white/20' : 'bg-purple-50 border-purple-200'}`}>
                                  <Box className={`h-8 w-8 ${isOutgoing ? 'text-white' : 'text-[#6d28d9]'}`} />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-bold">{msg.media_filename || '3D Model (.stl)'}</p>
                                    <p className={`text-[10px] ${isOutgoing ? 'text-white/70' : 'text-gray-500'}`}>{formatBytes(msg.media_size_bytes)}</p>
                                  </div>
                                  {msg.media_url && (
                                    <a
                                      href={msg.media_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      download
                                      aria-label={`Download ${msg.media_filename || 'media file'}`}
                                      className={`rounded-lg p-1.5 transition ${isOutgoing ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-white text-[#6d28d9] hover:bg-purple-100'}`}
                                    >
                                      <Download className="h-4 w-4" />
                                    </a>
                                  )}
                                </div>
                              )}

                              {msg.media_type === 'document' && (
                                <div className={`flex items-center gap-3 rounded-xl border p-2.5 ${isOutgoing ? 'bg-white/10 border-white/20' : 'bg-gray-100 border-gray-200'}`}>
                                  <FileText className={`h-6 w-6 ${isOutgoing ? 'text-white' : 'text-gray-600'}`} />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium">{msg.media_filename || 'Document'}</p>
                                    <p className={`text-[10px] ${isOutgoing ? 'text-white/70' : 'text-gray-500'}`}>{formatBytes(msg.media_size_bytes)}</p>
                                  </div>
                                  {msg.media_url && (
                                    <a
                                      href={msg.media_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      download
                                      aria-label={`Download ${msg.media_filename || 'document'}`}
                                      className={`rounded-lg p-1.5 transition ${isOutgoing ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-white text-gray-700 hover:bg-gray-200'}`}
                                    >
                                      <Download className="h-4 w-4" />
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Message Text */}
                          {msg.message_text && (
                            <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">{msg.message_text}</p>
                          )}

                          {/* Timestamp & Status Ticks */}
                          <div className={`mt-1.5 flex items-center gap-1 text-[10px] ${isOutgoing ? 'justify-end text-white/70' : 'justify-start text-gray-400'}`}>
                            {msg.automated && <span className="rounded bg-black/10 px-1 py-0.5 text-[9px]">BOT</span>}
                            <span>{formatTime(msg.created_at)}</span>
                            {isOutgoing && (
                              <CheckCheck className="h-3 w-3 text-purple-200" />
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Selected File Attachment Badge */}
              {selectedFile && (
                <div className="mx-4 mb-2 flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 text-[#6d28d9]">
                    <Paperclip className="h-4 w-4" />
                    <span className="font-bold">{selectedFile.filename}</span>
                    <span className="text-[10px] text-gray-500">({formatBytes(selectedFile.size)})</span>
                  </div>
                  <button type="button" onClick={() => setSelectedFile(null)} aria-label="Remove selected file" className="text-gray-400 hover:text-gray-700">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Composer Toolbar & Textarea */}
              <div className="border-t border-gray-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploadingFile}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                    >
                      {uploadingFile ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5 text-purple-600" />}
                      Attach File
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowQuickRepliesModal(true)}
                      className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 transition"
                    >
                      <ZapIcon className="h-3.5 w-3.5 text-amber-500" /> Canned Template
                    </button>
                  </div>

                  {/* AI Co-Pilot Button */}
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={generateAiDraft}
                    className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1 text-xs font-bold text-white shadow-sm hover:opacity-90 transition disabled:opacity-50"
                  >
                    {aiLoading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    ✨ Draft with AI
                  </button>
                </div>

                {/* Textarea Input */}
                <div className="flex items-end gap-2">
                  <textarea
                    ref={replyInputRef}
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type WhatsApp reply... (Press Enter to send)"
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs text-[#0F1B3D] outline-none focus:border-[#6d28d9]/40 focus:bg-white resize-none"
                  />
                  <button
                    type="button"
                    disabled={sending || (!replyText.trim() && !selectedFile)}
                    onClick={sendReply}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#6d28d9] text-white transition hover:bg-purple-700 disabled:opacity-40"
                  >
                    {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Column 3: Customer Context & Orders Drawer ("Orders on Chat") (Right) */}
        {activeSender && showDrawer && (
          <div data-lenis-prevent className="w-[320px] shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-y-auto">
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Customer Context</h4>
                <button type="button" onClick={() => setShowDrawer(false)} aria-label="Close customer context" className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-purple-100 text-[#6d28d9] font-bold text-sm">
                  {contactName ? contactName.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-[#0F1B3D]">{contactName || 'Unregistered Contact'}</p>
                  <p className="text-[11px] text-gray-400">{activeSender}</p>
                  {contactEmail && <p className="truncate text-[10px] text-purple-600">{contactEmail}</p>}
                </div>
              </div>
            </div>

            {/* Section: Live Orders on Chat */}
            <div className="border-b border-gray-200 p-4">
              <h5 className="mb-3 flex items-center justify-between text-xs font-bold text-[#0F1B3D]">
                <span className="flex items-center gap-1.5">
                  <ShoppingCart className="h-3.5 w-3.5 text-[#6d28d9]" />
                  Orders on Chat ({orders.length})
                </span>
              </h5>

              {orders.length === 0 ? (
                <p className="text-[11px] text-gray-400">No shop or WhatsApp orders found for this customer phone.</p>
              ) : (
                <div className="space-y-3">
                  {orders.map((ord) => (
                    <div key={ord.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs">
                      <div className="flex items-center justify-between font-bold text-[#0F1B3D]">
                        <span>#{ord.order_number}</span>
                        <span className="text-purple-600">₹{ord.total_amount}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px]">
                        <span className="rounded bg-purple-100 px-1.5 py-0.5 font-medium text-purple-800 uppercase">{ord.status}</span>
                        <span className="text-gray-400">{formatTime(ord.created_at)}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => shareOrderUpdateInChat(ord)}
                        className="mt-2.5 w-full rounded-lg border border-purple-200 bg-white py-1 text-[11px] font-semibold text-[#6d28d9] hover:bg-purple-50 transition"
                      >
                        Share Order Status in Chat
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section: Internal Admin Notes */}
            <div className="p-4 flex-1 flex flex-col">
              <h5 className="mb-2 text-xs font-bold text-[#0F1B3D] flex items-center gap-1.5">
                <FileCheck className="h-3.5 w-3.5 text-amber-500" />
                Internal Admin Notes
              </h5>

              <div className="mb-3 flex items-center gap-1">
                <input
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Add private note..."
                  className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-[#0F1B3D] outline-none"
                />
                <button
                  type="button"
                  onClick={addInternalNote}
                  className="rounded-lg bg-gray-900 px-2.5 py-1 text-xs font-bold text-white hover:bg-black"
                >
                  Add
                </button>
              </div>

                <div data-lenis-prevent className="space-y-2 overflow-y-auto max-h-48">
                {notes.map((n) => (
                  <div key={n.id} className="rounded-lg bg-amber-50/70 border border-amber-200/60 p-2 text-[11px] text-amber-900">
                    <p className="leading-snug">{n.note_text}</p>
                    <p className="mt-1 text-[9px] text-amber-700">{formatTime(n.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Replies Modal */}
      <AnimatePresence>
        {showQuickRepliesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-base font-bold text-[#0F1B3D]">Canned Instant Replies</h3>
                <button onClick={() => setShowQuickRepliesModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div data-lenis-prevent className="mt-4 max-h-80 overflow-y-auto space-y-2">
                {quickReplies.map((qr) => (
                  <div
                    key={qr.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (editingQr?.id !== qr.id) {
                        setReplyText(qr.content)
                        setShowQuickRepliesModal(false)
                      }
                    }}
                    className="rounded-xl border border-gray-200 p-3 cursor-pointer hover:border-purple-300 hover:bg-purple-50/40 transition"
                  >
                    <div className="flex items-center justify-between font-bold text-xs text-[#0F1B3D]">
                      <span>{qr.title}</span>
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-700">{qr.shortcut}</span>
                        <button
                          type="button"
                          onClick={() => { setEditingQr(qr); setEditContent(qr.content) }}
                          className="rounded p-0.5 text-gray-400 hover:text-[#6d28d9]"
                          title="Edit"
                          aria-label={`Edit quick reply ${qr.shortcut}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteQuickReply(qr.id, qr.shortcut)}
                          className="rounded p-0.5 text-gray-400 hover:text-red-600"
                          title="Delete"
                          aria-label={`Delete quick reply ${qr.shortcut}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 line-clamp-2">{qr.content}</p>

                    {editingQr?.id === qr.id && (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={2}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-[#0F1B3D] outline-none focus:border-[#6d28d9]/40 resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingQr(null)}
                            className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => saveQuickReply(qr.id)}
                            className="rounded-lg bg-[#6d28d9] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-purple-700"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Lightbox Modal */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="relative max-w-4xl max-h-[90vh]">
              <button onClick={() => setPreviewImage(null)} className="absolute -top-10 right-0 text-white hover:text-gray-300">
                <X className="h-6 w-6" />
              </button>
              <img src={previewImage} alt="Preview" className="max-h-[85vh] rounded-xl object-contain" />
            </div>
          </div>
        )}
      </AnimatePresence>

      <AdminToast toast={toast} />
    </div>
  )
}

function ZapIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" {...props}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}
