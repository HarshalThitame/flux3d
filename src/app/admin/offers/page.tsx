'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Percent, Calendar, Tag, Eye, EyeOff, Pencil, Trash2, IndianRupee, Gift, TicketCheck, BadgeIndianRupee } from 'lucide-react'
import { logSearch } from '@/lib/tracking/searchLogger'

type OfferStats = {
  total_redemptions: number
  total_discount_given: number
  total_revenue_from_offers: number
  recent: Array<Record<string, unknown>>
}

type Offer = {
  id: string
  title: string
  description: string | null
  offer_type: 'percentage' | 'fixed_amount' | 'free_shipping' | 'buy_x_get_y'
  discount_value: number
  max_discount: number | null
  min_order_value: number
  starts_at: string
  ends_at: string
  is_active: boolean
  is_featured: boolean
  coupon_code: string | null
  usage_limit: number | null
  usage_per_user: number | null
  used_count: number
  badge_text: string | null
  sale_label: string | null
  created_at: string
}

function getStatus(offer: Offer) {
  const now = new Date()
  const start = new Date(offer.starts_at)
  const end = new Date(offer.ends_at)
  if (!offer.is_active) return { label: 'Disabled', color: 'text-[#6F7192] bg-[rgba(111,113,146,0.1)] border-[rgba(111,113,146,0.2)]' }
  if (now < start) return { label: 'Scheduled', color: 'text-[#F59E0B] bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.2)]' }
  if (now > end) return { label: 'Expired', color: 'text-[#EF4444] bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.2)]' }
  return { label: 'Active', color: 'text-[#10B981] bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.2)]' }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminOffersPage() {
  const router = useRouter()
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'scheduled' | 'expired' | 'disabled'>('all')
  const [stats, setStats] = useState<OfferStats | null>(null)

  useEffect(() => {
    fetch('/api/admin/offers')
      .then(r => r.json())
      .then(d => { setOffers(d.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
    fetch('/api/admin/offers/stats')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setStats(d))
      .catch(() => {})
  }, [])

  const now = new Date()

  const filtered = offers.filter(o => {
    const start = new Date(o.starts_at)
    const end = new Date(o.ends_at)
    const match = filter === 'all'
      || (filter === 'active' && o.is_active && now >= start && now <= end)
      || (filter === 'scheduled' && o.is_active && now < start)
      || (filter === 'expired' && o.is_active && now > end)
      || (filter === 'disabled' && !o.is_active)
    if (!match) return false
    if (search && !o.title.toLowerCase().includes(search.toLowerCase()) && !o.badge_text?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  useEffect(() => {
    const hasTrackingValue = search.trim().length > 0 || filter !== 'all'
    if (!hasTrackingValue) return

    const timeout = window.setTimeout(() => {
      void logSearch(null, search.trim() || null, {
        area: 'admin_offers',
        filter,
      }, filtered.length).catch(() => {})
    }, 500)

    return () => window.clearTimeout(timeout)
  }, [filter, filtered.length, search])

  async function toggleStatus(id: string, current: boolean) {
    await fetch(`/api/admin/offers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    setOffers(prev => prev.map(o => o.id === id ? { ...o, is_active: !current } : o))
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this offer?')) return
    await fetch(`/api/admin/offers/${id}`, { method: 'DELETE' })
    setOffers(prev => prev.filter(o => o.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-[#6d28d9] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1B3D]">Offers & Promotions</h1>
          <p className="text-sm text-[#6F7192] mt-1">Manage sales, discounts, and festival campaigns</p>
        </div>
        <button
          onClick={() => router.push('/admin/offers/new')}
          className="inline-flex items-center gap-2 bg-[#6d28d9] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#4c1d95] transition-all min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          New Offer
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6F7192]" />
          <input
            type="text"
            placeholder="Search offers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgba(109, 40, 217,0.2)] bg-white text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9] transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'active', 'scheduled', 'expired', 'disabled'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-medium capitalize transition-all min-h-[36px] ${
                filter === f
                  ? 'bg-[#6d28d9] text-white'
                  : 'bg-white border border-[rgba(109, 40, 217,0.2)] text-[#6F7192] hover:border-[rgba(109, 40, 217,0.4)]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <div className="rounded-2xl border border-[rgba(109,40,217,0.15)] bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.15em] text-[#6F7192]">Total Redemptions</div>
              <TicketCheck className="h-4 w-4 text-[#6d28d9]" />
            </div>
            <div className="mt-2 text-2xl font-bold text-[#0F1B3D]">{stats.total_redemptions.toLocaleString('en-IN')}</div>
          </div>
          <div className="rounded-2xl border border-[rgba(109,40,217,0.15)] bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.15em] text-[#6F7192]">Discount Given</div>
              <IndianRupee className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-[#0F1B3D]">₹{stats.total_discount_given.toLocaleString('en-IN')}</div>
          </div>
          <div className="rounded-2xl border border-[rgba(109,40,217,0.15)] bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.15em] text-[#6F7192]">Revenue via Offers</div>
              <BadgeIndianRupee className="h-4 w-4 text-[#6d28d9]" />
            </div>
            <div className="mt-2 text-2xl font-bold text-[#0F1B3D]">₹{stats.total_revenue_from_offers.toLocaleString('en-IN')}</div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Gift className="mx-auto w-12 h-12 text-[#6F7192] mb-4" />
            <p className="text-[#6F7192]">No offers found</p>
          </div>
        )}
        {filtered.map(offer => {
          const status = getStatus(offer)
          return (
            <div
              key={offer.id}
              className="group bg-white rounded-2xl border border-[rgba(109, 40, 217,0.15)] p-5 hover:border-[rgba(109, 40, 217,0.3)] hover:shadow-[0_4px_20px_rgba(109, 40, 217,0.06)] transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-[#0F1B3D] truncate">{offer.title}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${status.color}`}>
                      {status.label}
                    </span>
                    {offer.is_featured && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-[#6d28d9] bg-[rgba(109, 40, 217,0.1)] border border-[rgba(109, 40, 217,0.2)]">
                        Featured
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6F7192]">
                    <span className="inline-flex items-center gap-1">
                      <Percent className="w-3 h-3" />
                      {offer.offer_type === 'percentage' ? `${offer.discount_value}% Off` : offer.offer_type === 'fixed_amount' ? `₹${offer.discount_value} Off` : offer.offer_type === 'free_shipping' ? 'Free Shipping' : offer.offer_type}
                      {offer.max_discount && ` (max ₹${offer.max_discount})`}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(offer.starts_at)} — {formatDate(offer.ends_at)}
                    </span>
                    {offer.min_order_value > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <IndianRupee className="w-3 h-3" />
                        Min: ₹{offer.min_order_value}
                      </span>
                    )}
                    {offer.usage_limit && (
                      <span className="inline-flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        Used: {offer.used_count}/{offer.usage_limit}
                      </span>
                    )}
                    {offer.badge_text && (
                      <span className="px-2 py-0.5 rounded-full bg-[rgba(109, 40, 217,0.08)] text-[#6d28d9]">
                        {offer.badge_text}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleStatus(offer.id, offer.is_active)}
                    className="p-2 rounded-lg border border-[rgba(109, 40, 217,0.15)] text-[#6F7192] hover:text-[#6d28d9] hover:border-[rgba(109, 40, 217,0.3)] transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title={offer.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {offer.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => router.push(`/admin/offers/${offer.id}`)}
                    className="p-2 rounded-lg border border-[rgba(109, 40, 217,0.15)] text-[#6F7192] hover:text-[#6d28d9] hover:border-[rgba(109, 40, 217,0.3)] transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(offer.id)}
                    className="p-2 rounded-lg border border-[rgba(239,68,68,0.15)] text-[#EF4444] hover:bg-[rgba(239,68,68,0.05)] transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
