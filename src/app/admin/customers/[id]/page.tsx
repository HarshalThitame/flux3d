'use client'

import { useEffect, useState } from 'react'
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
import { InputField } from '@/components/admin/FormField'

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

type CustomerProfileResponse = {
  profile?: CustomerProfile
  sessions?: CustomerSession[]
  pageViews?: CustomerPageView[]
  quotes?: CustomerQuote[]
  carts?: CustomerCart[]
  orders?: CustomerOrder[]
  files?: CustomerFile[]
  whatsappMessages?: CustomerWhatsAppMessage[]
  supportTickets?: CustomerSupportTicket[]
}

export default function CustomerProfilePage() {
  const params = useParams<{ id: string }>()
  const customerId = params?.id ?? ''

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [sessions, setSessions] = useState<CustomerSession[] | null>(null)
  const [pageViews, setPageViews] = useState<CustomerPageView[] | null>(null)
  const [quotes, setQuotes] = useState<CustomerQuote[] | null>(null)
  const [carts, setCarts] = useState<CustomerCart[] | null>(null)
  const [orders, setOrders] = useState<CustomerOrder[] | null>(null)
  const [files, setFiles] = useState<CustomerFile[] | null>(null)
  const [whatsappMessages, setWhatsappMessages] = useState<CustomerWhatsAppMessage[] | null>(null)
  const [supportTickets, setSupportTickets] = useState<CustomerSupportTicket[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
          setSessions(json.sessions || [])
          setPageViews(json.pageViews || [])
          setQuotes(json.quotes || [])
          setCarts(json.carts || [])
          setOrders(json.orders || [])
          setFiles(json.files || [])
          setWhatsappMessages(json.whatsappMessages || [])
          setSupportTickets(json.supportTickets || [])
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
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-[#7C5CFF]/15 text-[#0F1B3D]'
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
                    <div className="mt-1 text-2xl font-bold text-[#0F1B3D]">{sessions?.length || 0}</div>
                  </div>
                  <div className="rounded-xl bg-white p-4">
                    <div className="text-xs text-[#6F7192]">Page Views</div>
                    <div className="mt-1 text-2xl font-bold text-[#0F1B3D]">{pageViews?.length || 0}</div>
                  </div>
                  <div className="rounded-xl bg-white p-4">
                    <div className="text-xs text-[#6F7192]">Quotes</div>
                    <div className="mt-1 text-2xl font-bold text-[#0F1B3D]">{quotes?.length || 0}</div>
                  </div>
                  <div className="rounded-xl bg-white p-4">
                    <div className="text-xs text-[#6F7192]">Files Uploaded</div>
                    <div className="mt-1 text-2xl font-bold text-[#0F1B3D]">{files?.length || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-[#0F1B3D]">Session History</h2>
              {!sessions || sessions.length === 0 ? (
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
              {!pageViews || pageViews.length === 0 ? (
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
              <h2 className="mb-4 text-lg font-semold text-[#0F1B3D]">Time Spent Analysis</h2>
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
              {!quotes || quotes.length === 0 ? (
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
                {!carts || carts.length === 0 ? (
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
                            cart.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                            cart.status === 'abandoned' ? 'bg-rose-400/20 text-rose-400' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {cart.status}
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
                          order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                          order.status === 'cancelled' ? 'bg-rose-400/20 text-rose-400' :
                          'bg-yellow-100 text-yellow-700'
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
              <div className="rounded-xl bg-white p-8 text-center text-sm text-[#6F7192]">
                No payment data available.
              </div>
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
              {!whatsappMessages || whatsappMessages.length === 0 ? (
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
              {!supportTickets || supportTickets.length === 0 ? (
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
                          ticket.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                          ticket.status === 'open' ? 'bg-rose-400/20 text-rose-400' :
                          'bg-yellow-100 text-yellow-700'
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
                    {(profile?.tags || []).map((tag: string, index: number) => (
                      <span key={index} className="rounded-full bg-[#7C5CFF]/20 px-3 py-1 text-xs text-[#7C5CFF]">
                        {tag}
                      </span>
                    ))}
                    {(!profile?.tags || profile.tags.length === 0) && (
                      <span className="text-sm text-[#6F7192]">No tags added yet.</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#6F7192]">Notes</label>
                  <textarea
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#0F1B3D] placeholder-[#5a6580] outline-none transition focus:border-[#7C5CFF]/50"
                    rows={4}
                    placeholder="Add notes about this customer..."
                    defaultValue={profile?.notes || ''}
                  />
                  <button className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#7C5CFF] px-4 py-2 text-sm font-medium text-[#0F1B3D] transition hover:opacity-90">
                    <Save className="h-4 w-4" />
                    Save Notes
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
