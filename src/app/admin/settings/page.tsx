'use client'

import { useEffect, useState } from 'react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import { InputField, ToggleField } from '@/components/admin/FormField'

export default function AdminSettingsPage() {
  const [toast, setToast] = useState<AdminToastState>(null)
  const [rushEnabled, setRushEnabled] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  useEffect(() => {
    if (!toast) {
      return
    }

    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-[32px] border border-white/10 bg-[rgba(10,16,31,0.94)] p-6">
          <h1 className="font-[var(--font-syne)] text-4xl font-extrabold text-white">Settings</h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-[#9ca7c6]">
            Configure platform defaults for pricing, delivery, notifications, and general admin preferences.
          </p>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="space-y-6">
            <section className="rounded-[28px] border border-white/10 bg-[rgba(10,16,31,0.94)] p-6">
              <h2 className="font-[var(--font-syne)] text-2xl font-bold text-white">General</h2>
              <div className="mt-5 grid gap-4">
                <InputField label="Support Email" value="ops@flux3d.in" />
                <InputField label="Default Quote Expiry" value="7 days" />
                <ToggleField
                  label="Operator notifications"
                  description="Push a notification when new quotes or orders arrive."
                  checked={notificationsEnabled}
                  onChange={setNotificationsEnabled}
                />
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-[rgba(10,16,31,0.94)] p-6">
              <h2 className="font-[var(--font-syne)] text-2xl font-bold text-white">Delivery Charges</h2>
              <div className="mt-5 grid gap-4">
                <InputField label="Free delivery threshold" value="₹499" />
                <InputField label="Flat delivery fee" value="₹50" />
                <InputField label="ETA banner copy" value="Delivered in 2-4 business days" />
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-white/10 bg-[rgba(10,16,31,0.94)] p-6">
              <h2 className="font-[var(--font-syne)] text-2xl font-bold text-white">Pricing Config</h2>
              <div className="mt-5 grid gap-4">
                <InputField label="Setup fee" value="₹120" />
                <InputField label="Support multiplier" value="1.18x" />
                <ToggleField
                  label="Rush job uplift"
                  description="Apply special pricing rules for same-day manufacturing."
                  checked={rushEnabled}
                  onChange={setRushEnabled}
                />
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-[rgba(10,16,31,0.94)] p-6">
              <h2 className="font-[var(--font-syne)] text-2xl font-bold text-white">Save Changes</h2>
              <p className="mt-3 text-sm leading-7 text-[#96a2c3]">
                Settings panels are UI-only in this implementation, but the structure is ready for server actions or API integration.
              </p>
              <button
                type="button"
                onClick={() => setToast({ type: 'success', message: 'Settings changes staged successfully.' })}
                className="mt-6 rounded-2xl bg-white px-5 py-3 text-sm font-medium text-[#091120]"
              >
                Save Settings
              </button>
            </section>
          </div>
        </div>
      </div>
      <AdminToast toast={toast} />
    </>
  )
}
