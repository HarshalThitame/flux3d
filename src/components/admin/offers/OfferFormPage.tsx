'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'

type OfferForm = {
  title: string
  description: string
  banner_url: string
  offer_type: 'percentage' | 'fixed_amount' | 'free_shipping' | 'buy_x_get_y'
  discount_value: number
  max_discount: number
  min_order_value: number
  starts_at: string
  ends_at: string
  is_active: boolean
  is_featured: boolean
  auto_apply: boolean
  coupon_code: string
  usage_limit: number
  usage_per_user: number
  badge_text: string
  badge_color: string
  sale_label: string
  applicable_categories: string
  applicable_materials: string
  applicable_products: string
}

const emptyForm: OfferForm = {
  title: '',
  description: '',
  banner_url: '',
  offer_type: 'percentage',
  discount_value: 0,
  max_discount: 0,
  min_order_value: 0,
  starts_at: '',
  ends_at: '',
  is_active: true,
  is_featured: false,
  auto_apply: false,
  coupon_code: '',
  usage_limit: 0,
  usage_per_user: 0,
  badge_text: '',
  badge_color: 'from-[#6d28d9] to-[#a855f7]',
  sale_label: '',
  applicable_categories: '',
  applicable_materials: '',
  applicable_products: '',
}

export default function OfferFormPage({ offerId }: { offerId: string }) {
  const router = useRouter()
  const isNew = offerId === 'new'
  const [form, setForm] = useState<OfferForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!isNew)

  useEffect(() => {
    if (isNew) return
    fetch(`/api/admin/offers/${offerId}`)
      .then(r => r.json())
      .then(d => {
        const o = d.data
        setForm({
          title: o.title ?? '',
          description: o.description ?? '',
          banner_url: o.banner_url ?? '',
          offer_type: o.offer_type ?? 'percentage',
          discount_value: o.discount_value ?? 0,
          max_discount: o.max_discount ?? 0,
          min_order_value: o.min_order_value ?? 0,
          starts_at: o.starts_at ? new Date(o.starts_at).toISOString().slice(0, 16) : '',
          ends_at: o.ends_at ? new Date(o.ends_at).toISOString().slice(0, 16) : '',
          is_active: o.is_active ?? true,
          is_featured: o.is_featured ?? false,
          auto_apply: o.auto_apply ?? false,
          coupon_code: o.coupon_code ?? '',
          usage_limit: o.usage_limit ?? 0,
          usage_per_user: o.usage_per_user ?? 0,
          badge_text: o.badge_text ?? '',
          badge_color: o.badge_color ?? 'from-[#6d28d9] to-[#a855f7]',
          sale_label: o.sale_label ?? '',
          applicable_categories: (o.applicable_categories ?? []).join(', '),
          applicable_materials: (o.applicable_materials ?? []).join(', '),
          applicable_products: (o.applicable_products ?? []).join(', '),
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [offerId, isNew])

  const update = useCallback((key: keyof OfferForm, value: string | number | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  async function handleSave() {
    setSaving(true)
    const body = {
      ...form,
      max_discount: form.max_discount || null,
      usage_limit: form.usage_limit || null,
      usage_per_user: form.usage_per_user || null,
      coupon_code: form.coupon_code || null,
      banner_url: form.banner_url || null,
      badge_text: form.badge_text || null,
      sale_label: form.sale_label || null,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      applicable_categories: form.applicable_categories ? form.applicable_categories.split(',').map(s => s.trim()).filter(Boolean) : null,
      applicable_materials: form.applicable_materials ? form.applicable_materials.split(',').map(s => s.trim()).filter(Boolean) : null,
      applicable_products: form.applicable_products ? form.applicable_products.split(',').map(s => s.trim()).filter(Boolean) : null,
    }

    try {
      const res = await fetch(isNew ? '/api/admin/offers' : `/api/admin/offers/${offerId}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to save')
      router.push('/admin/promotions?tab=offers')
    } catch {
      alert('Failed to save offer')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-[#6d28d9] border-t-transparent animate-spin" />
      </div>
    )
  }

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-[rgba(109, 40, 217,0.2)] bg-white text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9] transition-colors"
  const labelClass = "block text-sm font-medium text-[#0F1B3D] mb-1.5"
  const rowClass = "grid grid-cols-1 sm:grid-cols-2 gap-4"

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-[#6F7192] hover:text-[#6d28d9] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-[#0F1B3D]">{isNew ? 'New Offer' : 'Edit Offer'}</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-[#6d28d9] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#4c1d95] disabled:opacity-50 transition-all min-h-[44px]"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Offer'}
        </button>
      </div>

      <div className="space-y-6 max-w-3xl">
        <div>
          <label className={labelClass}>Title *</label>
          <input type="text" value={form.title} onChange={e => update('title', e.target.value)} className={inputClass} placeholder="e.g. Diwali Sale 2026" />
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea value={form.description} onChange={e => update('description', e.target.value)} className={inputClass} rows={3} placeholder="Offer description..." />
        </div>

        <div className={rowClass}>
          <div>
            <label className={labelClass}>Offer Type</label>
            <select value={form.offer_type} onChange={e => update('offer_type', e.target.value)} className={inputClass}>
              <option value="percentage">Percentage Discount</option>
              <option value="fixed_amount">Fixed Amount Off</option>
              <option value="free_shipping">Free Shipping</option>
              <option value="buy_x_get_y">Buy X Get Y</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Discount Value *</label>
            <input type="number" value={form.discount_value} onChange={e => update('discount_value', Number(e.target.value))} className={inputClass} min={0} />
          </div>
        </div>

        <div className={rowClass}>
          <div>
            <label className={labelClass}>Max Discount (cap)</label>
            <input type="number" value={form.max_discount} onChange={e => update('max_discount', Number(e.target.value))} className={inputClass} min={0} />
          </div>
          <div>
            <label className={labelClass}>Min Order Value</label>
            <input type="number" value={form.min_order_value} onChange={e => update('min_order_value', Number(e.target.value))} className={inputClass} min={0} />
          </div>
        </div>

        <div className={rowClass}>
          <div>
            <label className={labelClass}>Start Date *</label>
            <input type="datetime-local" value={form.starts_at} onChange={e => update('starts_at', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>End Date *</label>
            <input type="datetime-local" value={form.ends_at} onChange={e => update('ends_at', e.target.value)} className={inputClass} />
          </div>
        </div>

        <fieldset className="border border-[rgba(109, 40, 217,0.15)] rounded-2xl p-5">
          <legend className="text-sm font-semibold text-[#0F1B3D] px-2">Display Settings</legend>
          <div className="space-y-4">
            <div className={rowClass}>
              <div>
                <label className={labelClass}>Badge Text</label>
                <input type="text" value={form.badge_text} onChange={e => update('badge_text', e.target.value)} className={inputClass} placeholder="e.g. Diwali Sale" />
              </div>
              <div>
                <label className={labelClass}>Sale Label</label>
                <input type="text" value={form.sale_label} onChange={e => update('sale_label', e.target.value)} className={inputClass} placeholder="e.g. 20% Off" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Banner Image URL</label>
              <input type="text" value={form.banner_url} onChange={e => update('banner_url', e.target.value)} className={inputClass} placeholder="https://..." />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-[#0F1B3D] cursor-pointer">
                <input type="checkbox" checked={form.is_featured} onChange={e => update('is_featured', e.target.checked)} className="rounded border-[rgba(109, 40, 217,0.3)] text-[#6d28d9]" />
                Show on homepage banner
              </label>
              <label className="flex items-center gap-2 text-sm text-[#0F1B3D] cursor-pointer">
                <input type="checkbox" checked={form.auto_apply} onChange={e => update('auto_apply', e.target.checked)} className="rounded border-[rgba(109, 40, 217,0.3)] text-[#6d28d9]" />
                Auto-apply to all carts
              </label>
              <label className="flex items-center gap-2 text-sm text-[#0F1B3D] cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => update('is_active', e.target.checked)} className="rounded border-[rgba(109, 40, 217,0.3)] text-[#6d28d9]" />
                Active
              </label>
            </div>
          </div>
        </fieldset>

        <fieldset className="border border-[rgba(109, 40, 217,0.15)] rounded-2xl p-5">
          <legend className="text-sm font-semibold text-[#0F1B3D] px-2">Coupon & Limits</legend>
          <div className="space-y-4">
            <div className={rowClass}>
              <div>
                <label className={labelClass}>Coupon Code (optional)</label>
                <input type="text" value={form.coupon_code} onChange={e => update('coupon_code', e.target.value.toUpperCase())} className={inputClass} placeholder="DIWALI20" />
              </div>
              <div>
                <label className={labelClass}>Sale Label (optional)</label>
                <input type="text" value={form.sale_label} onChange={e => update('sale_label', e.target.value)} className={inputClass} placeholder="e.g. 20% Off" />
              </div>
            </div>
            <div className={rowClass}>
              <div>
                <label className={labelClass}>Usage Limit (global)</label>
                <input type="number" value={form.usage_limit} onChange={e => update('usage_limit', Number(e.target.value))} className={inputClass} min={0} />
              </div>
              <div>
                <label className={labelClass}>Usage Per User</label>
                <input type="number" value={form.usage_per_user} onChange={e => update('usage_per_user', Number(e.target.value))} className={inputClass} min={0} />
              </div>
            </div>
          </div>
        </fieldset>

        <fieldset className="border border-[rgba(109, 40, 217,0.15)] rounded-2xl p-5">
          <legend className="text-sm font-semibold text-[#0F1B3D] px-2">Applicability</legend>
          <p className="text-xs text-[#6F7192] mb-3">Leave empty to apply to all. Separate values with commas.</p>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Categories</label>
              <input type="text" value={form.applicable_categories} onChange={e => update('applicable_categories', e.target.value)} className={inputClass} placeholder="Prototypes, Machine Parts, ..." />
            </div>
            <div className={rowClass}>
              <div>
                <label className={labelClass}>Materials</label>
                <input type="text" value={form.applicable_materials} onChange={e => update('applicable_materials', e.target.value)} className={inputClass} placeholder="PLA, PETG, ABS, ..." />
              </div>
              <div>
                <label className={labelClass}>Products</label>
                <input type="text" value={form.applicable_products} onChange={e => update('applicable_products', e.target.value)} className={inputClass} placeholder="Product IDs..." />
              </div>
            </div>
          </div>
        </fieldset>
      </div>
    </div>
  )
}
