'use client'

import { motion } from 'framer-motion'
import {
  Boxes,
  PackageOpen,
  IndianRupee,
  AlertTriangle,
  Clock3,
  XCircle,
} from 'lucide-react'
import type { StockOverview } from '@/lib/shop/stock'

type KpiCardProps = {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'amber' | 'rose' | 'violet'
}

function KpiCard({ icon, label, value, hint, tone = 'default' }: KpiCardProps) {
  const tones = {
    default: 'border-gray-200 bg-[#FFFFFF]',
    amber: 'border-amber-200 bg-amber-50/60',
    rose: 'border-rose-200 bg-rose-50/60',
    violet: 'border-[#6d28d9]/15 bg-[#f5f3ff]',
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-4 shadow-sm ${tones[tone]}`}
    >
      <div className="flex items-center gap-2 text-[#6F7192]">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">{label}</span>
      </div>
      <div className="mt-2 font-[var(--font-syne)] text-2xl font-bold tracking-tight text-[#0F1B3D]">
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-[#6F7192]">{hint}</div>}
    </motion.div>
  )
}

export default function StockKpiCards({
  overview,
  loading,
}: {
  overview: StockOverview | null
  loading: boolean
}) {
  if (loading || !overview) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-[104px] animate-pulse rounded-2xl border border-gray-200 bg-gray-100" />
        ))}
      </div>
    )
  }

  const formatCurrency = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  })

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      <KpiCard
        icon={<Boxes className="h-4 w-4" />}
        label="SKUs"
        value={overview.totalSkus.toLocaleString('en-IN')}
        hint={`${overview.totalProducts} products`}
      />
      <KpiCard
        icon={<PackageOpen className="h-4 w-4" />}
        label="Units on hand"
        value={overview.unitsOnHand.toLocaleString('en-IN')}
        hint={`${overview.unitsReserved.toLocaleString('en-IN')} reserved`}
      />
      <KpiCard
        icon={<IndianRupee className="h-4 w-4" />}
        label="Stock value"
        value={formatCurrency.format(overview.stockValue)}
        hint="At list price"
      />
      <KpiCard
        icon={<AlertTriangle className="h-4 w-4" />}
        label="Low stock"
        value={overview.lowStockCount.toLocaleString('en-IN')}
        hint={`${overview.openAlerts} open alerts`}
        tone="amber"
      />
      <KpiCard
        icon={<XCircle className="h-4 w-4" />}
        label="Out of stock"
        value={overview.outOfStockCount.toLocaleString('en-IN')}
        tone="rose"
      />
      <KpiCard
        icon={<Clock3 className="h-4 w-4" />}
        label="Reservations"
        value={overview.activeReservations.toLocaleString('en-IN')}
        hint={`${overview.expiringSoonReservations} expiring < 24h`}
        tone="violet"
      />
    </div>
  )
}
