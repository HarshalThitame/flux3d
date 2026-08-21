'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft, Printer } from 'lucide-react'
import { adminNavItems } from '@/lib/admin/nav-config'

export default function Sidebar({
  collapsed,
  onToggleAction,
}: {
  collapsed: boolean
  onToggleAction: () => void
}) {
  const pathname = usePathname() ?? ''
  const mainItems = adminNavItems.filter(item => item.section === 'main')
  const shopItems = adminNavItems.filter(item => item.section === 'shop')
  const secondaryItems = adminNavItems.filter(item => item.section === 'secondary')
  const isActive = (href: string) => pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`))
  const [pendingReviewCount, setPendingReviewCount] = useState(0)
  const [openTicketCount, setOpenTicketCount] = useState(0)
  const [printerStats, setPrinterStats] = useState<{ total: number; active: number } | null>(null)
  const getBadge = (href: string) => {
    if (href === '/admin/3d-shop/reviews') return pendingReviewCount
    if (href === '/admin/tickets') return openTicketCount
    return 0
  }

  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollUp, setCanScrollUp] = useState(false)
  const [canScrollDown, setCanScrollDown] = useState(false)

  const updateScrollIndicators = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollUp(el.scrollTop > 8)
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 8)
  }, [])

  useEffect(() => {
    updateScrollIndicators()
    window.addEventListener('resize', updateScrollIndicators)
    return () => window.removeEventListener('resize', updateScrollIndicators)
  }, [updateScrollIndicators])

  useEffect(() => {
    const active = scrollRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    active?.scrollIntoView({ block: 'nearest' })
  }, [pathname])

  function handleNavKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const el = scrollRef.current
    if (!el) return
    const step = 120
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        el.scrollBy({ top: step, behavior: 'smooth' })
        break
      case 'ArrowUp':
        event.preventDefault()
        el.scrollBy({ top: -step, behavior: 'smooth' })
        break
      case 'PageDown':
        event.preventDefault()
        el.scrollBy({ top: el.clientHeight * 0.8, behavior: 'smooth' })
        break
      case 'PageUp':
        event.preventDefault()
        el.scrollBy({ top: -el.clientHeight * 0.8, behavior: 'smooth' })
        break
      case 'Home':
        event.preventDefault()
        el.scrollTo({ top: 0, behavior: 'smooth' })
        break
      case 'End':
        event.preventDefault()
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
        break
    }
  }

  useEffect(() => {
    let active = true

    async function loadPendingReviews() {
      try {
        const response = await fetch('/api/3d-shop/admin/reviews?is_approved=false&page=1&limit=1')
        const data = await response.json().catch(() => ({})) as { total?: number }
        if (active && response.ok) setPendingReviewCount(data.total ?? 0)
      } catch {
        if (active) setPendingReviewCount(0)
      }
    }

    async function loadOpenTickets() {
      try {
        const response = await fetch('/api/admin/tickets?status=Open&limit=1')
        const data = await response.json().catch(() => ({})) as { total?: number }
        if (active && response.ok) setOpenTicketCount(data.total ?? 0)
      } catch {
        if (active) setOpenTicketCount(0)
      }
    }

    async function loadPrinterStats() {
      try {
        const response = await fetch('/api/admin/printers')
        if (!active || !response.ok) return
        const data = await response.json() as { printers: { status: string }[] }
        const printers = data.printers ?? []
        setPrinterStats({
          total: printers.length,
          active: printers.filter((printer) => printer.status === 'printing').length,
        })
      } catch {
        if (active) setPrinterStats(null)
      }
    }

    void loadPendingReviews()
    void loadOpenTickets()
    void loadPrinterStats()
    return () => {
      active = false
    }
  }, [])

  return (
    <aside className={`fixed left-0 top-0 z-40 hidden h-[100dvh] border-r border-gray-200 bg-white backdrop-blur-xl transition-all md:block ${collapsed ? 'w-[92px]' : 'w-[280px]'}`}>
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-5">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#6d28d9,#a855f7)] text-white shadow-[0_10px_30px_rgba(109, 40, 217,0.2)]">
              <Printer className="h-5 w-5" />
            </div>
            {!collapsed ? (
              <div>
                <div className="font-[var(--font-syne)] text-lg font-bold text-[#0F1B3D]">Flux 3D</div>
                <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">Admin</div>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onToggleAction}
            className="rounded-xl border border-gray-200 bg-gray-100 p-2 text-[#6F7192] transition hover:bg-gray-200"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="relative min-h-0 flex-1">
          <div
            ref={scrollRef}
            data-lenis-prevent
            tabIndex={0}
            role="navigation"
            aria-label="Admin navigation"
            onScroll={updateScrollIndicators}
            onKeyDown={handleNavKeyDown}
            className="admin-sidebar-scroll h-full overflow-y-auto overscroll-contain px-4 pb-4 [-webkit-overflow-scrolling:touch]"
          >
          <nav className="mt-8 space-y-2">
          {mainItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                data-active={active ? 'true' : undefined}
                className={`group flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-medium transition ${
                  active
                    ? 'bg-[linear-gradient(90deg,rgba(109, 40, 217,0.15),rgba(168, 85, 247,0.12))] text-[#0F1B3D] shadow-[inset_0_0_0_1px_rgba(109, 40, 217,0.4)]'
                    : 'text-[#6F7192] hover:bg-gray-100 hover:text-[#0F1B3D]'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            )
          })}
        </nav>

        {!collapsed && shopItems.length > 0 && (
          <div className="mt-6 border-t border-gray-200 pt-4">
            <div className="mb-2 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#6F7192]">3D Shop</div>
            <div className="space-y-2">
              {shopItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                const badge = getBadge(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    data-active={active ? 'true' : undefined}
                    className={`flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-medium transition ${
                      active
                        ? 'bg-[linear-gradient(90deg,rgba(109, 40, 217,0.15),rgba(168, 85, 247,0.12))] text-[#0F1B3D] shadow-[inset_0_0_0_1px_rgba(109, 40, 217,0.4)]'
                        : 'text-[#6F7192] hover:bg-gray-100 hover:text-[#0F1B3D]'
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{item.label}</span>
                    {badge > 0 && (
                      <span className="ml-auto rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {collapsed && shopItems.length > 0 && (
          <nav className="mt-6 space-y-2 border-t border-gray-200 pt-4">
            {shopItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              const badge = getBadge(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  data-active={active ? 'true' : undefined}
                  className={`group relative flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-medium transition ${
                    active
                      ? 'bg-[linear-gradient(90deg,rgba(109, 40, 217,0.15),rgba(168, 85, 247,0.12))] text-[#0F1B3D] shadow-[inset_0_0_0_1px_rgba(109, 40, 217,0.4)]'
                      : 'text-[#6F7192] hover:bg-gray-100 hover:text-[#0F1B3D]'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {badge > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-600" />}
                </Link>
              )
            })}
          </nav>
        )}

        {collapsed && secondaryItems.length > 0 && (
          <nav className="mt-6 space-y-2 border-t border-gray-200 pt-4">
            {secondaryItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              const badge = getBadge(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  data-active={active ? 'true' : undefined}
                  className={`group relative flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-medium transition ${
                    active
                      ? 'bg-[linear-gradient(90deg,rgba(109, 40, 217,0.15),rgba(168, 85, 247,0.12))] text-[#0F1B3D] shadow-[inset_0_0_0_1px_rgba(109, 40, 217,0.4)]'
                      : 'text-[#6F7192] hover:bg-gray-100 hover:text-[#0F1B3D]'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {badge > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-600" />}
                </Link>
              )
            })}
          </nav>
        )}

        {!collapsed && secondaryItems.length > 0 && (
          <div className="mt-6 border-t border-gray-200 pt-4">
            <div className="mb-2 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#6F7192]">Support</div>
            <div className="space-y-2">
              {secondaryItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                const badge = getBadge(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    data-active={active ? 'true' : undefined}
                    className={`flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-medium transition ${
                      active
                        ? 'bg-[linear-gradient(90deg,rgba(109, 40, 217,0.15),rgba(168, 85, 247,0.12))] text-[#0F1B3D] shadow-[inset_0_0_0_1px_rgba(109, 40, 217,0.4)]'
                        : 'text-[#6F7192] hover:bg-gray-100 hover:text-[#0F1B3D]'
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{item.label}</span>
                    {badge > 0 && (
                      <span className="ml-auto rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
        </div>

        <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-white to-transparent transition-opacity duration-200 ${canScrollUp ? 'opacity-100' : 'opacity-0'}`} />
        <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 bg-gradient-to-t from-white to-transparent transition-opacity duration-200 ${canScrollDown ? 'opacity-100' : 'opacity-0'}`} />
        </div>

        <div className="shrink-0 px-4 pb-5 pt-2">
          <div className="rounded-[24px] border border-[#6d28d9]/10 bg-[linear-gradient(180deg,rgba(109, 40, 217,0.12),rgba(168, 85, 247,0.25))] p-4">
            {!collapsed ? (
              <>
                <div className="text-sm font-semibold text-[#0F1B3D]">
                  {printerStats && printerStats.active > 0 ? 'Printers Online' : 'No Printers Active'}
                </div>
                <div className="mt-2 text-sm leading-6 text-[#505880]">
                  {printerStats
                    ? `${printerStats.active} of ${printerStats.total} printers active · ${printerStats.total > 0 ? Math.round((printerStats.active / printerStats.total) * 100) : 0}% utilization`
                    : 'Loading printer status...'}
                </div>
              </>
            ) : (
              <div className={`mx-auto h-3 w-3 rounded-full ${printerStats && printerStats.active > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
