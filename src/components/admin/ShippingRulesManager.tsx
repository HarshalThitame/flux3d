'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import { InputField } from '@/components/admin/FormField'

type ShippingRule = {
  id: string
  state: string | null
  pincode_range_start: string | null
  pincode_range_end: string | null
  minimum_order_value: number
  maximum_weight_grams: number | null
  charge: number
  restricted: boolean
  is_active: boolean
}

type RuleForm = {
  state: string
  pincodeRangeStart: string
  pincodeRangeEnd: string
  minimumOrderValue: string
  maximumWeightGrams: string
  charge: string
  restricted: boolean
  isActive: boolean
}

const EMPTY_FORM: RuleForm = {
  state: '',
  pincodeRangeStart: '',
  pincodeRangeEnd: '',
  minimumOrderValue: '0',
  maximumWeightGrams: '',
  charge: '0',
  restricted: false,
  isActive: true,
}

function toForm(rule: ShippingRule): RuleForm {
  return {
    state: rule.state ?? '',
    pincodeRangeStart: rule.pincode_range_start ?? '',
    pincodeRangeEnd: rule.pincode_range_end ?? '',
    minimumOrderValue: String(rule.minimum_order_value ?? 0),
    maximumWeightGrams: rule.maximum_weight_grams != null ? String(rule.maximum_weight_grams) : '',
    charge: String(rule.charge ?? 0),
    restricted: rule.restricted,
    isActive: rule.is_active,
  }
}

function describeScope(rule: Pick<ShippingRule, 'state' | 'pincode_range_start' | 'pincode_range_end'>) {
  const parts: string[] = []
  if (rule.state) parts.push(rule.state)
  if (rule.pincode_range_start || rule.pincode_range_end) {
    parts.push(`${rule.pincode_range_start || '000000'}–${rule.pincode_range_end || '999999'}`)
  }
  return parts.length > 0 ? parts.join(' · ') : 'All pincodes (catch-all)'
}

