'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  User,
  Clock,
  FileText,
  ShoppingCart,
  Heart,
  Package,
  CreditCard,
  Upload,
  MessageSquare,
  Ticket,
  Tag,
  Save,
} from 'lucide-react'
import SkeletonBlock from '@/components/admin/SkeletonBlock'

type Tab = 'overview' | 'sessions' | 'pages' | 'time' | 'quotes' | 'cart' | 'orders' | 'payments' | 'files' | 'whatsapp' | 'tickets' | 'notes'

type CustomerProfile = {
  name?: string
  email?: string
  phone?: string
  whatsappNumber?: string
  city?: string
  state?: string
  profession?: string
  totalSpent?: number
  totalOrders?: number
  engagementScore?: number
  totalTimeSpent?: string
  avgSessionDuration?: string
  totalSiteVisits?: number
  tags?: string[]
  notes?: string
}

type CustomerSession = {
  id: string
  sessionId?: string
  startedAt: string
  device?: string
  durationSeconds?: number
  pageViewsCount?: number
}

type CustomerPageView = {
  id: string
  pageTitle?: string
  pageUrl?: string
  enteredAt: string
  timeSpentSeconds?: number
  scrollDepthPercent?: number
}

type CustomerQuote = {
  id: string
  quoteId?: string
  material?: string
  weightGrams?: number
  estimatedCost?: number
  convertedToOrder?: boolean
}

type CustomerCart = {
  id: string
  material?: string
  weightGrams?: number
  estimatedCost?: number
  status?: string
}

type CustomerOrder = {
  id: string
  orderNumber?: string
  material?: string
  weightGrams?: number
  amount?: number
  status?: string
}

type CustomerFile = {
  name?: string
  size?: number
  uploadedAt?: string
}

type CustomerWhatsAppMessage = {
  id: string
  direction?: string
  messageText?: string
  createdAt: string
  automated?: boolean
}

type CustomerSupportTicket = {
  id: string
  ticketId?: string
  subject?: string
  category?: string
  status?: string
}

type CustomerWishlistItem = {
  id: string
  productName?: string
  material?: string
  price?: number
  addedAt?: string
  ordered?: boolean
  orderId?: string
}

type CustomerPayment = {
  id: string
  orderNumber?: string
  amountPaise: number
  currency?: string
  provider?: string
  paymentPurpose?: string
  status?: string
  paymentMethod?: string
  receipt?: string
  refundedAmountPaise?: number
  createdAt?: string
}

type CustomerProfileResponse = {
  profile?: CustomerProfile
  quickStats?: { sessions: number; pageViews: number; quotes: number; files: number }
  pageViews?: CustomerPageView[]
  orders?: CustomerOrder[]
  wishlist?: CustomerWishlistItem[]
  files?: CustomerFile[]
}

const statusBadgeClass = (value: string | undefined, highlight: string, danger: string, warning: string) => {
  const v = value?.toLowerCase() ?? ''
  if (v === 'resolved' || v === 'delivered' || v === 'paid' || v === 'captured' || v === 'active' || v === 'processed') {
    return highlight
  }
  if (v === 'cancelled' || v === 'abandoned' || v === 'failed' || v === 'refunded' || v === 'open') {
    return danger
  }
  return warning
}

