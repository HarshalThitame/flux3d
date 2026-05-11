'use client'

import { useState } from 'react'
import { Bell, ChevronDown, Menu, MoonStar, Search, SunMedium } from 'lucide-react'

export default function Topbar({
  theme,
  onToggleTheme,
  onOpenMobileNav,
}: {
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  onOpenMobileNav: () => void
}) {
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white px-4 py-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="rounded-xl border border-gray-200 bg-gray-100 p-2 text-[#0F1B3D] md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F7192]" />
          <input
            placeholder="Search orders, users, files, printers..."
            className="w-full rounded-[18px] border border-gray-200 bg-gray-100 py-3 pl-11 pr-4 text-sm text-[#0F1B3D] outline-none transition focus:border-[#7C5CFF]/40"
          />
        </label>

        <button
          type="button"
          onClick={onToggleTheme}
          className="rounded-xl border border-gray-200 bg-gray-100 p-3 text-[#6F7192] transition hover:bg-gray-200"
        >
          {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
        </button>

        <button
          type="button"
          className="relative rounded-xl border border-gray-200 bg-gray-100 p-3 text-[#6F7192] transition hover:bg-gray-200"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#7C5CFF]" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((current) => !current)}
            className="flex items-center gap-3 rounded-[18px] border border-gray-200 bg-gray-100 px-3 py-2 text-left transition hover:bg-gray-200"
          >
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,#A78BFA,#7C3AED)] text-sm font-bold text-white">
              PG
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-medium text-[#0F1B3D]">Punam Gunjal</div>
              <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">Super Admin</div>
            </div>
            <ChevronDown className="h-4 w-4 text-[#6F7192]" />
          </button>

          {profileOpen ? (
            <div className="absolute right-0 top-[calc(100%+0.75rem)] w-[260px] overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
              <div className="border-b border-gray-200 px-4 py-4">
                <div className="text-sm font-semibold text-[#0F1B3D]">Admin session</div>
                <div className="mt-1 text-sm text-[#6F7192]">Role-based controls enabled</div>
              </div>
              <div className="p-3">
                <button
                  type="button"
                  className="mt-1 block w-full rounded-[16px] px-4 py-3 text-left text-sm text-[#6F7192] transition hover:bg-gray-100"
                >
                  Switch to operator view
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
