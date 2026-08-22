'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, AlertOctagon, ArrowRight, Bell, CheckCircle2, ChevronDown, Info, Menu, Search, Settings, ShieldCheck } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type AttentionItem = {
  id: string
  label: string
  count: number
  href: string
  tone: 'info' | 'warning' | 'danger'
}

type AttentionSummary = {
  total: number
  items: AttentionItem[]
}

const ATTENTION_POLL_MS = 60_000

const toneIcon: Record<AttentionItem['tone'], typeof Info> = {
  info: Info,
  warning: AlertCircle,
  danger: AlertOctagon,
}

const toneClass: Record<AttentionItem['tone'], string> = {
  info: 'bg-cyan-50 text-cyan-600',
  warning: 'bg-amber-50 text-amber-600',
  danger: 'bg-rose-50 text-rose-600',
}

export default function Topbar({
  onOpenMobileNav,
}: {
  onOpenMobileNav: () => void
}) {
  const router = useRouter()
  const [profileOpen, setProfileOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [adminName, setAdminName] = useState('Admin')
  const [adminInitials, setAdminInitials] = useState('AD')
  const [adminRole, setAdminRole] = useState('Administrator')
  const [searchQuery, setSearchQuery] = useState('')
  const [attention, setAttention] = useState<AttentionSummary | null>(null)
  const attentionRef = useRef<AttentionSummary | null>(null)

  function submitSearch() {
    const query = searchQuery.trim()
    if (!query) return
    router.push(`/admin/orders?query=${encodeURIComponent(query)}`)
  }

  useEffect(() => {
    attentionRef.current = attention
  }, [attention])

  useEffect(() => {
    async function loadAttention(showSkeleton: boolean) {
      try {
        const response = await fetch('/api/admin/attention-items')
        if (!response.ok) return
        const json = (await response.json()) as AttentionSummary
        if (typeof json?.total === 'number') {
          setAttention(json)
        }
      } catch {
        if (showSkeleton && attentionRef.current === null) {
          setAttention({ total: 0, items: [] })
        }
      }
    }

    window.setTimeout(() => void loadAttention(true), 0)

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadAttention(false)
      }
    }, ATTENTION_POLL_MS)

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void loadAttention(false)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    async function loadProfile() {
      const supabase = getSupabaseBrowserClient()
      const { data } = await supabase.auth.getUser()
      const user = data?.user
      if (user) {
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin'
        setAdminName(name)
        const initials = name.split(' ').map((s: string) => s[0]).join('').toUpperCase().slice(0, 2) || 'AD'
        setAdminInitials(initials)
        setAdminRole(user.email?.includes('admin') ? 'Super Admin' : 'Administrator')
      }
    }
    loadProfile()
  }, [])

  const attentionCount = attention?.total ?? 0

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white px-4 py-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="rounded-xl border border-gray-200 bg-gray-100 p-2 text-[#0F1B3D] md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F7192]" />
          <input
            placeholder="Search orders, users, files, printers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitSearch()
            }}
            className="w-full rounded-[18px] border border-gray-200 bg-gray-100 py-3 pl-11 pr-4 text-sm text-[#0F1B3D] outline-none transition focus:border-[#6d28d9]/40"
          />
        </label>

        <div className="relative">
          <button
            type="button"
            onClick={() => setBellOpen((current) => !current)}
            aria-label={`Notifications ${attentionCount > 0 ? `(${attentionCount} items need attention)` : ''}`}
            className="relative rounded-xl border border-gray-200 bg-gray-100 p-3 text-[#6F7192] transition hover:bg-gray-200"
          >
            <Bell className="h-4 w-4" />
            {attentionCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#6d28d9] px-1 text-[10px] font-bold text-white">
                {attentionCount > 99 ? '99+' : attentionCount}
              </span>
            )}
            {attentionCount === 0 && attention !== null && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-400" />
            )}
          </button>

          {bellOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setBellOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[320px] overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
                <div className="border-b border-gray-200 px-4 py-4">
                  <div className="text-sm font-semibold text-[#0F1B3D]">Attention needed</div>
                  <div className="mt-1 text-sm text-[#6F7192]">Live operational signals, refreshed every 60s</div>
                </div>

                <div data-lenis-prevent className="max-h-[320px] overflow-y-auto p-3">
                  {attention === null ? (
                    <div className="space-y-2 py-2">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="h-14 animate-pulse rounded-[16px] bg-gray-100" />
                      ))}
                    </div>
                  ) : attention.items.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                      <p className="text-sm font-medium text-[#0F1B3D]">All caught up</p>
                      <p className="text-xs text-[#6F7192]">No refund approvals, failed emails, or webhook issues.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {attention.items.map((item) => {
                        const Icon = toneIcon[item.tone]
                        return (
                          <a
                            key={item.id}
                            href={item.href}
                            onClick={() => setBellOpen(false)}
                            className="flex items-center gap-3 rounded-[16px] px-4 py-3 transition hover:bg-gray-50"
                          >
                            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${toneClass[item.tone]}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-[#0F1B3D]">{item.label}</div>
                              <div className="text-xs text-[#6F7192]">
                                {item.count} {item.count === 1 ? 'item' : 'items'}
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 shrink-0 text-[#6F7192]" />
                          </a>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((current) => !current)}
            className="flex items-center gap-3 rounded-[18px] border border-gray-200 bg-gray-100 px-3 py-2 text-left transition hover:bg-gray-200"
          >
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,#a855f7,#7C3AED)] text-sm font-bold text-white">
              {adminInitials}
            </div>
            <div className="hidden sm:block" suppressHydrationWarning>
              <div className="text-sm font-medium text-[#0F1B3D]">{adminName}</div>
              <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">{adminRole}</div>
            </div>
            <ChevronDown className="h-4 w-4 text-[#6F7192]" />
          </button>

          {profileOpen ? (
            <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[260px] overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
              <div className="border-b border-gray-200 px-4 py-4">
                <div className="text-sm font-semibold text-[#0F1B3D]">Admin session</div>
                <div className="mt-1 text-sm text-[#6F7192]">Role-based controls enabled</div>
              </div>
              <div className="p-3">
                <a
                  href="/admin/settings"
                  className="mt-1 flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-sm text-[#6F7192] transition hover:bg-gray-100"
                >
                  <Settings className="h-4 w-4" />
                  Account settings
                </a>
                <a
                  href="/admin/audit-logs"
                  className="mt-1 flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-sm text-[#6F7192] transition hover:bg-gray-100"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Audit logs
                </a>
              </div>
              <div className="border-t border-gray-200 p-3">
                <a
                  href="/admin/logout"
                  className="flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Log out
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}