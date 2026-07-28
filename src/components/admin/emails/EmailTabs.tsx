'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { label: 'Dashboard', href: '/admin/emails' },
  { label: 'Templates', href: '/admin/emails/templates' },
  { label: 'Attachments', href: '/admin/emails/attachments' },
  { label: 'Branding', href: '/admin/emails/branding' },
  { label: 'Logs', href: '/admin/emails/logs' },
  { label: 'Queue', href: '/admin/emails/queue' },
  { label: 'Automation', href: '/admin/emails/automation' },
  { label: 'Matrix', href: '/admin/emails/matrix' },
  { label: 'Test', href: '/admin/emails/test' },
  { label: 'Analytics', href: '/admin/emails/analytics' },
  { label: 'Settings', href: '/admin/emails/settings' },
]

export default function EmailTabs() {
  const pathname = usePathname() ?? ''

  const isActive = (href: string) => {
    if (href === '/admin/emails') {
      return pathname === '/admin/emails'
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="sticky top-0 z-30 -mx-4 mb-6 overflow-x-auto border-b border-gray-200 bg-[#F4F6FA] px-4 pb-0 md:-mx-8 md:px-8">
      <nav className="flex items-center gap-1 py-2">
        {tabs.map((tab) => {
          const active = isActive(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                active
                  ? 'text-[#6d28d9]'
                  : 'text-[#6F7192] hover:bg-gray-100 hover:text-[#0F1B3D]'
              }`}
            >
              {tab.label}
              {active && (
                <span className="absolute bottom-[-9px] left-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full bg-[#6d28d9]" />
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
