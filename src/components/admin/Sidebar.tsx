'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import { adminNavItems } from '@/lib/admin/nav-config'

export default function Sidebar({
  collapsed,
  onToggleAction,
}: {
  collapsed: boolean
  onToggleAction: () => void
}) {
  const pathname = usePathname()
  const mainItems = adminNavItems.filter(item => item.section === 'main')
  const secondaryItems = adminNavItems.filter(item => item.section === 'secondary')

  return (
    <aside className={`fixed left-0 top-0 z-40 hidden h-screen border-r border-white/10 bg-[rgba(6,10,20,0.92)] backdrop-blur-xl transition-all md:block ${collapsed ? 'w-[92px]' : 'w-[280px]'}`}>
      <div className="flex h-full flex-col px-4 py-5 overflow-y-auto scrollbar-hide">
        <div className="flex items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#FF7B43,#39BDF8)] text-white shadow-[0_10px_30px_rgba(57,189,248,0.2)]">
              <Printer className="h-5 w-5" />
            </div>
            {!collapsed ? (
              <div>
                <div className="font-[var(--font-syne)] text-lg font-bold text-white">Flux 3D</div>
                <div className="text-xs uppercase tracking-[0.18em] text-[#7f8aac]">Admin</div>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onToggleAction}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-[#c6cee5] transition hover:bg-white/[0.07]"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="mt-8 space-y-2">
          {mainItems.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-medium transition ${
                  active
                    ? 'bg-[linear-gradient(90deg,rgba(255,123,67,0.18),rgba(57,189,248,0.12))] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
                    : 'text-[#96a2c3] hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            )
          })}
        </nav>

        {!collapsed && secondaryItems.length > 0 && (
          <div className="mt-6 border-t border-white/10 pt-4">
            <div className="mb-2 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#7f8aac]">Support</div>
            <div className="space-y-2">
              {secondaryItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-medium text-[#96a2c3] transition hover:bg-white/[0.04] hover:text-white"
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-auto rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,123,67,0.12),rgba(255,255,255,0.03))] p-4">
          {!collapsed ? (
            <>
              <div className="text-sm font-semibold text-white">System Healthy</div>
              <div className="mt-2 text-sm leading-6 text-[#cfd7ee]">
                6 printers active · 87% utilization
              </div>
            </>
          ) : (
            <div className="mx-auto h-3 w-3 rounded-full bg-emerald-400" />
          )}
        </div>
      </div>
    </aside>
  )
}
