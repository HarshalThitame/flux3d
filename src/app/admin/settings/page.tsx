'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Settings, Save, Printer, Tag } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import { InputField } from '@/components/admin/FormField'
import SkeletonBlock from '@/components/admin/SkeletonBlock'
import type { PrinterStatus } from '@/lib/admin/types'

type Tab = 'printers' | 'pricing'

type PricingSettingsForm = {
  deliveryChargeThreshold: string
  defaultDeliveryCharge: string
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const [toast, setToast] = useState<AdminToastState>(null)
  const [activeTab, setActiveTab] = useState<Tab>('pricing')
  const [printers, setPrinters] = useState<PrinterStatus[] | null>(null)
  const [printersError, setPrintersError] = useState<string | null>(null)
  const [pricingSettings, setPricingSettings] = useState<PricingSettingsForm>({
    deliveryChargeThreshold: '499',
    defaultDeliveryCharge: '50',
  })
  const [pricingSaving, setPricingSaving] = useState(false)
  const [pricingError, setPricingError] = useState<string | null>(null)
  const [pricingHydrated, setPricingHydrated] = useState(false)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (activeTab !== 'printers') return

    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch('/api/admin/printers', { signal: controller.signal })
        if (response.status === 401) {
          router.push('/login?next=/admin/settings')
          return
        }
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? 'Failed to load printers data.')
        }

        const json = (await response.json()) as { printers: PrinterStatus[] }
        setPrinters(json.printers)
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') {
          return
        }
        setPrintersError(loadError instanceof Error ? loadError.message : 'Failed to load printers data.')
      }
    }

    if (!printers && !printersError) {
      void load()
    }

    return () => controller.abort()
  }, [activeTab, printers, printersError, router])

  useEffect(() => {
    if (activeTab !== 'pricing' || pricingHydrated) return

    const controller = new AbortController()

    async function loadPricingSettings() {
      setPricingError(null)
      try {
        const response = await fetch('/api/admin/settings/business', { signal: controller.signal })
        if (response.status === 401) {
          router.push('/login?next=/admin/settings')
          return
        }
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? 'Failed to load pricing settings.')
        }

        const json = (await response.json()) as {
          settings: {
            deliveryChargeThreshold?: number | null
            defaultDeliveryCharge?: number | null
          } | null
        }

        setPricingSettings({
          deliveryChargeThreshold: String(json.settings?.deliveryChargeThreshold ?? 499),
          defaultDeliveryCharge: String(json.settings?.defaultDeliveryCharge ?? 50),
        })
        setPricingHydrated(true)
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') {
          return
        }
        setPricingError(loadError instanceof Error ? loadError.message : 'Failed to load pricing settings.')
        setPricingHydrated(true)
      }
    }

    void loadPricingSettings()

    return () => controller.abort()
  }, [activeTab, pricingHydrated, router])

  const handlePricingSave = async () => {
    setPricingSaving(true)
    setPricingError(null)
    try {
      const deliveryChargeThreshold = Number(pricingSettings.deliveryChargeThreshold)
      const defaultDeliveryCharge = Number(pricingSettings.defaultDeliveryCharge)

      if (!Number.isFinite(deliveryChargeThreshold) || deliveryChargeThreshold < 0) {
        throw new Error('Enter a valid delivery threshold.')
      }

      if (!Number.isFinite(defaultDeliveryCharge) || defaultDeliveryCharge < 0) {
        throw new Error('Enter a valid delivery charge.')
      }

      const response = await fetch('/api/admin/settings/business', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryChargeThreshold,
          defaultDeliveryCharge,
        }),
      })

      if (response.status === 401) {
        router.push('/login?next=/admin/settings')
        return
      }

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Failed to save pricing settings.')
      }

      setToast({ type: 'success', message: 'Delivery charges saved.' })
      setPricingHydrated(true)
    } catch (saveError) {
      setToast({
        type: 'error',
        message: saveError instanceof Error ? saveError.message : 'Failed to save pricing settings.',
      })
    } finally {
      setPricingSaving(false)
    }
  }

  const tabs = [
    { id: 'printers' as Tab, label: 'Printers', icon: Printer },
    { id: 'pricing' as Tab, label: 'Pricing', icon: Tag },
  ]

  return (
    <>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#6F7192]/20 bg-[#6F7192]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#6F7192]">
            <Settings className="h-3 w-3" />
            Configuration
          </div>
          <h1 className="mt-2 font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">Settings</h1>
          <p className="mt-2 max-w-xl text-sm text-[#6F7192]">
            Manage your business configuration
          </p>
        </motion.div>

        <div className="flex gap-6">
          <div className="hidden w-64 shrink-0 md:block">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
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

          <div className="min-w-0 flex-1">
            {activeTab === 'printers' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <SectionCard title="Printer Management">
                  <div className="mb-4">
                    <button className="rounded-xl bg-[#6d28d9] px-4 py-2 text-sm font-semibold text-[#0F1B3D] transition hover:bg-[#6d28d9]/90">
                      + Add Printer
                    </button>
                  </div>
                  {printersError ? (
                    <div className="rounded-xl border border-rose-400/15 bg-rose-50 p-4 text-rose-100">
                      {printersError}
                    </div>
                  ) : !printers ? (
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <SkeletonBlock key={index} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : printers.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-[#6F7192]">
                      No printers configured yet. Click &quot;+ Add Printer&quot; to get started.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {printers.map((printer) => (
                        <div key={printer.id} className="rounded-xl border border-gray-200 bg-white p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="font-medium text-[#0F1B3D]">{printer.name}</div>
                            <div className="flex gap-2">
                              <button className="text-[#6d28d9] hover:text-[#a855f7] text-sm">Edit</button>
                              <button className="text-[#6F7192] hover:text-[#0F1B3D] text-sm">Deactivate</button>
                            </div>
                          </div>
                          <div className="text-xs text-[#6F7192]">
                            {printer.model && `Model: ${printer.model} · `}
                            Status: {printer.status}
                            {printer.job && ` · Current Job: ${printer.job}`}
                          </div>
                          <div className="mt-2">
                            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                              printer.status === 'Printing' || printer.status === 'Idle' ? 'bg-emerald-100 text-emerald-700' :
                              printer.status === 'Maintenance' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {printer.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </motion.div>
            )}

            {activeTab === 'pricing' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <SectionCard title="Delivery Charges">
                  <div className="space-y-4">
                    <p className="text-sm text-[#6F7192]">
                      Set the free-shipping threshold and the fallback shipping fee used by 3D Shop checkout.
                    </p>
                    {pricingError && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                        {pricingError}
                      </div>
                    )}
                    {!pricingHydrated && (
                      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-[#6F7192]">
                        Loading saved delivery settings...
                      </div>
                    )}
                    <div className="grid gap-3 md:grid-cols-2">
                      <InputField
                        label="Delivery Charge Threshold (₹)"
                        type="number"
                        value={pricingSettings.deliveryChargeThreshold}
                        onChange={(value) => setPricingSettings((current) => ({ ...current, deliveryChargeThreshold: value }))}
                        placeholder="499"
                      />
                      <InputField
                        label="Default Delivery Charge (₹)"
                        type="number"
                        value={pricingSettings.defaultDeliveryCharge}
                        onChange={(value) => setPricingSettings((current) => ({ ...current, defaultDeliveryCharge: value }))}
                        placeholder="50"
                      />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void handlePricingSave()}
                        disabled={pricingSaving}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-2 text-sm font-semibold text-[#0F1B3D] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Save className="h-4 w-4" />
                        {pricingSaving ? 'Saving...' : 'Save Delivery Charges'}
                      </button>
                      <Link
                        href="/admin/settings/business"
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#6F7192] transition hover:bg-gray-100"
                      >
                        Open Business Settings
                      </Link>
                    </div>
                  </div>
                </SectionCard>
              </motion.div>
            )}
          </div>
        </div>
      </div>
      <AdminToast toast={toast} />
    </>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="text-base font-semibold text-[#0F1B3D]">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  )
}
