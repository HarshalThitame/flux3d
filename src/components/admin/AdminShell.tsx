'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/admin/Sidebar'
import Topbar from '@/components/admin/Topbar'
import { adminNavItems } from '@/lib/admin/mock-data'

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
    <div className="min-h-screen bg-[var(--admin-bg)] text-[var(--admin-fg)]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((current) => !current)} />

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#02050d]/75"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute left-0 top-0 h-screen w-[280px] border-r border-white/10 bg-[#060a14] p-5">
            <div className="space-y-2">
              {adminNavItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className="flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.04]"
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div className={`transition-all md:${collapsed ? 'ml-[92px]' : 'ml-[280px]'}`}>
        <div className={collapsed ? 'md:ml-[92px]' : 'md:ml-[280px]'} />
      </div>

      <div className={`min-h-screen transition-all ${collapsed ? 'md:pl-[92px]' : 'md:pl-[280px]'}`}>
        <Topbar
          theme={theme}
          onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main className="px-4 py-6 md:px-6">
          <div className="mx-auto max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  )
}
