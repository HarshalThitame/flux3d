'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'

type CouponForm = {
  code: string
  description: string
  discount_type: 'percentage' | 'fixed_amount' | 'free_shipping'
  discount_value: number
  max_discount: number
  min_order_value: number
  starts_at: string
  expires_at: string
  is_active: boolean
  usage_limit: number
  usage_per_user: number
  first_order_only: boolean
  applicable_categories: string
  applicable_materials: string
  applicable_products: string
}

const emptyForm: CouponForm = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 0,
  max_discount: 0,
  min_order_value: 0,
  starts_at: '',
  expires_at: '',
  is_active: true,
  usage_limit: 0,
  usage_per_user: 0,
  first_order_only: false,
  applicable_categories: '',
  applicable_materials: '',
  applicable_products: '',
}

export default function CouponFormPage({ couponId }: { couponId: string }) {
  const router = useRouter()
  const isNew = couponId === 'new'
  const [form, setForm] = useState<CouponForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!isNew)

  useEffect(() => {
    if (isNew) return
    fetch(`/api/admin/coupons/${couponId}`)
      .then(r => r.json())
      .then(d => {
        const c = d.data
        setForm({
          code: c.code ?? '',
          description: c.description ?? '',
          discount_type: c.discount_type ?? 'percentage',
          discount_value: c.discount_value ?? 0,
          max_discount: c.max_discount ?? 0,
          min_order_value: c.min_order_value ?? 0,
          starts_at: c.starts_at ? new Date(c.starts_at).toISOString().slice(0, 16) : '',
          expires_at: c.expires_at ? new Date(c.expires_at).toISOString().slice(0, 16) : '',
          is_active: c.is_active ?? true,
          usage_limit: c.usage_limit ?? 0,
          usage_per_user: c.usage_per_user ?? 0,
          first_order_only: c.first_order_only ?? false,
          applicable_categories: (c.applicable_categories ?? []).join(', '),
          applicable_materials: (c.applicable_materials ?? []).join(', '),
          applicable_products: (c.applicable_products ?? []).join(', '),
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [couponId, isNew])

  const update = useCallback((key: keyof CouponForm, value: string | number | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  async function handleSave() {
    setSaving(true)
    const body = {
      ...form,
      max_discount: form.max_discount || null,
      usage_limit: form.usage_limit || null,
      usage_per_user: form.usage_per_user || null,
      starts_at: new Date(form.starts_at).toISOString(),
      expires_at: new Date(form.expires_at).toISOString(),
      applicable_categories: form.applicable_categories ? form.applicable_categories.split(',').map(s => s.trim()).filter(Boolean) : null,
      applicable_materials: form.applicable_materials ? form.applicable_materials.split(',').map(s => s.trim()).filter(Boolean) : null,
      applicable_products: form.applicable_products ? form.applicable_products.split(',').map(s => s.trim()).filter(Boolean) : null,
    }

    try {
      const res = await fetch(isNew ? '/api/admin/coupons' : `/api/admin/coupons/${couponId}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to save')
      router.push('/admin/promotions?tab=coupons')
    } catch {
      alert('Failed to save coupon')
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
        <h1 className="text-2xl font-bold text-[#0F1B3D]">{isNew ? 'New Coupon' : 'Edit Coupon'}</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-[#6d28d9] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#4c1d95] disabled:opacity-50 transition-all min-h-[44px]"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Coupon'}
        </button>
      </div>

      <div className="space-y-6 max-w-3xl">
        <div className={rowClass}>
          <div>
            <label className={labelClass}>Coupon Code *</label>
            <input type="text" value={form.code} onChange={e => update('code', e.target.value.toUpperCase())} className={inputClass} placeholder="SAVE20" />
          </div>
          <div>
            <label className={labelClass}>Discount Type</label>
            <select value={form.discount_type} onChange={e => update('discount_type', e.target.value)} className={inputClass}>
              <option value="percentage">Percentage Discount</option>
              <option value="fixed_amount">Fixed Amount Off</option>
              <option value="free_shipping">Free Shipping</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea value={form.description} onChange={e => update('description', e.target.value)} className={inputClass} rows={2} placeholder="Coupon description..." />
        </div>

        <div className={rowClass}>
          <div>
            <label className={labelClass}>Discount Value *</label>
            <input type="number" value={form.discount_value} onChange={e => update('discount_value', Number(e.target.value))} className={inputClass} min={0} />
          </div>
          <div>
            <label className={labelClass}>Max Discount (cap)</label>
            <input type="number" value={form.max_discount} onChange={e => update('max_discount', Number(e.target.value))} className={inputClass} min={0} />
          </div>
        </div>

        <div className={rowClass}>
          <div>
            <label className={labelClass}>Min Order Value</label>
            <input type="number" value={form.min_order_value} onChange={e => update('min_order_value', Number(e.target.value))} className={inputClass} min={0} />
          </div>
          <div>
            <label className={labelClass}>Usage Limit (global)</label>
            <input type="number" value={form.usage_limit} onChange={e => update('usage_limit', Number(e.target.value))} className={inputClass} min={0} />
          </div>
        </div>

        <div className={rowClass}>
          <div>
            <label className={labelClass}>Usage Per User</label>
            <input type="number" value={form.usage_per_user} onChange={e => update('usage_per_user', Number(e.target.value))} className={inputClass} min={0} />
          </div>
          <div className="flex items-center pt-6">
            <label className="flex items-center gap-2 text-sm text-[#0F1B3D] cursor-pointer">
              <input type="checkbox" checked={form.first_order_only} onChange={e => update('first_order_only', e.target.checked)} className="rounded border-[rgba(109, 40, 217,0.3)] text-[#6d28d9]" />
              First Order Only
            </label>
          </div>
        </div>

        <div className={rowClass}>
          <div>
            <label className={labelClass}>Start Date *</label>
            <input type="datetime-local" value={form.starts_at} onChange={e => update('starts_at', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Expiry Date *</label>
            <input type="datetime-local" value={form.expires_at} onChange={e => update('expires_at', e.target.value)} className={inputClass} />
          </div>
        </div>

        <fieldset className="border border-[rgba(109, 40, 217,0.15)] rounded-2xl p-5">
          <legend className="text-sm font-semibold text-[#0F1B3D] px-2">Applicability</legend>
          <p className="text-xs text-[#6F7192] mb-3">Leave empty to apply to all. Separate with commas.</p>
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

        <label className="flex items-center gap-2 text-sm text-[#0F1B3D] cursor-pointer">
          <input type="checkbox" checked={form.is_active} onChange={e => update('is_active', e.target.checked)} className="rounded border-[rgba(109, 40, 217,0.3)] text-[#6d28d9]" />
          Active
        </label>
      </div>
    </div>
  )
}