export default function CustomerProfilePage() {
  const params = useParams<{ id: string }>()
  const customerId = params?.id ?? ''

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [quickStats, setQuickStats] = useState<CustomerProfileResponse['quickStats'] | null>(null)
  const [pageViews, setPageViews] = useState<CustomerPageView[] | null>(null)
  const [orders, setOrders] = useState<CustomerOrder[] | null>(null)
  const [wishlist, setWishlist] = useState<CustomerWishlistItem[] | null>(null)
  const [files, setFiles] = useState<CustomerFile[] | null>(null)

  const [sessions, setSessions] = useState<CustomerSession[] | null>(null)
  const [quotes, setQuotes] = useState<CustomerQuote[] | null>(null)
  const [carts, setCarts] = useState<CustomerCart[] | null>(null)
  const [whatsappMessages, setWhatsappMessages] = useState<CustomerWhatsAppMessage[] | null>(null)
  const [supportTickets, setSupportTickets] = useState<CustomerSupportTicket[] | null>(null)
  const [payments, setPayments] = useState<CustomerPayment[] | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tabLoading, setTabLoading] = useState<Tab | null>(null)
  const loadedTabs = useRef<Partial<Record<Tab, boolean>>>({})

  // Notes & tags editing state
  const [notes, setNotes] = useState<string>('')
  const [tagsInput, setTagsInput] = useState<string>('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesMessage, setNotesMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    async function load() {
      if (!customerId) {
        setError('Missing customer ID.')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/admin/customers/${customerId}`, { signal: controller.signal })
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? 'Failed to load customer profile.')
        }
        const json = (await response.json()) as CustomerProfileResponse
        if (!cancelled) {
          setProfile(json.profile ?? null)
          setQuickStats(json.quickStats ?? null)
          setPageViews(json.pageViews || [])
          setOrders(json.orders || [])
          setWishlist(json.wishlist || [])
          setFiles(json.files || [])
          setNotes(json.profile?.notes ?? '')
          setTagsInput((json.profile?.tags ?? []).join(', '))
        }
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') {
          cancelled = true
          return
        }
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load customer profile.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => { cancelled = true; controller.abort() }
  }, [customerId])

  async function ensureLoaded(tab: Tab) {
    if (loadedTabs.current[tab] || !customerId) return
    loadedTabs.current[tab] = true
    setTabLoading(tab)
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/${tabEndpoint(tab)}`)
      if (!res.ok) throw new Error(`Failed to load ${tab} data.`)
      const json = await res.json()

      if (tab === 'sessions') setSessions(json.sessions || [])
      if (tab === 'pages') setPageViews(json.pageViews || [])
      if (tab === 'quotes') setQuotes(json.quotes || [])
      if (tab === 'cart') setCarts(json.carts || [])
      if (tab === 'tickets') setSupportTickets(json.tickets || [])
      if (tab === 'whatsapp') setWhatsappMessages(json.messages || [])
      if (tab === 'payments') setPayments(json.payments || [])
    } catch {
      loadedTabs.current[tab] = false
    } finally {
      setTabLoading(null)
    }
  }

  function tabEndpoint(tab: Tab): string {
    switch (tab) {
      case 'sessions': return 'sessions'
      case 'pages': return 'page-views'
      case 'quotes': return 'quotes'
      case 'cart': return 'carts'
      case 'tickets': return 'tickets'
      case 'whatsapp': return 'whatsapp'
      case 'payments': return 'payments'
      default: return ''
    }
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab)
    void ensureLoaded(tab)
  }

  async function saveNotes() {
    setSavingNotes(true)
    setNotesMessage(null)
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes,
          tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Failed to save notes.')
      }
      const json = (await res.json()) as { profile?: { notes?: string; tags?: string[] } }
      setProfile((prev) => (prev ? { ...prev, notes: json.profile?.notes ?? prev.notes, tags: json.profile?.tags ?? prev.tags } : prev))
      setNotesMessage({ type: 'success', text: 'Notes saved.' })
    } catch (saveError) {
      setNotesMessage({ type: 'error', text: saveError instanceof Error ? saveError.message : 'Failed to save notes.' })
    } finally {
      setSavingNotes(false)
    }
  }

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: User },
    { id: 'sessions' as Tab, label: 'Sessions', icon: Clock },
    { id: 'pages' as Tab, label: 'Pages Visited', icon: FileText },
    { id: 'time' as Tab, label: 'Time Spent', icon: Clock },
    { id: 'quotes' as Tab, label: 'Quote History', icon: FileText },
    { id: 'cart' as Tab, label: 'Cart & Wishlist', icon: ShoppingCart },
    { id: 'orders' as Tab, label: 'Orders', icon: Package },
    { id: 'payments' as Tab, label: 'Payments', icon: CreditCard },
    { id: 'files' as Tab, label: 'Files Uploaded', icon: Upload },
    { id: 'whatsapp' as Tab, label: 'WhatsApp Activity', icon: MessageSquare },
    { id: 'tickets' as Tab, label: 'Support Tickets', icon: Ticket },
    { id: 'notes' as Tab, label: 'Notes & Tags', icon: Tag },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-12 w-48" />
        <SkeletonBlock className="h-96 w-full" />
      </div>
    )
  }

  if (error) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-600">{error}</div>
  }

  const isLoading = (tab: Tab) => tabLoading === tab

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/admin/customers" className="mb-4 inline-flex items-center gap-2 text-sm text-[#6F7192] hover:text-[#0F1B3D]">
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </Link>
        <h1 className="mt-2 font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">
          {profile?.name || 'Customer Profile'}
        </h1>
        <p className="mt-2 text-sm text-[#6F7192]">{profile?.email || ''}</p>
      </motion.div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-[#6d28d9]/15 text-[#0F1B3D]'
                  : 'text-[#6F7192] hover:bg-gray-100 hover:text-[#0F1B3D]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* Overview Tab */}
          {activeTab === 'overview' && profile && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="mb-4 text-lg font-semibold text-[#0F1B3D]">Profile Information</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#6F7192]">Name</span>
                    <span className="text-[#0F1B3D]">{profile.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6F7192]">Email</span>
                    <span className="text-[#0F1B3D]">{profile.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6F7192]">Phone</span>
                    <span className="text-[#0F1B3D]">{profile.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6F7192]">WhatsApp</span>
                    <span className="text-[#0F1B3D]">{profile.whatsappNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6F7192]">City</span>
                    <span className="text-[#0F1B3D]">{profile.city || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6F7192]">State</span>
                    <span className="text-[#0F1B3D]">{profile.state || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6F7192]">Profession</span>
                    <span className="text-[#0F1B3D]">{profile.profession || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6F7192]">Total Spent</span>
                    <span className="text-[#0F1B3D]">₹{(profile.totalSpent || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6F7192]">Total Orders</span>
                    <span className="text-[#0F1B3D]">{profile.totalOrders || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6F7192]">Engagement Score</span>
                    <span className="text-[#0F1B3D]">{profile.engagementScore || 0}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="mb-4 text-lg font-semibold text-[#0F1B3D]">Quick Stats</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-white p-4">
                    <div className="text-xs text-[#6F7192]">Sessions</div>
                    <div className="mt-1 text-2xl font-bold text-[#0F1B3D]">{quickStats?.sessions ?? 0}</div>
                  </div>
                  <div className="rounded-xl bg-white p-4">
                    <div className="text-xs text-[#6F7192]">Page Views</div>
                    <div className="mt-1 text-2xl font-bold text-[#0F1B3D]">{quickStats?.pageViews ?? 0}</div>
                  </div>
                  <div className="rounded-xl bg-white p-4">
                    <div className="text-xs text-[#6F7192]">Quotes</div>
                    <div className="mt-1 text-2xl font-bold text-[#0F1B3D]">{quickStats?.quotes ?? 0}</div>
                  </div>
                  <div className="rounded-xl bg-white p-4">
                    <div className="text-xs text-[#6F7192]">Files Uploaded</div>
                    <div className="mt-1 text-2xl font-bold text-[#0F1B3D]">{quickStats?.files ?? 0}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-[#0F1B3D]">Session History</h2>
              {isLoading('sessions') ? (
                <SkeletonBlock className="h-40 w-full" />
              ) : !sessions || sessions.length === 0 ? (
                <div className="rounded-xl bg-white p-8 text-center text-sm text-[#6F7192]">
                  No sessions recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div key={session.id} className="rounded-xl bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-[#0F1B3D]">{session.sessionId}</div>
                          <div className="text-xs text-[#6F7192]">
                            {new Date(session.startedAt).toLocaleString()} · {session.device || 'Unknown device'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-[#0F1B3D]">{session.durationSeconds || 0}s</div>
                          <div className="text-xs text-[#6F7192]">{session.pageViewsCount || 0} pages</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pages Visited Tab */}
          {activeTab === 'pages' && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-[#0F1B3D]">Pages Visited</h2>
              {isLoading('pages') ? (
                <SkeletonBlock className="h-40 w-full" />
              ) : !pageViews || pageViews.length === 0 ? (
                <div className="rounded-xl bg-white p-8 text-center text-sm text-[#6F7192]">
                  No page views recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {pageViews.map((page) => (
                    <div key={page.id} className="rounded-xl bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-[#0F1B3D]">{page.pageTitle || page.pageUrl}</div>
                          <div className="text-xs text-[#6F7192]">
                            {new Date(page.enteredAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-[#0F1B3D]">{page.timeSpentSeconds || 0}s</div>
                          <div className="text-xs text-[#6F7192]">{page.scrollDepthPercent || 0}% scrolled</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Time Spent Tab */}
          {activeTab === 'time' && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-[#0F1B3D]">Time Spent Analysis</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-white p-4">
                  <div className="text-xs text-[#6F7192]">Total Time Spent</div>
                  <div className="mt-1 text-2xl font-bold text-[#0F1B3D]">{profile?.totalTimeSpent || '0h 0m'}</div>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <div className="text-xs text-[#6F7192]">Avg Session Duration</div>
                  <div className="mt-1 text-2xl font-bold text-[#0F1B3D]">{profile?.avgSessionDuration || '0m 0s'}</div>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <div className="text-xs text-[#6F7192]">Total Site Visits</div>
                  <div className="mt-1 text-2xl font-bold text-[#0F1B3D]">{profile?.totalSiteVisits || 0}</div>
                </div>
              </div>
            </div>
          )}

          {/* Quote History Tab */}
          {activeTab === 'quotes' && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-[#0F1B3D]">Quote History</h2>
              {isLoading('quotes') ? (
                <SkeletonBlock className="h-40 w-full" />
              ) : !quotes || quotes.length === 0 ? (
                <div className="rounded-xl bg-white p-8 text-center text-sm text-[#6F7192]">
                  No quotes created yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {quotes.map((quote) => (
                    <div key={quote.id} className="rounded-xl bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-[#0F1B3D]">{quote.quoteId}</div>
                          <div className="text-xs text-[#6F7192]">
                            {quote.material} · {quote.weightGrams || 0}g · ₹{quote.estimatedCost || 0}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                            quote.convertedToOrder ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {quote.convertedToOrder ? 'Converted' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cart & Wishlist Tab */}
          {activeTab === 'cart' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="mb-4 text-lg font-semibold text-[#0F1B3D]">Cart Items</h2>
                {isLoading('cart') ? (
                  <SkeletonBlock className="h-40 w-full" />
                ) : !carts || carts.length === 0 ? (
                  <div className="rounded-xl bg-white p-8 text-center text-sm text-[#6F7192]">
                    No cart items yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {carts.map((cart) => (
                      <div key={cart.id} className="rounded-xl bg-white p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-[#0F1B3D]">{cart.material}</div>
                            <div className="text-xs text-[#6F7192]">
                              {cart.weightGrams || 0}g · ₹{cart.estimatedCost || 0}
                            </div>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                            statusBadgeClass(
                              cart.status,
                              'bg-emerald-100 text-emerald-700',
                              'bg-rose-400/20 text-rose-400',
                              'bg-blue-100 text-blue-700',
                            )
                          }`}>
                            {cart.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Heart className="h-4 w-4 text-[#6F7192]" />
                  <h2 className="text-lg font-semibold text-[#0F1B3D]">Wishlist</h2>
                </div>
                {!wishlist || wishlist.length === 0 ? (
                  <div className="rounded-xl bg-white p-8 text-center text-sm text-[#6F7192]">
                    No wishlist items yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {wishlist.map((item) => (
                      <div key={item.id} className="rounded-xl bg-white p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-[#0F1B3D]">{item.productName || 'Product'}</div>
                            <div className="text-xs text-[#6F7192]">
                              {item.material} · ₹{item.price || 0}
                            </div>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                            item.ordered ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {item.ordered ? 'Ordered' : 'Wishlisted'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-[#0F1B3D]">Order History</h2>
              {!orders || orders.length === 0 ? (
                <div className="rounded-xl bg-white p-8 text-center text-sm text-[#6F7192]">
                  No orders placed yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="rounded-xl bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-[#0F1B3D]">{order.orderNumber}</div>
                          <div className="text-xs text-[#6F7192]">
                            {order.material} · {order.weightGrams || 0}g · ₹{order.amount || 0}
                          </div>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                          statusBadgeClass(
                            order.status,
                            'bg-emerald-100 text-emerald-700',
                            'bg-rose-400/20 text-rose-400',
                            'bg-yellow-100 text-yellow-700',
                          )
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-[#0F1B3D]">Payment History</h2>
              {isLoading('payments') ? (
                <SkeletonBlock className="h-40 w-full" />
              ) : !payments || payments.length === 0 ? (
                <div className="rounded-xl bg-white p-8 text-center text-sm text-[#6F7192]">
                  No payment data available.
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="rounded-xl bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-[#0F1B3D]">{payment.orderNumber}</div>
                          <div className="text-xs text-[#6F7192]">
                            ₹{((payment.amountPaise || 0) / 100).toLocaleString('en-IN')} · {payment.provider} ·{' '}
                            {payment.paymentMethod || '—'} · {new Date(payment.createdAt || '').toLocaleString()}
                          </div>
                          {payment.refundedAmountPaise ? (
                            <div className="mt-1 text-xs text-rose-500">
                              Refunded: ₹{(payment.refundedAmountPaise / 100).toLocaleString('en-IN')}
                            </div>
                          ) : null}
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                          statusBadgeClass(
                            payment.status,
                            'bg-emerald-100 text-emerald-700',
                            'bg-rose-400/20 text-rose-400',
                            'bg-yellow-100 text-yellow-700',
                          )
                        }`}>
                          {payment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Files Uploaded Tab */}
          {activeTab === 'files' && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-[#0F1B3D]">Files Uploaded</h2>
              {!files || files.length === 0 ? (
                <div className="rounded-xl bg-white p-8 text-center text-sm text-[#6F7192]">
                  No files uploaded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {files.map((file, index) => (
                    <div key={index} className="rounded-xl bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-[#0F1B3D]">{file.name}</div>
                          <div className="text-xs text-[#6F7192]">
                            {file.size ? `${(file.size / 1024).toFixed(2)} KB` : 'Size unknown'} · Uploaded {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : 'Unknown date'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* WhatsApp Activity Tab */}
          {activeTab === 'whatsapp' && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-[#0F1B3D]">WhatsApp Activity</h2>
              {isLoading('whatsapp') ? (
                <SkeletonBlock className="h-40 w-full" />
              ) : !whatsappMessages || whatsappMessages.length === 0 ? (
                <div className="rounded-xl bg-white p-8 text-center text-sm text-[#6F7192]">
                  No WhatsApp messages yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {whatsappMessages.map((msg) => (
                    <div key={msg.id} className="rounded-xl bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-[#0F1B3D]">
                            {msg.direction === 'outbound' ? 'Sent' : 'Received'}
                          </div>
                          <div className="text-xs text-[#6F7192]">
                            {msg.messageText || 'No message content'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-[#6F7192]">
                            {new Date(msg.createdAt).toLocaleString()}
                          </div>
                          {msg.automated && (
                            <span className="rounded-full bg-blue-400/20 px-2 py-1 text-[10px] text-blue-400">
                              Automated
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Support Tickets Tab */}
          {activeTab === 'tickets' && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-[#0F1B3D]">Support Tickets</h2>
              {isLoading('tickets') ? (
                <SkeletonBlock className="h-40 w-full" />
              ) : !supportTickets || supportTickets.length === 0 ? (
                <div className="rounded-xl bg-white p-8 text-center text-sm text-[#6F7192]">
                  No support tickets raised yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {supportTickets.map((ticket) => (
                    <div key={ticket.id} className="rounded-xl bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-[#0F1B3D]">{ticket.ticketId}</div>
                          <div className="text-xs text-[#6F7192]">
                            {ticket.subject} · {ticket.category}
                          </div>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                          statusBadgeClass(
                            ticket.status,
                            'bg-emerald-100 text-emerald-700',
                            'bg-rose-400/20 text-rose-400',
                            'bg-yellow-100 text-yellow-700',
                          )
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes & Tags Tab */}
          {activeTab === 'notes' && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-[#0F1B3D]">Notes & Tags</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#6F7192]">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {tagsInput.split(',').map((tag) => tag.trim()).filter(Boolean).map((tag: string, index: number) => (
                      <span key={index} className="rounded-full bg-[#6d28d9]/20 px-3 py-1 text-xs text-[#6d28d9]">
                        {tag}
                      </span>
                    ))}
                    {tagsInput.split(',').map((t) => t.trim()).filter(Boolean).length === 0 && (
                      <span className="text-sm text-[#6F7192]">No tags added yet.</span>
                    )}
                  </div>
                  <input
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="Comma-separated tags (e.g. VIP, wholesale, repeat)"
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#0F1B3D] placeholder-[#5a6580] outline-none transition focus:border-[#6d28d9]/50"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#6F7192]">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#0F1B3D] placeholder-[#5a6580] outline-none transition focus:border-[#6d28d9]/50"
                    rows={4}
                    placeholder="Add notes about this customer..."
                  />
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void saveNotes()}
                      disabled={savingNotes}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-2 text-sm font-medium text-[#0F1B3D] transition hover:opacity-90 disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" />
                      {savingNotes ? 'Saving...' : 'Save Notes'}
                    </button>
                    {notesMessage && (
                      <span className={`text-sm ${notesMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {notesMessage.text}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}