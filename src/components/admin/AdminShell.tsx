'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/admin/Sidebar'
import Topbar from '@/components/admin/Topbar'
import { adminNavItems } from '@/lib/admin/nav-config'
import { motion, AnimatePresence } from 'framer-motion'

export default function AdminShell({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const mainItems = adminNavItems.filter((item) => item.section === 'main')
  const shopItems = adminNavItems.filter((item) => item.section === 'shop')
  const secondaryItems = adminNavItems.filter((item) => item.section === 'secondary')

  useEffect(() => {
    document.documentElement.dataset.adminTheme = 'light'
  }, [])

  return (
    <div className="min-h-screen bg-[#F4F6FA] text-[#0F1B3D]">
      <Sidebar collapsed={collapsed} onToggleAction={() => setCollapsed((current) => !current)} />

      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm md:hidden"
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 z-50 flex h-[100dvh] w-[280px] flex-col border-r border-[#6d28d9]/10 bg-[#FFFFFF] md:hidden"
            >
              {/* Header */}
              <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-5 py-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#6d28d9] to-cyan-400 text-white shadow-lg shadow-[#6d28d9]/20">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="font-[var(--font-syne)] text-lg font-bold text-[#0F1B3D]">Flux3D</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[#6F7192]">Admin</div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-[#6F7192] transition hover:bg-gray-100 hover:text-[#0F1B3D]"
                  aria-label="Close menu"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Scrollable nav */}
              <nav data-lenis-prevent className="admin-sidebar-scroll flex-1 overflow-y-auto overscroll-contain px-3 py-3 pb-6">
                <div className="space-y-1">
                  {mainItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileNavOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-[#6F7192] transition-all hover:bg-gray-100 hover:text-[#0F1B3D] min-h-[44px]"
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    )
                  })}

                  {shopItems.length > 0 && (
                    <>
                      <div className="pt-4 pb-1.5">
                        <div className="px-3.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6F7192]">3D Shop</div>
                      </div>
                      <div className="space-y-1">
                        {shopItems.map((item) => {
                          const Icon = item.icon
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setMobileNavOpen(false)}
                              className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-[#6F7192] transition-all hover:bg-gray-100 hover:text-[#0F1B3D] min-h-[44px]"
                            >
                              <Icon className="h-5 w-5 shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </Link>
                          )
                        })}
                      </div>
                    </>
                  )}

                  <div className="pt-4 pb-1.5">
                    <div className="px-3.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6F7192]">Support & Settings</div>
                  </div>
                  <div className="space-y-1">
                    {secondaryItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileNavOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-[#6F7192] transition-all hover:bg-gray-100 hover:text-[#0F1B3D] min-h-[44px]"
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className={`min-h-screen transition-all duration-300 ${collapsed ? 'md:pl-[88px]' : 'md:pl-[260px]'}`}>
        <Topbar
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main className="px-4 py-6 md:px-8">
          <div className="mx-auto max-w-[1500px]">{children}</div>
        </main>
      </div>
    </div>
  )
}
