'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Percent, Calendar, Tag, Eye, EyeOff, Pencil, Trash2, IndianRupee, Ticket } from 'lucide-react'
import { logSearch } from '@/lib/tracking/searchLogger'

type Coupon = {
  id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed_amount' | 'free_shipping'
  discount_value: number
  max_discount: number | null
  min_order_value: number
  starts_at: string
  expires_at: string
  is_active: boolean
  usage_limit: number | null
  usage_per_user: number | null
  used_count: number
  first_order_only: boolean
  created_at: string
}

function getStatus(c: Coupon) {
  const now = new Date()
  const start = new Date(c.starts_at)
  const end = new Date(c.expires_at)
  if (!c.is_active) return { label: 'Disabled', color: 'text-[#6F7192] bg-[rgba(111,113,146,0.1)] border-[rgba(111,113,146,0.2)]' }
  if (now < start) return { label: 'Scheduled', color: 'text-[#F59E0B] bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.2)]' }
  if (now > end) return { label: 'Expired', color: 'text-[#EF4444] bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.2)]' }
  return { label: 'Active', color: 'text-[#10B981] bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.2)]' }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function CouponsList() {
  const router = useRouter()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/admin/coupons')
      .then(r => r.json())
      .then(d => { setCoupons(d.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = coupons.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.code.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
  })

  useEffect(() => {
    if (!search.trim()) return

    const timeout = window.setTimeout(() => {
      void logSearch(null, search.trim(), {
        area: 'admin_coupons',
      }, filtered.length).catch(() => {})
    }, 500)

    return () => window.clearTimeout(timeout)
  }, [filtered.length, search])

  async function toggleStatus(id: string, current: boolean) {
    await fetch(`/api/admin/coupons/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: !current } : c))
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this coupon?')) return
    await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' })
    setCoupons(prev => prev.filter(c => c.id !== id))
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
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-[#0F1B3D]">Coupon Codes</h2>
          <p className="text-sm text-[#6F7192] mt-0.5">Create and manage discount coupon codes</p>
        </div>
        <button
          onClick={() => router.push('/admin/coupons/new')}
          className="inline-flex items-center gap-2 bg-[#6d28d9] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#4c1d95] transition-all min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          New Coupon
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6F7192]" />
        <input
          type="text"
          placeholder="Search coupons..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgba(109, 40, 217,0.2)] bg-white text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9] transition-colors"
        />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Ticket className="mx-auto w-12 h-12 text-[#6F7192] mb-4" />
            <p className="text-[#6F7192]">No coupons found</p>
          </div>
        )}
        {filtered.map(coupon => {
          const status = getStatus(coupon)
          return (
            <div
              key={coupon.id}
              className="group bg-white rounded-2xl border border-[rgba(109, 40, 217,0.15)] p-5 hover:border-[rgba(109, 40, 217,0.3)] hover:shadow-[0_4px_20px_rgba(109, 40, 217,0.06)] transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <code className="font-mono text-lg font-bold text-[#6d28d9] bg-[rgba(109, 40, 217,0.08)] px-3 py-1 rounded-lg">{coupon.code}</code>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${status.color}`}>
                      {status.label}
                    </span>
                    {coupon.first_order_only && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-[#F59E0B] bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)]">
                        First Order Only
                      </span>
                    )}
                  </div>
                  {coupon.description && (
                    <p className="text-sm text-[#6F7192] mb-2">{coupon.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6F7192]">
                    <span className="inline-flex items-center gap-1">
                      <Percent className="w-3 h-3" />
                      {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% Off` : coupon.discount_type === 'fixed_amount' ? `₹${coupon.discount_value} Off` : 'Free Shipping'}
                      {coupon.max_discount && ` (max ₹${coupon.max_discount})`}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(coupon.starts_at)} — {formatDate(coupon.expires_at)}
                    </span>
                    {coupon.min_order_value > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <IndianRupee className="w-3 h-3" />
                        Min: ₹{coupon.min_order_value}
                      </span>
                    )}
                    {coupon.usage_limit && (
                      <span className="inline-flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        Used: {coupon.used_count}/{coupon.usage_limit}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleStatus(coupon.id, coupon.is_active)}
                    className="p-2 rounded-lg border border-[rgba(109, 40, 217,0.15)] text-[#6F7192] hover:text-[#6d28d9] hover:border-[rgba(109, 40, 217,0.3)] transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title={coupon.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {coupon.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => router.push(`/admin/coupons/${coupon.id}`)}
                    className="p-2 rounded-lg border border-[rgba(109, 40, 217,0.15)] text-[#6F7192] hover:text-[#6d28d9] hover:border-[rgba(109, 40, 217,0.3)] transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(coupon.id)}
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