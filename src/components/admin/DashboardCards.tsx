import { ArrowUpRight, Clock3, IndianRupee, Layers3, PackageOpen } from 'lucide-react'
import { motion } from 'framer-motion'
import type { DashboardMetric } from '@/lib/admin/types'

const icons = [PackageOpen, IndianRupee, Clock3, Layers3]

const gradients = [
  'from-[#6d28d9]/10 to-transparent',
  'from-emerald-400/10 to-transparent',
  'from-cyan-400/10 to-transparent',
  'from-violet-400/10 to-transparent',
]

const iconGradients = [
  'from-[#6d28d9] to-[#a855f7]',
  'from-emerald-400 to-emerald-500',
  'from-cyan-400 to-cyan-500',
  'from-violet-400 to-violet-500',
]

export default function DashboardCards({
  metrics,
}: {
  metrics: DashboardMetric[]
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric, index) => {
        const Icon = icons[index] ?? PackageOpen

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
                <div className={`rounded-xl bg-gradient-to-br ${iconGradients[index % 4]} p-2.5 text-[#0F1B3D] shadow-lg`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${
                metric.tone === 'positive'
                  ? 'border-emerald-400/20 bg-emerald-50 text-emerald-600'
                  : metric.tone === 'warning'
                    ? 'border-amber-200 bg-amber-50 text-amber-600'
                    : 'border-cyan-200 bg-cyan-50 text-cyan-600'
              }`}>
                <ArrowUpRight className="h-3 w-3" />
                {metric.change}
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
