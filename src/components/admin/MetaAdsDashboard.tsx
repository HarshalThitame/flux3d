'use client'

import { motion } from 'framer-motion'
import {
  IndianRupee,
  Eye,
  MousePointerClick,
  Megaphone,
} from 'lucide-react'

const icons = [IndianRupee, Eye, MousePointerClick, Megaphone]

const gradients = [
  'from-[#6d28d9]/10 to-transparent',
  'from-[#3B82F6]/10 to-transparent',
  'from-[#10B981]/10 to-transparent',
  'from-[#F59E0B]/10 to-transparent',
]

const iconGradients = [
  'from-[#6d28d9] to-[#a855f7]',
  'from-[#3B82F6] to-[#60A5FA]',
  'from-[#10B981] to-[#34D399]',
  'from-[#F59E0B] to-[#FBBF24]',
]

export type MetaAdsMetric = {
  label: string
  value: string
  change?: string
  tone: 'neutral' | 'positive' | 'warning'
}

export default function MetaAdsDashboard({
  metrics,
}: {
  metrics: MetaAdsMetric[]
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric, index) => {
        const Icon = icons[index] ?? Megaphone

        return (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className={`group relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-b ${gradients[index % 4]} p-5`}
          >
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-[#6F7192]">{metric.label}</div>
                  <div className="mt-2 font-[var(--font-syne)] text-3xl font-bold text-[#0F1B3D]">
                    {metric.value}
                  </div>
                </div>
                <div className={`rounded-xl bg-gradient-to-br ${iconGradients[index % 4]} p-2.5 text-white shadow-lg`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
              </div>
              {metric.change && (
                <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${
                  metric.tone === 'positive'
                    ? 'border-emerald-400/20 bg-emerald-50 text-emerald-600'
                    : metric.tone === 'warning'
                      ? 'border-amber-200 bg-amber-50 text-amber-600'
                      : 'border-cyan-200 bg-cyan-50 text-cyan-600'
                }`}>
                  {metric.change}
                </div>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
