'use client'

import { useState, useCallback } from 'react'
import { Save, AlertCircle } from 'lucide-react'
import { ToggleField, InputField, TextAreaField, SelectField } from '@/components/admin/FormField'
import type { EmailSettingsRow } from 'types/database'

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT)' },
  { value: 'America/Denver', label: 'America/Denver (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
  { value: 'America/Toronto', label: 'America/Toronto (EST/EDT)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT)' },
  { value: 'Australia/Melbourne', label: 'Australia/Melbourne (AEST/AEDT)' },
]

export default function EmailSettingsForm({
  initialData,
}: {
  initialData: EmailSettingsRow | null
}) {
  const [form, setForm] = useState<Partial<EmailSettingsRow>>({
    emails_enabled: initialData?.emails_enabled ?? true,
    maintenance_mode: initialData?.maintenance_mode ?? false,
    pause_all_emails: initialData?.pause_all_emails ?? false,
    retry_failed: initialData?.retry_failed ?? true,
    max_retries: initialData?.max_retries ?? 3,
    sender_name: initialData?.sender_name ?? '',
    sender_email: initialData?.sender_email ?? '',
    reply_to: initialData?.reply_to ?? '',
    bcc: initialData?.bcc ?? '',
    cc: initialData?.cc ?? '',
    footer: initialData?.footer ?? '',
    timezone: initialData?.timezone ?? 'Asia/Kolkata',
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const update = useCallback(<K extends keyof EmailSettingsRow>(key: K, value: EmailSettingsRow[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSuccess(false)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/admin/email-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (res.ok) {
        setSuccess(true)
      } else {
        setError(json.error ?? 'Save failed')
      }
    } catch {
      setError('Network error while saving')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Email settings saved successfully.
        </div>
      )}

      {/* Global Toggles */}
      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6F7192]">Global Controls</h3>
        <ToggleField
          label="Enable Emails"
          description="Master switch — when off, no transactional emails will be queued or sent."
          checked={form.emails_enabled ?? true}
          onChange={(v) => update('emails_enabled', v)}
        />
        <ToggleField
          label="Maintenance Mode"
          description="When active, only admin-critical emails are allowed (new orders, contact forms, payment failures)."
          checked={form.maintenance_mode ?? false}
          onChange={(v) => update('maintenance_mode', v)}
        />
        <ToggleField
          label="Pause All Emails"
          description="Temporarily halts all outgoing emails without disabling the system. Emails are logged as dropped."
          checked={form.pause_all_emails ?? false}
          onChange={(v) => update('pause_all_emails', v)}
        />
        <ToggleField
          label="Retry Failed Emails"
          description="Allow admins to manually retry failed emails from the queue."
          checked={form.retry_failed ?? true}
          onChange={(v) => update('retry_failed', v)}
        />
      </div>

      {/* Sender Configuration */}
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6F7192]">Sender Configuration</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="Sender Name"
            placeholder="Flux3D"
            value={form.sender_name ?? ''}
            onChange={(v) => update('sender_name', v)}
          />
          <InputField
            label="Sender Email"
            placeholder="updates@flux3d.in"
            type="email"
            value={form.sender_email ?? ''}
            onChange={(v) => update('sender_email', v)}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="Reply-To"
            placeholder="support@flux3d.in"
            type="email"
            value={form.reply_to ?? ''}
            onChange={(v) => update('reply_to', v)}
          />
          <InputField
            label="CC"
            placeholder="admin@flux3d.in, ops@flux3d.in"
            value={form.cc ?? ''}
            onChange={(v) => update('cc', v)}
          />
        </div>
        <InputField
          label="BCC"
          placeholder="archive@flux3d.in"
          value={form.bcc ?? ''}
          onChange={(v) => update('bcc', v)}
        />
      </div>

      {/* Retry & Regional */}
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6F7192]">Retry & Regional</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="Max Retry Attempts"
            placeholder="3"
            type="number"
            value={String(form.max_retries ?? 3)}
            onChange={(v) => update('max_retries', Math.max(0, Number(v)))}
          />
          <SelectField
            label="Timezone"
            options={TIMEZONE_OPTIONS}
            value={form.timezone ?? 'Asia/Kolkata'}
            onChange={(v) => update('timezone', v)}
          />
        </div>
      </div>

      {/* Global Footer */}
      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6F7192]">Global Footer Text</h3>
        <TextAreaField
          label=""
          placeholder="This text appears in the footer of every outgoing email."
          value={form.footer ?? ''}
          onChange={(v) => update('footer', v)}
          rows={3}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#6d28d9] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4c1d95] disabled:opacity-50 min-h-[44px]"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
