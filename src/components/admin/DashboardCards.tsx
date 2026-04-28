import { ArrowUpRight, Clock3, IndianRupee, Layers3, PackageOpen } from 'lucide-react'
import type { DashboardMetric } from '@/lib/admin/types'

const icons = [PackageOpen, IndianRupee, Clock3, Layers3]

export default function DashboardCards({
  metrics,
}: {
  metrics: DashboardMetric[]
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric, index) => {
        const Icon = icons[index] ?? PackageOpen
        const tone =
          metric.tone === 'positive'
            ? 'text-emerald-200 bg-emerald-400/12 border-emerald-400/15'
            : metric.tone === 'warning'
              ? 'text-amber-200 bg-amber-400/12 border-amber-400/15'
              : 'text-sky-200 bg-sky-400/12 border-sky-400/15'

        return (
          <div
            key={metric.label}
            className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,19,35,0.96),rgba(8,13,25,0.94))] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-[#93a0c1]">{metric.label}</div>
                <div className="mt-3 font-[var(--font-syne)] text-4xl font-extrabold text-white">
                  {metric.value}
                </div>
              </div>
              <div className={`rounded-2xl border p-3 ${tone}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 text-sm text-[#d7def1]">
              <ArrowUpRight className="h-4 w-4 text-[#7dd3fc]" />
              {metric.change}
            </div>
          </div>
        )
      })}
    </div>
  )
}