export default function ShippingRulesManager() {
  const router = useRouter()
  const [toast, setToast] = useState<AdminToastState>(null)
  const [rules, setRules] = useState<ShippingRule[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<'new' | string | null>(null)
  const [form, setForm] = useState<RuleForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const controller = new AbortController()

    async function loadRules() {
      try {
        const response = await fetch('/api/admin/shipping-rules', { signal: controller.signal })
        if (response.status === 401) {
          router.push('/login?next=/admin/settings')
          return
        }
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? 'Failed to load shipping rules.')
        }
        const json = (await response.json()) as { rules?: ShippingRule[] }
        setRules(json.rules ?? [])
        setLoadError(null)
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') return
        setLoadError(loadError instanceof Error ? loadError.message : 'Failed to load shipping rules.')
      } finally {
        setLoading(false)
      }
    }

    void loadRules()
    return () => controller.abort()
  }, [router, refreshTick])

  function startCreate() {
    setEditingId('new')
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  function startEdit(rule: ShippingRule) {
    setEditingId(rule.id)
    setForm(toForm(rule))
    setFormError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  async function handleSave() {
    if (!editingId) return
    setSaving(true)
    setFormError(null)
    try {
      const payload = {
        state: form.state,
        pincodeRangeStart: form.pincodeRangeStart,
        pincodeRangeEnd: form.pincodeRangeEnd,
        minimumOrderValue: form.minimumOrderValue === '' ? 0 : Number(form.minimumOrderValue),
        maximumWeightGrams: form.maximumWeightGrams === '' ? null : Number(form.maximumWeightGrams),
        charge: form.charge === '' ? 0 : Number(form.charge),
        restricted: form.restricted,
        isActive: form.isActive,
      }
      const response = await fetch(
        editingId === 'new' ? '/api/admin/shipping-rules' : `/api/admin/shipping-rules/${editingId}`,
        {
          method: editingId === 'new' ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      if (response.status === 401) {
        router.push('/login?next=/admin/settings')
        return
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Failed to save shipping rule.')
      }
      cancelEdit()
      setToast({ type: 'success', message: 'Shipping rule saved.' })
      setRefreshTick((tick) => tick + 1)
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : 'Failed to save shipping rule.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(rule: ShippingRule) {
    if (!window.confirm(`Delete the shipping rule for "${describeScope(rule)}"?`)) return
    try {
      const response = await fetch(`/api/admin/shipping-rules/${rule.id}`, { method: 'DELETE' })
      if (response.status === 401) {
        router.push('/login?next=/admin/settings')
        return
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Failed to delete shipping rule.')
      }
      setToast({ type: 'success', message: 'Shipping rule deleted.' })
      setRefreshTick((tick) => tick + 1)
    } catch (deleteError) {
      setToast({
        type: 'error',
        message: deleteError instanceof Error ? deleteError.message : 'Failed to delete shipping rule.',
      })
    }
  }

  function updateField<K extends keyof RuleForm>(key: K, value: RuleForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#6F7192]">
        Per-pincode delivery rules. A matching rule can enforce its own minimum order value, a fixed
        delivery charge, a weight limit, or block delivery entirely. Rules override the global shop
        minimum order value when they set one.
      </p>

      {toast && <AdminToast toast={toast} />}

      {loadError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{loadError}</div>
      )}

      {loading ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-6 text-center text-xs text-[#6F7192]">
          Loading shipping rules...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-[#6F7192]">
              <tr>
                <th className="px-3 py-2 font-semibold">Scope</th>
                <th className="px-3 py-2 font-semibold">Min order</th>
                <th className="px-3 py-2 font-semibold">Charge</th>
                <th className="px-3 py-2 font-semibold">Max weight</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rules.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-xs text-[#6F7192]">
                    No shipping rules yet — every pincode uses the global delivery settings.
                  </td>
                </tr>
              )}
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td className="px-3 py-2">
                    <div className="font-medium text-[#0F1B3D]">{describeScope(rule)}</div>
                    {rule.restricted && <div className="text-xs font-semibold text-rose-600">Restricted — no delivery</div>}
                  </td>
                  <td className="px-3 py-2">{rule.minimum_order_value > 0 ? `₹${rule.minimum_order_value}` : '—'}</td>
                  <td className="px-3 py-2">{rule.charge > 0 ? `₹${rule.charge}` : '—'}</td>
                  <td className="px-3 py-2">{rule.maximum_weight_grams != null ? `${rule.maximum_weight_grams} g` : '—'}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        rule.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(rule)}
                        aria-label={`Edit rule for ${describeScope(rule)}`}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-gray-200 text-[#6F7192] transition hover:border-[#6d28d9] hover:text-[#6d28d9]"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(rule)}
                        aria-label={`Delete rule for ${describeScope(rule)}`}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-gray-200 text-rose-500 transition hover:border-rose-300 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingId && (
        <div className="rounded-xl border border-[#6F7192]/20 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0F1B3D]">
              {editingId === 'new' ? 'Add shipping rule' : 'Edit shipping rule'}
            </h3>
            <button
              type="button"
              onClick={cancelEdit}
              aria-label="Close shipping rule editor"
              className="grid h-8 w-8 place-items-center rounded-lg border border-gray-200 text-[#6F7192]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {formError && (
            <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</div>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <InputField label="State (optional)" value={form.state} onChange={(v) => updateField('state', v)} placeholder="e.g. Maharashtra" />
            <InputField label="Pincode range start (optional)" value={form.pincodeRangeStart} onChange={(v) => updateField('pincodeRangeStart', v)} placeholder="400001" />
            <InputField label="Pincode range end (optional)" value={form.pincodeRangeEnd} onChange={(v) => updateField('pincodeRangeEnd', v)} placeholder="400020" />
            <InputField label="Minimum order value (₹)" type="number" value={form.minimumOrderValue} onChange={(v) => updateField('minimumOrderValue', v)} placeholder="0" />
            <InputField label="Delivery charge (₹)" type="number" value={form.charge} onChange={(v) => updateField('charge', v)} placeholder="50" />
            <InputField label="Max weight in grams (optional)" type="number" value={form.maximumWeightGrams} onChange={(v) => updateField('maximumWeightGrams', v)} placeholder="2000" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-5">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[#6F7192]">
              <input type="checkbox" checked={form.restricted} onChange={(e) => updateField('restricted', e.target.checked)} className="h-4 w-4 accent-rose-600" />
              Restricted (block delivery)
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[#6F7192]">
              <input type="checkbox" checked={form.isActive} onChange={(e) => updateField('isActive', e.target.checked)} className="h-4 w-4 accent-[#6d28d9]" />
              Active
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Rule'}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#6F7192] transition hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!editingId && (
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#6F7192] transition hover:border-[#6d28d9] hover:text-[#6d28d9]"
        >
          <Plus className="h-4 w-4" />
          Add Shipping Rule
        </button>
      )}
    </div>
  )
}
