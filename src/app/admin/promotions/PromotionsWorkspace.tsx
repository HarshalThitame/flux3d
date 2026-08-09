'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, TicketCheck, Tag } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'
import OffersList from '@/components/admin/promotions/OffersList'
import CouponsList from '@/components/admin/promotions/CouponsList'

type TabKey = 'offers' | 'coupons'

const TABS: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: 'offers', label: 'Offers', icon: <Gift className="h-4 w-4" /> },
  { key: 'coupons', label: 'Coupons', icon: <TicketCheck className="h-4 w-4" /> },
]

export default function PromotionsWorkspace() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabFromQuery = (searchParams?.get('tab') ?? 'offers') as TabKey
  const [activeTab, setActiveTab] = useState<TabKey>(
    TABS.some((tab) => tab.key === tabFromQuery) ? tabFromQuery : 'offers'
  )

  function selectTab(key: TabKey) {
    setActiveTab(key)
    router.replace(`/admin/promotions?tab=${key}`, { scroll: false })
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/20 bg-[#6d28d9]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#6d28d9]">
            <Tag className="h-3 w-3" />
            Marketing
          </div>
          <h1 className="font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">
            Promotions
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#6F7192]">
            Manage sales, discounts, coupon codes, and festival campaigns in one place.
          </p>
        </div>
      </motion.div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-1.5" role="tablist" aria-label="Promotion types">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => selectTab(tab.key)}
              className={`relative inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                isActive ? 'text-[#6d28d9]' : 'text-[#6F7192] hover:text-[#0F1B3D]'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="promotions-tab-active"
                  className="absolute inset-0 rounded-xl bg-[#f5f3ff]"
                  transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {tab.icon}
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.16 }}
        >
          {activeTab === 'offers' ? <OffersList /> : <CouponsList />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}