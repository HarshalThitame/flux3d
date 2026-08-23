'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Settings, Save } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import { InputField } from '@/components/admin/FormField'
import ShippingRulesManager from '@/components/admin/ShippingRulesManager'

type PricingSettingsForm = {
  deliveryChargeThreshold: string
  defaultDeliveryCharge: string
  shopMinimumOrderValue: string
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const [toast, setToast] = useState<AdminToastState>(null)
  const [pricingSettings, setPricingSettings] = useState<PricingSettingsForm>({
    deliveryChargeThreshold: '349',
    defaultDeliveryCharge: '50',
    shopMinimumOrderValue: '0',
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
    if (pricingHydrated) return

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
            shopMinimumOrderValue?: number | null
          } | null
        }

        setPricingSettings({
          deliveryChargeThreshold: String(json.settings?.deliveryChargeThreshold ?? 349),
          defaultDeliveryCharge: String(json.settings?.defaultDeliveryCharge ?? 50),
          shopMinimumOrderValue: String(json.settings?.shopMinimumOrderValue ?? 0),
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
  }, [pricingHydrated, router])

  const handlePricingSave = async () => {
    setPricingSaving(true)
    setPricingError(null)
    try {
      const deliveryChargeThreshold = Number(pricingSettings.deliveryChargeThreshold)
      const defaultDeliveryCharge = Number(pricingSettings.defaultDeliveryCharge)
      const shopMinimumOrderValue = Number(pricingSettings.shopMinimumOrderValue || '0')

      if (!Number.isFinite(deliveryChargeThreshold) || deliveryChargeThreshold < 0) {
        throw new Error('Enter a valid delivery threshold.')
      }

      if (!Number.isFinite(defaultDeliveryCharge) || defaultDeliveryCharge < 0) {
        throw new Error('Enter a valid delivery charge.')
      }

      if (!Number.isFinite(shopMinimumOrderValue) || shopMinimumOrderValue < 0) {
        throw new Error('Enter a valid minimum order value.')
      }

      const response = await fetch('/api/admin/settings/business', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryChargeThreshold,
          defaultDeliveryCharge,
          shopMinimumOrderValue,
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
              <div className="grid gap-3 md:grid-cols-3">
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
                <InputField
                  label="Shop Minimum Order Value (₹)"
                  type="number"
                  value={pricingSettings.shopMinimumOrderValue}
                  onChange={(value) => setPricingSettings((current) => ({ ...current, shopMinimumOrderValue: value }))}
                  placeholder="0"
                />
              </div>
              <p className="text-xs text-[#6F7192]">
                Orders below the Shop Minimum Order Value cannot be delivered (set 0 to disable). Pincode-specific
                rules below can override this with their own minimum.
              </p>
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

          <SectionCard title="Shipping Rules">
            <ShippingRulesManager />
          </SectionCard>
        </motion.div>
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