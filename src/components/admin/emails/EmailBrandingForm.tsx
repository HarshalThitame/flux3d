'use client'

import { useState, useCallback } from 'react'
import { Save, RefreshCw, ImageIcon, AlertCircle } from 'lucide-react'
import ColorPickerField from './ColorPickerField'
import type { EmailBrandingRow } from 'types/database'

type SocialIcons = {
  instagram?: string
  facebook?: string
  linkedin?: string
  twitter?: string
  youtube?: string
}

export default function EmailBrandingForm({
  initialData,
}: {
  initialData: EmailBrandingRow | null
}) {
  const [form, setForm] = useState<Partial<EmailBrandingRow>>({
    logo_url: initialData?.logo_url ?? '',
    company_name: initialData?.company_name ?? '',
    address: initialData?.address ?? '',
    gst_number: initialData?.gst_number ?? '',
    support_email: initialData?.support_email ?? '',
    support_phone: initialData?.support_phone ?? '',
    primary_color: initialData?.primary_color ?? '#FF5C1A',
    secondary_color: initialData?.secondary_color ?? '#39BDF8',
    accent_color: initialData?.accent_color ?? '',
    footer_text: initialData?.footer_text ?? '',
    header_html: initialData?.header_html ?? '',
    footer_html: initialData?.footer_html ?? '',
    social_icons: (initialData?.social_icons as SocialIcons) ?? {},
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [uploading, setUploading] = useState(false)

  const update = useCallback((key: keyof EmailBrandingRow, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSuccess(false)
  }, [])

  const updateSocial = useCallback((key: keyof SocialIcons, value: string) => {
    setForm((prev) => ({
      ...prev,
      social_icons: { ...(prev.social_icons as SocialIcons), [key]: value },
    }))
    setSuccess(false)
  }, [])

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('field', 'logo_url')
      formData.append('file', file)
      const res = await fetch('/api/admin/upload-branding', { method: 'POST', body: formData })
      const json = await res.json()
      if (res.ok && json.url) {
        update('logo_url', json.url)
      } else {
        alert(json.error ?? 'Upload failed')
      }
    } catch {
      alert('Network error during upload')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/admin/email-branding', {
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

  const social = (form.social_icons as SocialIcons) ?? {}
  const inputClass =
    'w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none transition focus:border-[#6d28d9]/30'
  const labelClass = 'block text-sm font-medium text-[#0F1B3D] mb-1.5'
  const rowClass = 'grid grid-cols-1 sm:grid-cols-2 gap-4'

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
      {/* Form */}
      <div className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Branding settings saved successfully.
          </div>
        )}

        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6F7192]">Identity</h3>
          <div className={rowClass}>
            <div>
              <label className={labelClass}>Logo</label>
              <div className="flex items-center gap-3">
                {form.logo_url && (
                  <img
                    src={form.logo_url}
                    alt="Logo preview"
                    className="h-12 w-12 rounded-lg border border-gray-200 object-contain bg-white"
                  />
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#6d28d9]/20 bg-[#6d28d9]/5 px-4 py-2.5 text-sm font-medium text-[#6d28d9] transition hover:bg-[#6d28d9]/10">
                  <ImageIcon className="h-4 w-4" />
                  {uploading ? 'Uploading...' : form.logo_url ? 'Change Logo' : 'Upload Logo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleLogoUpload(file)
                    }}
                  />
                </label>
                {form.logo_url && (
                  <button
                    type="button"
                    onClick={() => update('logo_url', '')}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className={labelClass}>Company Name</label>
              <input
                type="text"
                value={form.company_name ?? ''}
                onChange={(e) => update('company_name', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Address</label>
            <textarea
              value={form.address ?? ''}
              onChange={(e) => update('address', e.target.value)}
              rows={3}
              className={inputClass}
            />
          </div>

          <div className={rowClass}>
            <div>
              <label className={labelClass}>GST Number</label>
              <input
                type="text"
                value={form.gst_number ?? ''}
                onChange={(e) => update('gst_number', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Support Phone</label>
              <input
                type="text"
                value={form.support_phone ?? ''}
                onChange={(e) => update('support_phone', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Support Email</label>
            <input
              type="email"
              value={form.support_email ?? ''}
              onChange={(e) => update('support_email', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6F7192]">Colors</h3>
          <div className={rowClass}>
            <ColorPickerField
              label="Primary Color"
              value={form.primary_color ?? '#FF5C1A'}
              onChange={(v) => update('primary_color', v)}
            />
            <ColorPickerField
              label="Secondary Color"
              value={form.secondary_color ?? '#39BDF8'}
              onChange={(v) => update('secondary_color', v)}
            />
          </div>
          <div className={rowClass}>
            <ColorPickerField
              label="Accent Color"
              value={form.accent_color ?? ''}
              onChange={(v) => update('accent_color', v)}
            />
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6F7192]">Footer & Social</h3>
          <div>
            <label className={labelClass}>Footer Text</label>
            <textarea
              value={form.footer_text ?? ''}
              onChange={(e) => update('footer_text', e.target.value)}
              rows={2}
              className={inputClass}
            />
          </div>
          <div className={rowClass}>
            <div>
              <label className={labelClass}>Instagram</label>
              <input
                type="url"
                value={social.instagram ?? ''}
                onChange={(e) => updateSocial('instagram', e.target.value)}
                className={inputClass}
                placeholder="https://instagram.com/..."
              />
            </div>
            <div>
              <label className={labelClass}>Facebook</label>
              <input
                type="url"
                value={social.facebook ?? ''}
                onChange={(e) => updateSocial('facebook', e.target.value)}
                className={inputClass}
                placeholder="https://facebook.com/..."
              />
            </div>
          </div>
          <div className={rowClass}>
            <div>
              <label className={labelClass}>LinkedIn</label>
              <input
                type="url"
                value={social.linkedin ?? ''}
                onChange={(e) => updateSocial('linkedin', e.target.value)}
                className={inputClass}
                placeholder="https://linkedin.com/..."
              />
            </div>
            <div>
              <label className={labelClass}>Twitter / X</label>
              <input
                type="url"
                value={social.twitter ?? ''}
                onChange={(e) => updateSocial('twitter', e.target.value)}
                className={inputClass}
                placeholder="https://x.com/..."
              />
            </div>
          </div>
          <div className={rowClass}>
            <div>
              <label className={labelClass}>YouTube</label>
              <input
                type="url"
                value={social.youtube ?? ''}
                onChange={(e) => updateSocial('youtube', e.target.value)}
                className={inputClass}
                placeholder="https://youtube.com/..."
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6F7192]">Advanced</h3>
          <div>
            <label className={labelClass}>Custom Header HTML</label>
            <textarea
              value={form.header_html ?? ''}
              onChange={(e) => update('header_html', e.target.value)}
              rows={4}
              className={`${inputClass} font-mono text-xs`}
              placeholder="<div>...</div>"
            />
          </div>
          <div>
            <label className={labelClass}>Custom Footer HTML</label>
            <textarea
              value={form.footer_html ?? ''}
              onChange={(e) => update('footer_html', e.target.value)}
              rows={4}
              className={`${inputClass} font-mono text-xs`}
              placeholder="<div>...</div>"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#6d28d9] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4c1d95] disabled:opacity-50 min-h-[44px]"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Branding'}
          </button>
        </div>
      </div>

      {/* Live Preview */}
      <div className="space-y-4">
        <div className="sticky top-4 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-[#6F7192]">Preview</h3>
            <div className="space-y-4">
              {form.logo_url && (
                <div className="flex items-center justify-center rounded-xl bg-gray-50 p-4">
                  <img src={form.logo_url} alt="Logo" className="max-h-16 object-contain" />
                </div>
              )}
              <div className="space-y-1">
                <div className="text-sm font-semibold text-[#0F1B3D]">{form.company_name || 'Company Name'}</div>
                <div className="text-xs text-[#6F7192] whitespace-pre-line">{form.address || 'Address line 1\nCity, State, PIN'}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.primary_color && (
                  <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <div className="h-4 w-4 rounded-full border border-gray-200" style={{ backgroundColor: form.primary_color }} />
                    <span className="text-xs text-[#6F7192]">Primary</span>
                  </div>
                )}
                {form.secondary_color && (
                  <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <div className="h-4 w-4 rounded-full border border-gray-200" style={{ backgroundColor: form.secondary_color }} />
                    <span className="text-xs text-[#6F7192]">Secondary</span>
                  </div>
                )}
                {form.accent_color && (
                  <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <div className="h-4 w-4 rounded-full border border-gray-200" style={{ backgroundColor: form.accent_color }} />
                    <span className="text-xs text-[#6F7192]">Accent</span>
                  </div>
                )}
              </div>
              <div className="space-y-1 text-xs text-[#6F7192]">
                {form.support_email && <div>Email: {form.support_email}</div>}
                {form.support_phone && <div>Phone: {form.support_phone}</div>}
                {form.gst_number && <div>GST: {form.gst_number}</div>}
              </div>
              {form.footer_text && (
                <div className="rounded-lg bg-gray-50 p-3 text-xs text-[#6F7192]">{form.footer_text}</div>
              )}
              {Object.values(social).some(Boolean) && (
                <div className="flex flex-wrap gap-2">
                  {social.instagram && <span className="text-xs text-[#6d28d9]">Instagram</span>}
                  {social.facebook && <span className="text-xs text-[#6d28d9]">Facebook</span>}
                  {social.linkedin && <span className="text-xs text-[#6d28d9]">LinkedIn</span>}
                  {social.twitter && <span className="text-xs text-[#6d28d9]">Twitter</span>}
                  {social.youtube && <span className="text-xs text-[#6d28d9]">YouTube</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
