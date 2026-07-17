'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  Building2, Phone, MapPin, Share2, Palette, FileText, MessageSquare,
  Search, Mail, Scale, Settings2, Save, RotateCcw, Download, Upload,
  Copy, Eye, EyeOff, ChevronDown, ChevronUp, Check, AlertCircle,
  ArrowLeft, Plus, Trash2,
} from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import { InputField, SelectField, ToggleField, TextAreaField } from '@/components/admin/FormField'
import SkeletonBlock from '@/components/admin/SkeletonBlock'
import { useRouter } from 'next/navigation'
import type { BusinessSettings, CartDiscountTier } from '@/lib/admin/business-settings'

type Tab = 'business' | 'branding' | 'invoicing' | 'communication' | 'seo' | 'email' | 'legal-ops'

const BUSINESS_TYPES = [
  { label: 'Individual', value: 'Individual' },
  { label: 'Sole Proprietorship', value: 'Sole Proprietorship' },
  { label: 'Partnership', value: 'Partnership' },
  { label: 'LLP', value: 'LLP' },
  { label: 'Pvt Ltd', value: 'Pvt Ltd' },
  { label: 'OPC', value: 'OPC' },
  { label: 'Other', value: 'Other' },
]

const CURRENCIES = [
  { label: 'INR (₹)', value: 'INR' },
  { label: 'USD ($)', value: 'USD' },
  { label: 'EUR (€)', value: 'EUR' },
  { label: 'GBP (£)', value: 'GBP' },
]

const CURRENCY_SYMBOLS = [
  { label: '₹', value: '₹' },
  { label: '$', value: '$' },
  { label: '€', value: '€' },
  { label: '£', value: '£' },
]

const WORKING_DAYS = [
  { label: 'Monday - Friday', value: 'Monday-Friday' },
  { label: 'Monday - Saturday', value: 'Monday-Saturday' },
  { label: 'Monday - Sunday', value: 'Monday-Sunday' },
  { label: 'Custom', value: 'Custom' },
]

const SOCIAL_ICONS: Record<string, string> = {
  instagramUrl: '📸',
  facebookUrl: '👍',
  linkedinUrl: '💼',
  twitterUrl: '🐦',
  youtubeUrl: '📺',
  threadsUrl: '🧵',
  pinterestUrl: '📌',
  githubUrl: '🐙',
  websiteUrl: '🌐',
}

const SOCIAL_LABELS: Record<string, string> = {
  instagramUrl: 'Instagram',
  facebookUrl: 'Facebook',
  linkedinUrl: 'LinkedIn',
  twitterUrl: 'Twitter / X',
  youtubeUrl: 'YouTube',
  threadsUrl: 'Threads',
  pinterestUrl: 'Pinterest',
  githubUrl: 'GitHub',
  websiteUrl: 'Website',
}

function n(value: string | null | undefined): string {
  return value ?? ''
}

function bool(value: boolean | null | undefined): boolean {
  return value ?? false
}

function num(value: number | null | undefined): number {
  return value ?? 0
}

function normalizeCartDiscountTiers(value: unknown): CartDiscountTier[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((tier) => {
      if (!tier || typeof tier !== 'object') {
        return null
      }

      const record = tier as Record<string, unknown>
      const minCartValue = Number(record.minCartValue ?? record.min_cart_value ?? 0)
      const discountPercent = Number(record.discountPercent ?? record.discount_percent ?? 0)

      if (!Number.isFinite(minCartValue) || !Number.isFinite(discountPercent)) {
        return null
      }

      return {
        minCartValue: Math.max(0, minCartValue),
        discountPercent: Math.max(0, discountPercent),
      }
    })
    .filter((tier): tier is CartDiscountTier => Boolean(tier))
    .sort((left, right) => left.minCartValue - right.minCartValue)
}

