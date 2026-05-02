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
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.adminTheme = theme
  }, [theme])

  return (
    <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
      <Sidebar collapsed={collapsed} onToggleAction={() => setCollapsed((current) => !current)} />

      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 z-50 h-screen w-[280px] border-r border-white/10 bg-[#080c18] p-5 md:hidden"
            >
              <div className="mb-6 flex items-center gap-3 px-2">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#FF5C1A] to-cyan-400 text-white shadow-lg shadow-[#FF5C1A]/20">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div>
                  <div className="font-[var(--font-syne)] text-lg font-bold text-white">Flux3D</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[#7a82a0]">Admin</div>
                </div>
              </div>

                <nav className="space-y-1.5">
                  {adminNavItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileNavOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-[#94a3b8] transition-all hover:bg-white/5 hover:text-white min-h-[44px]"
                      >
                        <Icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    )
                  })}
                </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className={`min-h-screen transition-all duration-300 ${collapsed ? 'md:pl-[88px]' : 'md:pl-[260px]'}`}>
        <Topbar
          theme={theme}
          onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main className="px-4 py-6 md:px-8">
          <div className="mx-auto max-w-[1500px]">{children}</div>
        </main>
      </div>
    </div>
  )
}
