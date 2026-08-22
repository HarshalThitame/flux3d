'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Save, AlertCircle } from 'lucide-react'
import type { EmailAutomationRuleRow, EmailTemplateRow } from 'types/database'

const ALL_EVENTS = [
  // Existing backend events
  { value: 'user_registered', label: 'User Registered' },
  { value: 'email_verification_requested', label: 'Email Verification Requested' },
  { value: 'password_reset_requested', label: 'Password Reset Requested' },
  { value: 'order_created', label: 'Order Created' },
  { value: 'model_validation_passed', label: 'Model Validation Passed' },
  { value: 'model_validation_failed', label: 'Model Validation Failed' },
  { value: 'production_started', label: 'Production Started' },
  { value: 'order_shipped', label: 'Order Shipped' },
  { value: 'order_delivered', label: 'Order Delivered' },
  { value: 'payment_captured', label: 'Payment Captured' },
  { value: 'payment_failed', label: 'Payment Failed' },
  { value: 'refund_processed', label: 'Refund Processed' },
  { value: 'contact_form_submitted', label: 'Contact Form Submitted' },
  // New Phase 4 events (dormant until backend triggers are wired)
  { value: 'quote_received', label: 'Quote Received' },
  { value: 'quote_approved', label: 'Quote Approved' },
  { value: 'printing_started', label: 'Printing Started' },
  { value: 'quality_check', label: 'Quality Check' },
  { value: 'shipped', label: 'Shipped (legacy alias)' },
  { value: 'delivered', label: 'Delivered (legacy alias)' },
  { value: 'order_cancelled', label: 'Order Cancelled' },
  { value: 'refund_initiated', label: 'Refund Initiated' },
  { value: 'refund_completed', label: 'Refund Completed' },
  { value: 'contact_request', label: 'Contact Request' },
  { value: 'support_reply', label: 'Support Reply' },
]

const AUDIENCE_OPTIONS = [
  { value: 'customer', label: 'Customer' },
  { value: 'admin', label: 'Admin' },
  { value: 'both', label: 'Both' },
]

const DELAY_UNITS = [
  { value: 'minutes', label: 'Minutes', multiplier: 1 },
  { value: 'hours', label: 'Hours', multiplier: 60 },
  { value: 'days', label: 'Days', multiplier: 1440 },
]

interface RuleFormData {
  event_name: string
  template_id: string
  target_audience: string
  delay_value: number
  delay_unit: string
  priority: number
  is_enabled: boolean
}

