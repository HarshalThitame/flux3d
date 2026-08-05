'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Warehouse,
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  CalendarClock,
  BellRing,
  RefreshCw,
} from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import { useSearchParams, useRouter } from 'next/navigation'
import StockOverviewTab from './tabs/StockOverviewTab'
import StockSkusTab from './tabs/StockSkusTab'
import StockMovementsTab from './tabs/StockMovementsTab'
import StockReservationsTab from './tabs/StockReservationsTab'
import StockAlertsTab from './tabs/StockAlertsTab'

type TabKey = 'dashboard' | 'skus' | 'movements' | 'reservations' | 'alerts'

const TABS: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: 'skus', label: 'SKUs', icon: <Package className="h-4 w-4" /> },
  { key: 'movements', label: 'Movements', icon: <ArrowLeftRight className="h-4 w-4" /> },
  { key: 'reservations', label: 'Reservations', icon: <CalendarClock className="h-4 w-4" /> },
  { key: 'alerts', label: 'Alerts', icon: <BellRing className="h-4 w-4" /> },
]

export default function StockWorkspace() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [toast, setToast] = useState<AdminToastState>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [openAlertCount, setOpenAlertCount] = useState(0)

  const tabFromQuery = (searchParams?.get('tab') ?? 'dashboard') as TabKey
  const activeTab = TABS.some((tab) => tab.key === tabFromQuery) ? tabFromQuery : 'dashboard'

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    let active = true
    async function loadOpenAlerts() {
      try {
        const response = await fetch('/api/3d-shop/admin/stock/alerts?status=open&page=1&page_size=1')
        const data = (await response.json().catch(() => ({}))) as { total?: number }
        if (active && response.ok) setOpenAlertCount(data.total ?? 0)
      } catch {
        if (active) setOpenAlertCount(0)
      }
    }
    void loadOpenAlerts()
    return () => {
      active = false
    }
  }, [refreshKey])

  const setTab = useCallback(
    (key: TabKey) => {
      router.replace(key === 'dashboard' ? '/admin/3d-shop/stock' : `/admin/3d-shop/stock?tab=${key}`)
    },
    [router]
  )

  const refresh = useCallback(() => {
    setRefreshKey((current) => current + 1)
  }, [])

  const renderTab = useMemo(() => {
    const props = {
      toast,
      setToast,
      refresh,
      refreshKey,
    }
    switch (activeTab) {
      case 'skus':
        return <StockSkusTab {...props} />
      case 'movements':
        return <StockMovementsTab {...props} />
      case 'reservations':
        return <StockReservationsTab {...props} />
      case 'alerts':
        return <StockAlertsTab {...props} />
      default:
        return <StockOverviewTab {...props} onNavigate={setTab} />
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, refreshKey, toast])

  return (
    <div className="space-y-6">
      <AdminToast toast={toast} />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/20 bg-[#6d28d9]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#6d28d9]">
            <Warehouse className="h-3 w-3" />
            3D Shop
          </div>
          <h1 className="font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">
            Stock Management
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#6F7192]">
            Track SKU inventory, audit every stock movement, manage reservations, and stay ahead of
            low-stock risks.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#6d28d9]/15 bg-white px-4 text-sm font-semibold text-[#6F7192] transition hover:bg-[#f5f3ff] hover:text-[#6d28d9]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </motion.div>

      {openAlertCount > 0 && activeTab !== 'alerts' && (
        <button
          type="button"
          onClick={() => setTab('alerts')}
          className="flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left transition hover:bg-amber-100"
        >
          <BellRing className="h-5 w-5 shrink-0 text-amber-600" />
          <span className="text-sm font-semibold text-amber-800">
            {openAlertCount} open stock alert{openAlertCount === 1 ? '' : 's'} need attention
          </span>
          <span className="ml-auto text-xs font-semibold text-amber-700">Review alerts →</span>
        </button>
      )}

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-1.5" role="tablist" aria-label="Stock management sections">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(tab.key)}
              className={`relative inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                isActive ? 'text-[#6d28d9]' : 'text-[#6F7192] hover:text-[#0F1B3D]'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="stock-tab-active"
                  className="absolute inset-0 rounded-xl bg-[#f5f3ff]"
                  transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {tab.icon}
                {tab.label}
                {tab.key === 'alerts' && openAlertCount > 0 && (
                  <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {openAlertCount}
                  </span>
                )}
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
          {renderTab}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