export default function BusinessSettingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('business')
  const [settings, setSettings] = useState<BusinessSettings | null>(null)
  const [form, setForm] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<AdminToastState>(null)
  const [dirty, setDirty] = useState(false)
  const [savingToast, setSavingToast] = useState<boolean>(false)
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({})
  const [uploading, setUploading] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadField, setUploadField] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const res = await fetch('/api/admin/settings/business', { signal: controller.signal })
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(body.error ?? 'Failed to load settings.')
        }
        const json = await res.json() as { settings: BusinessSettings | null }
        if (json.settings) {
          setSettings(json.settings)
          setForm(json.settings as unknown as Record<string, unknown>)
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Failed to load settings.')
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [])

  const updateField = useCallback((key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings/business', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? 'Failed to save settings.')
      }
      const json = await res.json() as { settings: BusinessSettings }
      setSettings(json.settings)
      setForm(json.settings as unknown as Record<string, unknown>)
      setDirty(false)
      setToast({ type: 'success', message: 'Business settings saved successfully.' })
    } catch (err) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save settings.' })
    } finally {
      setSaving(false)
    }
  }, [form])

  const handleReset = useCallback(() => {
    if (settings) {
      setForm(settings as unknown as Record<string, unknown>)
      setDirty(false)
      setToast({ type: 'info', message: 'Changes reverted.' })
    }
  }, [settings])

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(form, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'business-settings.json'
    a.click()
    URL.revokeObjectURL(url)
    setToast({ type: 'success', message: 'Settings exported as JSON.' })
  }, [form])

  const handleImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        setForm((prev) => ({ ...prev, ...data }))
        setDirty(true)
        setToast({ type: 'success', message: 'Settings imported. Save to persist.' })
      } catch {
        setToast({ type: 'error', message: 'Invalid JSON file.' })
      }
    }
    input.click()
  }, [])

  const handleImageUpload = useCallback(async (field: string, file: File) => {
    setUploading(field)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('field', field)
      const res = await fetch('/api/admin/upload-branding', { method: 'POST', body: formData })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? 'Upload failed.')
      }
      const json = await res.json() as { url: string; field: string }
      updateField(json.field, json.url)
      setToast({ type: 'success', message: `${field.replace(/([A-Z])/g, ' $1').trim()} updated.` })
    } catch (err) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Upload failed.' })
    } finally {
      setUploading(null)
    }
  }, [updateField])

  const triggerFileInput = (field: string) => {
    setUploadField(field)
    fileInputRef.current?.click()
  }

  const f = (key: string): string => n(form[key] as string | null | undefined)
  const fb = (key: string): boolean => bool(form[key] as boolean | null | undefined)
  const fn = (key: string): number => num(form[key] as number | null | undefined)
  const cartDiscountTiers = normalizeCartDiscountTiers(form.cartDiscountTiers)

  const updateCartDiscountTier = useCallback((index: number, field: keyof CartDiscountTier, value: number) => {
    const next = cartDiscountTiers.map((tier, tierIndex) =>
      tierIndex === index ? { ...tier, [field]: value } : tier
    )
    updateField('cartDiscountTiers', next)
  }, [cartDiscountTiers, updateField])

  const addCartDiscountTier = useCallback(() => {
    updateField('cartDiscountTiers', [
      ...cartDiscountTiers,
      { minCartValue: 0, discountPercent: 0 },
    ])
  }, [cartDiscountTiers, updateField])

  const deleteCartDiscountTier = useCallback((index: number) => {
    updateField('cartDiscountTiers', cartDiscountTiers.filter((_, tierIndex) => tierIndex !== index))
  }, [cartDiscountTiers, updateField])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setToast({ type: 'success', message: 'Copied to clipboard.' })
    } catch {
      setToast({ type: 'error', message: 'Failed to copy.' })
    }
  }

  const billingSame = fb('billingSameAsOffice')

  const tabs = [
    { id: 'business' as Tab, label: 'Business Info', icon: Building2 },
    { id: 'branding' as Tab, label: 'Branding', icon: Palette },
    { id: 'invoicing' as Tab, label: 'Invoicing', icon: FileText },
    { id: 'communication' as Tab, label: 'Communication', icon: MessageSquare },
    { id: 'seo' as Tab, label: 'SEO', icon: Search },
    { id: 'email' as Tab, label: 'Email', icon: Mail },
    { id: 'legal-ops' as Tab, label: 'Legal & Ops', icon: Scale },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-8 w-56" />
        <SkeletonBlock className="h-6 w-96" />
        <SkeletonBlock className="h-12 w-full" />
        <SkeletonBlock className="h-[600px] w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-600">
        {error}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.push('/admin/settings')}
              className="mb-3 inline-flex items-center gap-1.5 text-xs text-[#6F7192] transition-colors hover:text-[#0F1B3D]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Settings
            </button>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/20 bg-[#6d28d9]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#6d28d9]">
              <Building2 className="h-3 w-3" />
              Company
            </div>
            <h1 className="mt-2 font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">
              Business Settings
            </h1>
            <p className="mt-1 max-w-xl text-sm text-[#6F7192]">
              Manage your company details, branding, invoices, and operational settings.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-medium text-[#6F7192] transition hover:bg-gray-200"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <button
              type="button"
              onClick={handleImport}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-medium text-[#6F7192] transition hover:bg-gray-200"
            >
              <Upload className="h-3.5 w-3.5" />
              Import
            </button>
          </div>
        </div>

        {settings && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-emerald-600">
              <Check className="h-3.5 w-3.5" />
              Last updated {new Date(settings.updatedAt).toLocaleString('en-IN')}
            </div>
          </div>
        )}

        <div className="flex gap-6">
          <div className="hidden w-48 shrink-0 md:block">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
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
            </nav>
          </div>

          <div className="flex-1 space-y-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file && uploadField) {
                  handleImageUpload(uploadField, file)
                }
                e.target.value = ''
              }}
            />

            {activeTab === 'business' && (
              <BusinessInfoTab form={form} updateField={updateField} f={f} fn={fn} fb={fb} copyToClipboard={copyToClipboard} showSensitive={showSensitive} setShowSensitive={setShowSensitive} billingSame={billingSame} />
            )}

            {activeTab === 'branding' && (
              <BrandingTab form={form} updateField={updateField} f={f} fb={fb} triggerFileInput={triggerFileInput} uploading={uploading} />
            )}

            {activeTab === 'invoicing' && (
      <InvoicingTab
        form={form}
        updateField={updateField}
        f={f}
        fn={fn}
        fb={fb}
        triggerFileInput={triggerFileInput}
        uploading={uploading}
        cartDiscountTiers={cartDiscountTiers}
        onAddCartDiscountTier={addCartDiscountTier}
        onDeleteCartDiscountTier={deleteCartDiscountTier}
        onUpdateCartDiscountTier={updateCartDiscountTier}
      />
            )}

            {activeTab === 'communication' && (
              <CommunicationTab form={form} updateField={updateField} f={f} fb={fb} copyToClipboard={copyToClipboard} />
            )}

            {activeTab === 'seo' && (
              <SEOTab form={form} updateField={updateField} f={f} fb={fb} triggerFileInput={triggerFileInput} uploading={uploading} />
            )}

            {activeTab === 'email' && (
              <EmailTab form={form} updateField={updateField} f={f} fn={fn} />
            )}

            {activeTab === 'legal-ops' && (
              <LegalOpsTab form={form} updateField={updateField} f={f} fn={fn} fb={fb} />
            )}
          </div>
        </div>
      </div>

      <div className={`fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-xl transition-all md:left-[280px] ${savingToast ? '' : ''}`}>
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${dirty ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            <span className="text-xs text-[#6F7192]">{dirty ? 'Unsaved changes' : 'All saved'}</span>
          </div>
          <div className="flex gap-2">
            {dirty && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-xs font-medium text-[#6F7192] transition hover:bg-gray-200"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Revert
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#6d28d9] px-4 py-2 text-xs font-semibold text-[#0F1B3D] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <AdminToast toast={toast} />
    </>
  )
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gray-200 bg-white p-5"
    >
      <div className="mb-5">
        <h3 className="text-base font-semibold text-[#0F1B3D]">{title}</h3>
        {description && <p className="mt-1 text-xs text-[#6F7192]">{description}</p>}
      </div>
      {children}
    </motion.div>
  )
}