export default function AutomationRuleBuilder({
  templates,
  editingRule,
  onClose,
  onSave,
}: {
  templates: EmailTemplateRow[]
  editingRule?: EmailAutomationRuleRow | null
  onClose: () => void
  onSave: (data: Omit<EmailAutomationRuleRow, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
}) {
  const isEdit = !!editingRule

  const [form, setForm] = useState<RuleFormData>({
    event_name: editingRule?.event_name ?? '',
    template_id: editingRule?.template_id ?? '',
    target_audience: editingRule?.target_audience ?? 'customer',
    delay_value: editingRule ? Math.max(1, (editingRule.delay_minutes ?? 0)) : 0,
    delay_unit: 'minutes',
    priority: editingRule?.priority ?? 0,
    is_enabled: editingRule?.is_enabled ?? true,
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Normalize delay_minutes from value + unit
  useEffect(() => {
    if (isEdit && editingRule) {
      const dm = editingRule.delay_minutes ?? 0
      let unit = 'minutes'
      let value = dm
      if (dm >= 1440 && dm % 1440 === 0) {
        unit = 'days'
        value = dm / 1440
      } else if (dm >= 60 && dm % 60 === 0) {
        unit = 'hours'
        value = dm / 60
      }
      setForm((prev) => ({
        ...prev,
        delay_value: value || 0,
        delay_unit: unit,
      }))
    }
  }, [isEdit, editingRule])

  const update = useCallback(<K extends keyof RuleFormData>(key: K, value: RuleFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }, [])

  const getDelayMinutes = (): number => {
    const unit = DELAY_UNITS.find((u) => u.value === form.delay_unit)
    return (form.delay_value || 0) * (unit?.multiplier ?? 1)
  }

  const validate = (): string | null => {
    if (!form.event_name.trim()) return 'Event name is required'
    if (!form.template_id.trim()) return 'Template is required'
    if (getDelayMinutes() < 0) return 'Delay cannot be negative'
    return null
  }

  const handleSave = async () => {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({
        event_name: form.event_name,
        template_id: form.template_id,
        target_audience: form.target_audience as any,
        delay_minutes: getDelayMinutes(),
        priority: form.priority,
        is_enabled: form.is_enabled,
        conditions: {},
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const enabledTemplates = templates.filter((t) => t.is_enabled)

  const inputClass =
    'w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none transition focus:border-[#6d28d9]/30'
  const labelClass = 'block text-sm font-medium text-[#0F1B3D] mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-[#0F1B3D]">
            {isEdit ? 'Edit Automation Rule' : 'New Automation Rule'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close automation rule builder"
            className="rounded-lg p-1 text-[#6F7192] hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Event */}
          <div>
            <label className={labelClass}>Event</label>
            <select
              value={form.event_name}
              onChange={(e) => update('event_name', e.target.value)}
              className={inputClass}
            >
              <option value="">Select an event…</option>
              {ALL_EVENTS.map((ev) => (
                <option key={ev.value} value={ev.value}>
                  {ev.label}
                </option>
              ))}
            </select>
          </div>

          {/* Template */}
          <div>
            <label className={labelClass}>Template</label>
            <select
              value={form.template_id}
              onChange={(e) => update('template_id', e.target.value)}
              className={inputClass}
            >
              <option value="">Select a template…</option>
              {enabledTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.email_type})
                </option>
              ))}
            </select>
          </div>

          {/* Target Audience */}
          <div>
            <label className={labelClass}>Target Audience</label>
            <div className="flex gap-2">
              {AUDIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update('target_audience', opt.value)}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    form.target_audience === opt.value
                      ? 'border-[#6d28d9] bg-[#6d28d9]/5 text-[#6d28d9]'
                      : 'border-gray-200 bg-white text-[#6F7192] hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Delay */}
          <div>
            <label className={labelClass}>Delay</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                value={form.delay_value}
                onChange={(e) => update('delay_value', Math.max(0, Number(e.target.value)))}
                className={`${inputClass} w-24`}
              />
              <select
                value={form.delay_unit}
                onChange={(e) => update('delay_unit', e.target.value)}
                className={inputClass}
              >
                {DELAY_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-xs text-[#6F7192]">
              Total delay: {getDelayMinutes()} minute{getDelayMinutes() !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Priority */}
          <div>
            <label className={labelClass}>
              Priority: {form.priority > 0 ? '+' : ''}{form.priority}
            </label>
            <input
              type="range"
              min={-10}
              max={10}
              step={1}
              value={form.priority}
              onChange={(e) => update('priority', Number(e.target.value))}
              className="w-full accent-[#6d28d9]"
            />
            <div className="flex justify-between text-[10px] text-[#6F7192] mt-0.5">
              <span>-10 (Lowest)</span>
              <span>0 (Normal)</span>
              <span>+10 (Highest)</span>
            </div>
          </div>

          {/* Enable Toggle */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5">
            <div>
              <div className="text-sm font-medium text-[#0F1B3D]">Enable Rule</div>
              <div className="mt-0.5 text-xs text-[#6F7192]">
                {form.is_enabled ? 'Rule is active and will trigger emails' : 'Rule is disabled'}
              </div>
            </div>
            <button
              type="button"
              aria-pressed={form.is_enabled}
              onClick={() => update('is_enabled', !form.is_enabled)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                form.is_enabled ? 'bg-[#6d28d9]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  form.is_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#0F1B3D] transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4c1d95] disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : isEdit ? 'Update Rule' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  )
}
