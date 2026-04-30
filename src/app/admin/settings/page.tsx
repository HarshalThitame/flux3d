'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, Save, Shield, Printer, Tag, Bell, Users, Link, CreditCard } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import { InputField, ToggleField } from '@/components/admin/FormField'
import SkeletonBlock from '@/components/admin/SkeletonBlock'
import type { PrinterStatus } from '@/lib/admin/types'

type Tab = 'general' | 'printers' | 'pricing' | 'notifications' | 'team' | 'integrations' | 'billing'

export default function AdminSettingsPage() {
  const [toast, setToast] = useState<AdminToastState>(null)
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [rushEnabled, setRushEnabled] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [printers, setPrinters] = useState<PrinterStatus[] | null>(null)
  const [printersError, setPrintersError] = useState<string | null>(null)

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
  }, [activeTab, printers, printersError])

  const handleSave = () => {
    setToast({ type: 'success', message: 'Settings saved successfully.' })
  }

  const tabs = [
    { id: 'general' as Tab, label: 'General', icon: Settings },
    { id: 'printers' as Tab, label: 'Printers', icon: Printer },
    { id: 'pricing' as Tab, label: 'Pricing', icon: Tag },
    { id: 'notifications' as Tab, label: 'Notifications', icon: Bell },
    { id: 'team' as Tab, label: 'Team', icon: Users },
    { id: 'integrations' as Tab, label: 'Integrations', icon: Link },
    { id: 'billing' as Tab, label: 'Billing', icon: CreditCard },
  ]

  return (
    <>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#7a82a0]/20 bg-[#7a82a0]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#8b95b5]">
            <Settings className="h-3 w-3" />
            Configuration
          </div>
          <h1 className="mt-2 font-[var(--font-syne)] text-3xl font-bold tracking-tight text-white">Settings</h1>
          <p className="mt-2 max-w-xl text-sm text-[#7a82a0]">
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
                        ? 'bg-[#FF5C1A]/15 text-white'
                        : 'text-[#8b95b5] hover:bg-white/[0.04] hover:text-white'
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
            {activeTab === 'general' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <SectionCard title="Business Info">
                  <div className="space-y-3">
                    <InputField label="Business Name" value="" />
                    <InputField label="Tagline" value="" />
                    <InputField label="Email" value="" />
                    <InputField label="Phone" value="" />
                    <InputField label="WhatsApp Business" value="" />
                    <InputField label="GST Number" value="" />
                    <InputField label="PAN" value="" />
                    <InputField label="Address Line 1" value="" />
                    <InputField label="Address Line 2" value="" />
                    <InputField label="City" value="" />
                    <InputField label="State" value="" />
                    <InputField label="PIN" value="" />
                    <InputField label="Country" value="" />
                  </div>
                </SectionCard>

                <SectionCard title="Working Hours">
                  <div className="space-y-3">
                    <InputField label="Hours" value="" />
                    <ToggleField
                      label="Holiday Mode"
                      description="Toggle off to disable new orders"
                      checked={false}
                      onChange={() => {}}
                    />
                  </div>
                </SectionCard>

                <SectionCard title="Save Changes">
                  <p className="text-sm text-[#7a82a0]">
                    Settings are ready for server actions or API integration.
                  </p>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#FF5C1A] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    <Save className="h-4 w-4" />
                    Save Changes
                  </button>
                </SectionCard>
              </motion.div>
            )}

            {activeTab === 'printers' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <SectionCard title="Printer Management">
                  <div className="mb-4">
                    <button className="rounded-xl bg-[#FF5C1A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#FF5C1A]/90">
                      + Add Printer
                    </button>
                  </div>
                  {printersError ? (
                    <div className="rounded-xl border border-rose-400/15 bg-rose-400/10 p-4 text-rose-100">
                      {printersError}
                    </div>
                  ) : !printers ? (
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <SkeletonBlock key={index} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : printers.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-[#080c18] p-8 text-center text-sm text-[#7a82a0]">
                      No printers configured yet. Click "+ Add Printer" to get started.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {printers.map((printer) => (
                        <div key={printer.id} className="rounded-xl border border-white/10 bg-[#080c18] p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="font-medium text-white">{printer.name}</div>
                            <div className="flex gap-2">
                              <button className="text-[#FF5C1A] hover:text-[#FF9A72] text-sm">Edit</button>
                              <button className="text-[#8b95b5] hover:text-white text-sm">Deactivate</button>
                            </div>
                          </div>
                          <div className="text-xs text-[#7a82a0]">
                            {printer.model && `Model: ${printer.model} · `}
                            Status: {printer.status}
                            {printer.job && ` · Current Job: ${printer.job}`}
                          </div>
                          <div className="mt-2">
                            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                              printer.status === 'Printing' || printer.status === 'Idle' ? 'bg-emerald-400/20 text-emerald-400' :
                              printer.status === 'Maintenance' ? 'bg-yellow-400/20 text-yellow-400' :
                              'bg-gray-400/20 text-gray-400'
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
                <SectionCard title="Base Pricing Rules">
                  <div className="space-y-3">
                    <InputField label="FDM Print (per gram)" value="0" />
                    <InputField label="Resin Print (per gram)" value="0" />
                    <InputField label="Multi-Color Surcharge" value="0" />
                    <InputField label="Express 24hr Surcharge" value="0" />
                    <InputField label="Bulk Discount (10+ parts)" value="0" />
                    <InputField label="Design / Modeling" value="0" />
                    <InputField label="Shipping — Local (Mumbai)" value="0" />
                    <InputField label="Shipping — Pan India" value="0" />
                    <InputField label="Free Shipping Above" value="0" />
                    <InputField label="GST Rate" value="0" />
                  </div>
                </SectionCard>

                <SectionCard title="Save Changes">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#FF5C1A] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    <Save className="h-4 w-4" />
                    Save Changes
                  </button>
                </SectionCard>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <SectionCard title="Notification Preferences">
                  <div className="space-y-3">
                    <ToggleField label="Email alert on new order" description="Receive email when new orders are placed" checked={false} onChange={() => {}} />
                    <ToggleField label="WhatsApp alert on new order" description="Get WhatsApp notifications for new orders" checked={false} onChange={() => {}} />
                    <ToggleField label="Email alert on low inventory" description="Alert when materials fall below threshold" checked={false} onChange={() => {}} />
                    <ToggleField label="SMS on order shipped" description="Send SMS when orders are shipped" checked={false} onChange={() => {}} />
                    <ToggleField label="Daily revenue summary email" description="Daily email with revenue summary" checked={false} onChange={() => {}} />
                    <ToggleField label="Weekly analytics report" description="Weekly email with analytics" checked={false} onChange={() => {}} />
                    <ToggleField label="Printer error alert" description="Immediate alert on printer errors" checked={false} onChange={() => {}} />
                    <ToggleField label="New support ticket alert" description="Notification for new support tickets" checked={false} onChange={() => {}} />
                    <ToggleField label="Payment failure alert" description="Alert when payments fail" checked={false} onChange={() => {}} />
                  </div>
                </SectionCard>

                <SectionCard title="Notification Contacts">
                  <div className="space-y-3">
                    <InputField label="Notification Email" value="" placeholder="admin@flux3d.in" />
                    <InputField label="WhatsApp Alert Number" value="" placeholder="+91 98765 00000" />
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {activeTab === 'team' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <SectionCard title="Team Members">
                  <div className="mb-4">
                    <button className="rounded-xl bg-[#FF5C1A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#FF5C1A]/90">
                      + Invite Member
                    </button>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#080c18] p-8 text-center text-sm text-[#7a82a0]">
                    No team members yet. Click "+ Invite Member" to get started.
                  </div>
                </SectionCard>

                <SectionCard title="Invite Member">
                  <div className="space-y-3">
                    <InputField label="Email Address" placeholder="email@example.com" />
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#7a82a0]">Role</label>
                      <select className="rounded-xl border border-white/10 bg-[#080c18] px-4 py-2.5 text-sm text-white">
                        <option value="super-admin">Super Admin</option>
                        <option value="admin">Admin</option>
                        <option value="operator">Operator</option>
                        <option value="support-agent">Support Agent</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                    <button className="rounded-xl bg-[#FF5C1A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#FF5C1A]/90">
                      Send Invite
                    </button>
                  </div>
                </SectionCard>

                <SectionCard title="Roles Explained">
                  <div className="space-y-2 text-sm text-[#7a82a0]">
                    <div><strong className="text-white">Super Admin:</strong> Full access including billing and settings</div>
                    <div><strong className="text-white">Admin:</strong> Access to all except billing</div>
                    <div><strong className="text-white">Operator:</strong> Orders, printers, inventory only</div>
                    <div><strong className="text-white">Support Agent:</strong> Tickets and customers only</div>
                    <div><strong className="text-white">Viewer:</strong> Read-only access</div>
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {activeTab === 'integrations' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <SectionCard title="Payment & Shipping Integrations">
                  <div className="space-y-3">
                    {['Razorpay', 'Shiprocket', 'Delhivery'].map((name) => (
                      <div key={name} className="flex items-center justify-between rounded-xl border border-white/10 bg-[#080c18] p-4">
                        <div>
                          <div className="font-medium text-white">{name}</div>
                          <div className="text-sm text-[#7a82a0]">Not Connected</div>
                        </div>
                        <button className="rounded-lg bg-[#FF5C1A] px-3 py-1.5 text-xs font-semibold text-white">
                          Connect
                        </button>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="Communication & Storage">
                  <div className="space-y-3">
                    {['WhatsApp Business API', 'Google Analytics', 'Supabase Storage'].map((name) => (
                      <div key={name} className="flex items-center justify-between rounded-xl border border-white/10 bg-[#080c18] p-4">
                        <div>
                          <div className="font-medium text-white">{name}</div>
                          <div className="text-sm text-[#7a82a0]">Not Connected</div>
                        </div>
                        <button className="rounded-lg bg-[#FF5C1A] px-3 py-1.5 text-xs font-semibold text-white">
                          Connect
                        </button>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="Accounting & Alerts">
                  <div className="space-y-3">
                    {['Tally / GST Software', 'Slack Alerts'].map((name) => (
                      <div key={name} className="flex items-center justify-between rounded-xl border border-white/10 bg-[#080c18] p-4">
                        <div>
                          <div className="font-medium text-white">{name}</div>
                          <div className="text-sm text-[#7a82a0]">Not Connected</div>
                        </div>
                        <button className="rounded-lg bg-[#FF5C1A] px-3 py-1.5 text-xs font-semibold text-white">
                          Connect
                        </button>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {activeTab === 'billing' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <SectionCard title="Your SaaS Plan">
                  <div className="mb-4">
                    <div className="mb-2 text-2xl font-bold text-white">No Plan Selected</div>
                    <div className="mb-4 text-sm text-[#7a82a0]">
                      Next Billing Date: N/A · Payment Method: Not Set
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-[#c6cee5]">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        No features enabled
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button className="rounded-xl bg-[#FF5C1A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#FF5C1A]/90">
                      Upgrade to Enterprise
                    </button>
                    <button className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-[#c6cee5] transition hover:bg-white/[0.04]">
                      Manage Billing
                    </button>
                    <button className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-[#c6cee5] transition hover:bg-white/[0.04]">
                      Download Invoice
                    </button>
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
    <div className="rounded-2xl border border-white/[0.06] bg-[#0a0f1e] p-5">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  )
}