function Grid({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div className={`grid gap-4 md:grid-cols-${cols}`}>
      {children}
    </div>
  )
}

function Divider() {
  return <div className="my-5 border-t border-gray-200" />
}

function BusinessInfoTab({ form, updateField, f, fn, fb, copyToClipboard, showSensitive, setShowSensitive, billingSame }: {
  form: Record<string, unknown>
  updateField: (key: string, value: unknown) => void
  f: (key: string) => string
  fn: (key: string) => number
  fb: (key: string) => boolean
  copyToClipboard: (text: string) => void
  showSensitive: Record<string, boolean>
  setShowSensitive: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  billingSame: boolean
}) {
  return (
    <div className="space-y-6">
      <SectionCard title="Basic Business Information" description="Legal and public-facing business details.">
        <div className="grid gap-4 md:grid-cols-2">
          <InputField label="Business Name" value={f('businessName')} onChange={(v) => updateField('businessName', v)} placeholder="Flux3D" />
          <InputField label="Legal Business Name" value={f('legalBusinessName')} onChange={(v) => updateField('legalBusinessName', v)} placeholder="Flux3D Pvt. Ltd." />
          <InputField label="Brand Name" value={f('brandName')} onChange={(v) => updateField('brandName', v)} placeholder="Flux3D" />
          <InputField label="Tagline / Slogan" value={f('tagline')} onChange={(v) => updateField('tagline', v)} placeholder="3D Printing Made Easy" />
        </div>
        <div className="mt-4">
          <TextAreaField label="Business Description" value={f('businessDescription')} onChange={(v) => updateField('businessDescription', v)} rows={3} placeholder="Describe your business..." />
        </div>
        <Divider />
        <div className="grid gap-4 md:grid-cols-3">
          <InputField label="GST Number" value={f('gstNumber')} onChange={(v) => updateField('gstNumber', v)} placeholder="27ABCDE1234F1Z5" />
          <InputField label="PAN Number" value={f('panNumber')} onChange={(v) => updateField('panNumber', v)} placeholder="ABCDE1234F" />
          <InputField label="CIN Number (optional)" value={f('cinNumber')} onChange={(v) => updateField('cinNumber', v)} placeholder="U12345KA2020PTC123456" />
          <InputField label="MSME Registration Number (optional)" value={f('msmeNumber')} onChange={(v) => updateField('msmeNumber', v)} placeholder="UDYAM-KA-01-0000000" />
          <SelectField label="Business Type" options={BUSINESS_TYPES} value={f('businessType')} onChange={(v) => updateField('businessType', v)} />
        </div>
      </SectionCard>

      <SectionCard title="Contact Information" description="Email addresses and phone numbers for various departments.">
        <div className="grid gap-4 md:grid-cols-2">
          <InputField label="Primary Email" type="email" value={f('primaryEmail')} onChange={(v) => updateField('primaryEmail', v)} placeholder="hello@flux3d.in" />
          <InputField label="Support Email" type="email" value={f('supportEmail')} onChange={(v) => updateField('supportEmail', v)} placeholder="support@flux3d.in" />
          <InputField label="Sales Email" type="email" value={f('salesEmail')} onChange={(v) => updateField('salesEmail', v)} placeholder="sales@flux3d.in" />
          <InputField label="Billing Email" type="email" value={f('billingEmail')} onChange={(v) => updateField('billingEmail', v)} placeholder="billing@flux3d.in" />
        </div>
        <Divider />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="relative">
            <InputField label="Primary Phone Number" type="tel" value={f('primaryPhone')} onChange={(v) => updateField('primaryPhone', v)} placeholder="+91 98765 43210" />
            {f('primaryPhone') && (
              <button type="button" onClick={() => copyToClipboard(f('primaryPhone'))} className="absolute right-3 top-8 text-[#6F7192] hover:text-[#0F1B3D]">
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="relative">
            <InputField label="WhatsApp Number" type="tel" value={f('whatsappNumber')} onChange={(v) => updateField('whatsappNumber', v)} placeholder="+91 98765 43210" />
            {f('whatsappNumber') && (
              <button type="button" onClick={() => copyToClipboard(f('whatsappNumber'))} className="absolute right-3 top-8 text-[#6F7192] hover:text-[#0F1B3D]">
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <InputField label="Alternate Phone Number" type="tel" value={f('alternatePhone')} onChange={(v) => updateField('alternatePhone', v)} placeholder="+91 98765 43210" />
          <InputField label="Toll-Free Number (optional)" type="tel" value={f('tollFreeNumber')} onChange={(v) => updateField('tollFreeNumber', v)} placeholder="1800-123-4567" />
        </div>
      </SectionCard>

      <SectionCard title="Address Information" description="Office and billing addresses.">
        <div className="space-y-4">
          <InputField label="Address Line 1" value={f('addressLine1')} onChange={(v) => updateField('addressLine1', v)} placeholder="123, Main Street" />
          <div className="grid gap-4 md:grid-cols-2">
            <InputField label="Address Line 2" value={f('addressLine2')} onChange={(v) => updateField('addressLine2', v)} placeholder="Near City Center" />
            <InputField label="Landmark" value={f('landmark')} onChange={(v) => updateField('landmark', v)} placeholder="Opposite Park" />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <InputField label="City" value={f('city')} onChange={(v) => updateField('city', v)} placeholder="Bengaluru" />
            <InputField label="State" value={f('state')} onChange={(v) => updateField('state', v)} placeholder="Karnataka" />
            <InputField label="Country" value={f('country')} onChange={(v) => updateField('country', v)} placeholder="India" />
            <InputField label="Postal Code" value={f('postalCode')} onChange={(v) => updateField('postalCode', v)} placeholder="560001" />
          </div>
          <Divider />
          <ToggleField label="Billing address same as office address" description="Use the same address for billing purposes." checked={billingSame} onChange={(v) => updateField('billingSameAsOffice', v)} />
          {!billingSame && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6F7192]">Billing Address</div>
              <InputField label="Billing Address Line 1" value={f('billingAddressLine1')} onChange={(v) => updateField('billingAddressLine1', v)} />
              <div className="grid gap-4 md:grid-cols-2">
                <InputField label="Billing Address Line 2" value={f('billingAddressLine2')} onChange={(v) => updateField('billingAddressLine2', v)} />
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <InputField label="City" value={f('billingCity')} onChange={(v) => updateField('billingCity', v)} />
                <InputField label="State" value={f('billingState')} onChange={(v) => updateField('billingState', v)} />
                <InputField label="Country" value={f('billingCountry')} onChange={(v) => updateField('billingCountry', v)} />
                <InputField label="Postal Code" value={f('billingPostalCode')} onChange={(v) => updateField('billingPostalCode', v)} />
              </div>
            </motion.div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Social Media Links" description="Connect your social media profiles.">
        <div className="grid gap-4 md:grid-cols-2">
          {Object.keys(SOCIAL_LABELS).map((key) => (
            <div key={key} className="relative">
              <InputField
                label={`${SOCIAL_ICONS[key] ?? '🔗'} ${SOCIAL_LABELS[key]}`}
                type="url"
                value={f(key)}
                onChange={(v) => updateField(key, v)}
                placeholder={`https://${key.replace('Url', '').toLowerCase()}.com/...`}
                error={f(key) && !/^https?:\/\/.+/.test(f(key)) ? 'Enter a valid URL' : undefined}
              />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

function BrandingTab({ form, updateField, f, fb, triggerFileInput, uploading }: {
  form: Record<string, unknown>
  updateField: (key: string, value: unknown) => void
  f: (key: string) => string
  fb: (key: string) => boolean
  triggerFileInput: (field: string) => void
  uploading: string | null
}) {
  const imageFields = [
    { key: 'logoUrl', label: 'Logo' },
    { key: 'darkLogoUrl', label: 'Dark Logo' },
    { key: 'faviconUrl', label: 'Favicon' },
    { key: 'invoiceLogoUrl', label: 'Invoice Logo' },
    { key: 'emailLogoUrl', label: 'Email Header Logo' },
  ]

  return (
    <div className="space-y-6">
      <SectionCard title="Branding Images" description="Upload logos and icons used across the website, invoices, and emails.">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {imageFields.map(({ key, label }) => (
            <div key={key} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-2 text-xs font-medium text-[#aeb8d8]">{label}</div>
              {f(key) ? (
                <div className="space-y-2">
                  <div className="relative flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                    <Image src={f(key)} alt={`${label} preview`} width={320} height={96} loading="lazy" unoptimized className="max-h-20 max-w-full object-contain" />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => triggerFileInput(key)} disabled={uploading === key}
                      className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] text-[#6F7192] transition hover:bg-gray-200 disabled:opacity-50"
                    >
                      {uploading === key ? 'Uploading...' : 'Replace'}
                    </button>
                    <button type="button" onClick={() => updateField(key, '')}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] text-rose-600 transition hover:bg-rose-400/15"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => triggerFileInput(key)} disabled={uploading === key}
                  className="flex w-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50/50 py-8 text-[11px] text-[#6F7192] transition hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50"
                >
                  {uploading === key ? 'Uploading...' : 'Click to upload'}
                </button>
              )}
              <div className="mt-1.5 text-[9px] text-[#6F7192]">PNG, WebP, SVG. Max 2MB</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Brand Colors" description="Primary and secondary brand colors used across the UI and exports.">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1.5 text-xs font-medium text-[#aeb8d8]">Primary Color</div>
            <div className="flex gap-3">
              <input type="color" value={f('primaryColor') || '#6d28d9'} onChange={(e) => updateField('primaryColor', e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-lg border border-gray-200 bg-transparent" />
              <input type="text" value={f('primaryColor')} onChange={(e) => updateField('primaryColor', e.target.value)}
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#0F1B3D] outline-none transition focus:border-[#6d28d9]/30"
                placeholder="#6d28d9" />
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-medium text-[#aeb8d8]">Secondary Color</div>
            <div className="flex gap-3">
              <input type="color" value={f('secondaryColor') || '#a855f7'} onChange={(e) => updateField('secondaryColor', e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-lg border border-gray-200 bg-transparent" />
              <input type="text" value={f('secondaryColor')} onChange={(e) => updateField('secondaryColor', e.target.value)}
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#0F1B3D] outline-none transition focus:border-[#6d28d9]/30"
                placeholder="#a855f7" />
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function InvoicingTab({ form, updateField, f, fn, fb, triggerFileInput, uploading, cartDiscountTiers, onAddCartDiscountTier, onDeleteCartDiscountTier, onUpdateCartDiscountTier }: {
  form: Record<string, unknown>
  updateField: (key: string, value: unknown) => void
  f: (key: string) => string
  fn: (key: string) => number
  fb: (key: string) => boolean
  triggerFileInput: (field: string) => void
  uploading: string | null
  cartDiscountTiers: CartDiscountTier[]
  onAddCartDiscountTier: () => void
  onDeleteCartDiscountTier: (index: number) => void
  onUpdateCartDiscountTier: (index: number, field: keyof CartDiscountTier, value: number) => void
}) {
  return (
    <div className="space-y-6">
      <SectionCard title="Invoice & Quotation Settings" description="Configure how invoices and quotations are generated.">
        <div className="grid gap-4 md:grid-cols-3">
          <InputField label="Invoice Prefix" value={f('invoicePrefix')} onChange={(v) => updateField('invoicePrefix', v)} placeholder="INV-" />
          <InputField label="Quotation Prefix" value={f('quotationPrefix')} onChange={(v) => updateField('quotationPrefix', v)} placeholder="QTN-" />
          <InputField label="Starting Invoice Number" type="number" value={String(fn('invoiceStartNumber'))} onChange={(v) => updateField('invoiceStartNumber', Number(v))} />
          <InputField label="Starting Quotation Number" type="number" value={String(fn('quotationStartNumber'))} onChange={(v) => updateField('quotationStartNumber', Number(v))} />
          <SelectField label="Default Currency" options={CURRENCIES} value={f('currency')} onChange={(v) => updateField('currency', v)} />
          <SelectField label="Currency Symbol" options={CURRENCY_SYMBOLS} value={f('currencySymbol')} onChange={(v) => updateField('currencySymbol', v)} />
          <InputField label="Tax Percentage (%)" type="number" value={String(fn('taxPercentage'))} onChange={(v) => updateField('taxPercentage', Number(v))} />
          <InputField
            label="Overhead Percentage (%)"
            type="number"
            value={String(fn('overheadPercentage'))}
            onChange={(v) => updateField('overheadPercentage', Number(v))}
            placeholder="15"
          />
          <InputField
            label="Margin Percentage (%)"
            type="number"
            value={String(fn('marginPercentage'))}
            onChange={(v) => updateField('marginPercentage', Number(v))}
            placeholder="30"
          />
          <InputField
            label="Material Markup (%)"
            type="number"
            value={String(fn('materialMarkupPercent'))}
            onChange={(v) => updateField('materialMarkupPercent', Number(v))}
            placeholder="15"
          />
          <InputField
            label="Print Speed (g/hour)"
            type="number"
            value={String(fn('printSpeedGramsPerHour'))}
            onChange={(v) => updateField('printSpeedGramsPerHour', Number(v))}
            placeholder="14.5"
          />
          <InputField label="SAC / HSN Code" value={f('sacHsnCode')} onChange={(v) => updateField('sacHsnCode', v)} placeholder="9983" />
        </div>
        <Divider />
        <TextAreaField label="Payment Terms" value={f('paymentTerms')} onChange={(v) => updateField('paymentTerms', v)} rows={2} placeholder="Payment due within 15 days from invoice date." />
      </SectionCard>

      <SectionCard title="Post-processing Multipliers" description="Configure finishing charges as multipliers applied to item production cost and difficulty.">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { key: 'none', label: 'None' },
            { key: 'sanded', label: 'Sanded' },
            { key: 'sanded-painted', label: 'Sanded + Painted' },
          ].map((option) => {
            const multipliers = form.postProcessingMultipliers as Record<string, number> | undefined
            return (
              <InputField
                key={option.key}
                label={option.label}
                type="number"
                value={String(Number(multipliers?.[option.key] ?? 0))}
                onChange={(v) => updateField('postProcessingMultipliers', {
                  ...(multipliers ?? {}),
                  [option.key]: Number(v),
                })}
              />
            )
          })}
        </div>
      </SectionCard>

      <SectionCard title="Cart Discount" description="Configure value-based discount tiers for instant quote pricing.">
        <div className="space-y-4">
          <ToggleField
            label="Enable Cart Discounts"
            description="Apply the highest matching cart discount tier when the subtotal reaches the threshold."
            checked={fb('cartDiscountEnabled')}
            onChange={(v) => updateField('cartDiscountEnabled', v)}
          />

          <div className="overflow-hidden rounded-2xl border border-gray-200">
            <div className="grid grid-cols-[1.2fr_1fr_auto] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6F7192]">
              <div>Min cart value (₹)</div>
              <div>Discount %</div>
              <div className="text-right">Action</div>
            </div>
            <div className="divide-y divide-gray-200 bg-white">
              {cartDiscountTiers.length === 0 ? (
                <div className="px-4 py-5 text-sm text-[#6F7192]">
                  No tiers configured. Add one to enable cart-value discounts.
                </div>
              ) : (
                cartDiscountTiers.map((tier, index) => (
                  <div key={`${tier.minCartValue}-${tier.discountPercent}-${index}`} className="grid grid-cols-[1.2fr_1fr_auto] gap-3 px-4 py-3">
                    <InputField
                      label=""
                      type="number"
                      value={String(tier.minCartValue)}
                      onChange={(v) => onUpdateCartDiscountTier(index, 'minCartValue', Number(v))}
                      placeholder="2000"
                    />
                    <InputField
                      label=""
                      type="number"
                      value={String(tier.discountPercent)}
                      onChange={(v) => onUpdateCartDiscountTier(index, 'discountPercent', Number(v))}
                      placeholder="5"
                    />
                    <div className="flex items-end justify-end">
                      <button
                        type="button"
                        onClick={() => onDeleteCartDiscountTier(index)}
                        className="inline-flex h-10 items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-medium text-rose-600 transition hover:bg-rose-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onAddCartDiscountTier}
            className="inline-flex items-center gap-2 rounded-xl border border-[#6d28d9]/20 bg-[#6d28d9]/10 px-4 py-2.5 text-sm font-medium text-[#6d28d9] transition hover:bg-[#6d28d9]/15"
          >
            <Plus className="h-4 w-4" />
            Add Tier
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Bank Details" description="Bank account information for payments and refunds.">
        <div className="grid gap-4 md:grid-cols-2">
          <InputField label="Bank Account Name" value={f('bankAccountName')} onChange={(v) => updateField('bankAccountName', v)} placeholder="Your Name" />
          <InputField label="Bank Name" value={f('bankName')} onChange={(v) => updateField('bankName', v)} placeholder="HDFC Bank" />
          <InputField label="Account Number" value={f('accountNumber')} onChange={(v) => updateField('accountNumber', v)} placeholder="12345678901234" />
          <InputField label="IFSC Code" value={f('ifscCode')} onChange={(v) => updateField('ifscCode', v)} placeholder="HDFC0001234" />
        </div>
        <Divider />
        <div className="grid gap-4 md:grid-cols-2">
          <InputField label="UPI ID" value={f('upiId')} onChange={(v) => updateField('upiId', v)} placeholder="name@upi" />
          <div>
            <div className="mb-1.5 text-xs font-medium text-[#aeb8d8]">UPI QR Code</div>
            {f('upiQrCodeUrl') ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                  <Image src={f('upiQrCodeUrl')} alt="UPI QR Code" width={160} height={160} loading="lazy" unoptimized className="max-h-28 max-w-full object-contain" />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => triggerFileInput('upiQrCodeUrl')} disabled={uploading === 'upiQrCodeUrl'}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] text-[#6F7192] hover:bg-gray-200 disabled:opacity-50"
                  >
                    {uploading === 'upiQrCodeUrl' ? 'Uploading...' : 'Replace'}
                  </button>
                  <button type="button" onClick={() => updateField('upiQrCodeUrl', '')}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] text-rose-600 hover:bg-rose-400/15"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => triggerFileInput('upiQrCodeUrl')} disabled={uploading === 'upiQrCodeUrl'}
                className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50/50 py-8 text-[11px] text-[#6F7192] hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50"
              >
                {uploading === 'upiQrCodeUrl' ? 'Uploading...' : 'Click to upload QR Code'}
              </button>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function CommunicationTab({ form, updateField, f, fb, copyToClipboard }: {
  form: Record<string, unknown>
  updateField: (key: string, value: unknown) => void
  f: (key: string) => string
  fb: (key: string) => boolean
  copyToClipboard: (text: string) => void
}) {
  return (
    <div className="space-y-6">
      <SectionCard title="WhatsApp & Communication" description="Configure WhatsApp numbers and message templates.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="relative">
            <InputField label="WhatsApp Order Notification Number" type="tel" value={f('whatsappOrderNumber')} onChange={(v) => updateField('whatsappOrderNumber', v)} placeholder="+91 98765 43210" />
            {f('whatsappOrderNumber') && (
              <button type="button" onClick={() => copyToClipboard(f('whatsappOrderNumber'))} className="absolute right-3 top-8 text-[#6F7192] hover:text-[#0F1B3D]">
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="relative">
            <InputField label="WhatsApp Support Number" type="tel" value={f('whatsappSupportNumber')} onChange={(v) => updateField('whatsappSupportNumber', v)} placeholder="+91 98765 43210" />
            {f('whatsappSupportNumber') && (
              <button type="button" onClick={() => copyToClipboard(f('whatsappSupportNumber'))} className="absolute right-3 top-8 text-[#6F7192] hover:text-[#0F1B3D]">
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <Divider />
        <div className="space-y-4">
          <div>
            <TextAreaField label="Default WhatsApp Message Template" value={f('defaultWhatsappTemplate')} onChange={(v) => updateField('defaultWhatsappTemplate', v)} rows={3} placeholder="Hi {name}, your order #{orderNumber} has been received..." />
            <div className="mt-1 flex justify-between text-[10px] text-[#6F7192]">
              <span>Available variables: {'{name}'}, {'{orderNumber}'}, {'{orderStatus}'}</span>
              <span>{f('defaultWhatsappTemplate').length} / 1000</span>
            </div>
          </div>
          <TextAreaField label="Auto-reply Message" value={f('autoReplyMessage')} onChange={(v) => updateField('autoReplyMessage', v)} rows={3} placeholder="Thank you for reaching out! We'll get back to you shortly." />
        </div>
        <Divider />
        <div className="grid gap-4 md:grid-cols-2">
          <InputField label="Business Hours" value={f('businessHours')} onChange={(v) => updateField('businessHours', v)} placeholder="Mon-Sat: 10:00 AM - 7:00 PM" />
          <TextAreaField label="Support Availability Message" value={f('supportAvailabilityMessage')} onChange={(v) => updateField('supportAvailabilityMessage', v)} rows={2} placeholder="We are available during business hours..." />
        </div>
      </SectionCard>
    </div>
  )
}

function SEOTab({ form, updateField, f, fb, triggerFileInput, uploading }: {
  form: Record<string, unknown>
  updateField: (key: string, value: unknown) => void
  f: (key: string) => string
  fb: (key: string) => boolean
  triggerFileInput: (field: string) => void
  uploading: string | null
}) {
  return (
    <div className="space-y-6">
      <SectionCard title="SEO & Metadata" description="Search engine optimization settings for your website.">
        <div className="space-y-4">
          <InputField label="Meta Title" value={f('metaTitle')} onChange={(v) => updateField('metaTitle', v)} placeholder="Flux3D - Professional 3D Printing Services" />
          <TextAreaField label="Meta Description" value={f('metaDescription')} onChange={(v) => updateField('metaDescription', v)} rows={2} placeholder="Professional 3D printing services..." />
          <InputField label="Meta Keywords" value={f('metaKeywords')} onChange={(v) => updateField('metaKeywords', v)} placeholder="3D printing, prototyping, manufacturing" />
          <InputField label="Canonical URL" type="url" value={f('canonicalUrl')} onChange={(v) => updateField('canonicalUrl', v)} placeholder="https://flux3d.in" />
          <ToggleField label="Robots Index" description="Allow search engines to index your site." checked={fb('robotsIndex')} onChange={(v) => updateField('robotsIndex', v)} />
        </div>
        <Divider />
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1.5 text-xs font-medium text-[#aeb8d8]">Open Graph Image (1200x630)</div>
            {f('ogImageUrl') ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50/50 p-2">
                  <Image src={f('ogImageUrl')} alt="Open Graph image preview" width={1200} height={630} loading="lazy" unoptimized className="max-h-24 max-w-full rounded object-contain" />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => triggerFileInput('ogImageUrl')} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] text-[#6F7192] hover:bg-gray-200">Replace</button>
                  <button type="button" onClick={() => updateField('ogImageUrl', '')} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] text-rose-600 hover:bg-rose-400/15">Remove</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => triggerFileInput('ogImageUrl')} disabled={uploading === 'ogImageUrl'}
                className="flex w-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50/50 py-8 text-[11px] text-[#6F7192] hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50"
              >
                {uploading === 'ogImageUrl' ? 'Uploading...' : 'Click to upload'}
              </button>
            )}
          </div>
          <div>
            <div className="mb-1.5 text-xs font-medium text-[#aeb8d8]">Twitter Meta Image (1200x600)</div>
            {f('twitterImageUrl') ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50/50 p-2">
                  <Image src={f('twitterImageUrl')} alt="Twitter image preview" width={1200} height={600} loading="lazy" unoptimized className="max-h-24 max-w-full rounded object-contain" />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => triggerFileInput('twitterImageUrl')} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] text-[#6F7192] hover:bg-gray-200">Replace</button>
                  <button type="button" onClick={() => updateField('twitterImageUrl', '')} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] text-rose-600 hover:bg-rose-400/15">Remove</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => triggerFileInput('twitterImageUrl')} disabled={uploading === 'twitterImageUrl'}
                className="flex w-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50/50 py-8 text-[11px] text-[#6F7192] hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50"
              >
                {uploading === 'twitterImageUrl' ? 'Uploading...' : 'Click to upload'}
              </button>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function EmailTab({ form, updateField, f, fn }: {
  form: Record<string, unknown>
  updateField: (key: string, value: unknown) => void
  f: (key: string) => string
  fn: (key: string) => number
}) {
  const [testing, setTesting] = useState(false)

  const handleTestEmail = async () => {
    setTesting(true)
    await new Promise((r) => setTimeout(r, 1500))
    setTesting(false)
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Email Configuration" description="SMTP settings for sending transactional emails. This section is optional.">
        <div className="grid gap-4 md:grid-cols-2">
          <InputField label="SMTP Host" value={f('smtpHost')} onChange={(v) => updateField('smtpHost', v)} placeholder="smtp.gmail.com" />
          <InputField label="SMTP Port" type="number" value={String(fn('smtpPort') || '')} onChange={(v) => updateField('smtpPort', Number(v))} placeholder="587" />
          <InputField label="SMTP Username" value={f('smtpUsername')} onChange={(v) => updateField('smtpUsername', v)} placeholder="your@email.com" />
          <InputField label="SMTP Password" type="password" value={f('smtpPassword')} onChange={(v) => updateField('smtpPassword', v)} placeholder="••••••••" />
          <InputField label="Sender Name" value={f('smtpSenderName')} onChange={(v) => updateField('smtpSenderName', v)} placeholder="Flux3D" />
          <InputField label="Sender Email" type="email" value={f('smtpSenderEmail')} onChange={(v) => updateField('smtpSenderEmail', v)} placeholder="noreply@flux3d.in" />
        </div>
        <Divider />
        <button
          type="button"
          onClick={handleTestEmail}
          disabled={testing || !f('smtpHost') || !f('smtpUsername')}
          className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-xs font-medium text-cyan-600 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {testing ? 'Sending...' : 'Test Email Configuration'}
        </button>
      </SectionCard>
    </div>
  )
}

function LegalOpsTab({ form, updateField, f, fn, fb }: {
  form: Record<string, unknown>
  updateField: (key: string, value: unknown) => void
  f: (key: string) => string
  fn: (key: string) => number
  fb: (key: string) => boolean
}) {
  return (
    <div className="space-y-6">
      <SectionCard title="Legal & Policies" description="Links to your legal pages.">
        <div className="grid gap-4 md:grid-cols-2">
          <InputField label="Privacy Policy URL" type="url" value={f('privacyPolicyUrl')} onChange={(v) => updateField('privacyPolicyUrl', v)} placeholder="https://flux3d.in/privacy" />
          <InputField label="Terms & Conditions URL" type="url" value={f('termsUrl')} onChange={(v) => updateField('termsUrl', v)} placeholder="https://flux3d.in/terms" />
          <InputField label="Refund Policy URL" type="url" value={f('refundPolicyUrl')} onChange={(v) => updateField('refundPolicyUrl', v)} placeholder="https://flux3d.in/refund" />
          <InputField label="Shipping Policy URL" type="url" value={f('shippingPolicyUrl')} onChange={(v) => updateField('shippingPolicyUrl', v)} placeholder="https://flux3d.in/shipping" />
        </div>
      </SectionCard>

      <SectionCard title="Business Operational Settings" description="Configure business operations, working hours, and delivery.">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Working Days" options={WORKING_DAYS} value={f('workingDays')} onChange={(v) => updateField('workingDays', v)} />
          <InputField label="Working Hours" value={f('workingHours')} onChange={(v) => updateField('workingHours', v)} placeholder="10:00 AM - 7:00 PM" />
          <TextAreaField label="Holiday Message" value={f('holidayMessage')} onChange={(v) => updateField('holidayMessage', v)} rows={2} placeholder="We are closed on public holidays." />
          <InputField label="Emergency Contact" type="tel" value={f('emergencyContact')} onChange={(v) => updateField('emergencyContact', v)} placeholder="+91 98765 43210" />
          <InputField label="Order Processing Time" value={f('orderProcessingTime')} onChange={(v) => updateField('orderProcessingTime', v)} placeholder="2-3 business days" />
          <InputField label="Delivery Charge Threshold (₹)" type="number" value={String(fn('deliveryChargeThreshold'))} onChange={(v) => updateField('deliveryChargeThreshold', Number(v))} />
          <InputField label="Default Delivery Charge (₹)" type="number" value={String(fn('defaultDeliveryCharge'))} onChange={(v) => updateField('defaultDeliveryCharge', Number(v))} />
          <div className="md:col-span-2">
            <div className="grid gap-4 md:grid-cols-2">
              <ToggleField label="Pickup Available" description="Allow customers to pick up orders in person." checked={fb('pickupAvailable')} onChange={(v) => updateField('pickupAvailable', v)} />
              <ToggleField label="COD Available" description="Allow Cash on Delivery as a payment method." checked={fb('codAvailable')} onChange={(v) => updateField('codAvailable', v)} />
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
