import { Clock3, IndianRupee, Layers3, PackageOpen, Percent, RefreshCcw, Target, Users } from 'lucide-react'
import type { DashboardMetric } from '@/lib/admin/types'

const icons = [PackageOpen, IndianRupee, Clock3, Layers3, Target, Percent, RefreshCcw, Users]
const iconStyles = [
  'bg-[#f0eafd] text-[#6d28d9]',
  'bg-[#e7f5ed] text-[#238253]',
  'bg-[#fff3e6] text-[#b97525]',
  'bg-[#eaf2fc] text-[#4172ac]',
]

export default function DashboardCards({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <section aria-label="Business metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric, index) => {
        const Icon = icons[index] ?? PackageOpen
        const detailStyle = metric.tone === 'warning'
          ? 'text-[#a46523]'
          : metric.tone === 'positive'
            ? 'text-[#238253]'
            : 'text-[#738298]'

        return (
          <div
            key={metric.label}
            className="min-h-[146px] rounded-2xl border border-[#e4e8ef] bg-white p-5 shadow-[0_3px_18px_rgba(25,35,65,0.035)]"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium leading-5 text-[#65758b]">{metric.label}</p>
              <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${iconStyles[index % iconStyles.length]}`}>
                <Icon className="h-[18px] w-[18px]" />
              </span>
            </div>
            <div className="mt-3 font-[var(--font-syne)] text-[clamp(1.55rem,2.4vw,2rem)] font-bold leading-tight tracking-[-0.045em] text-[#182540]">
              {metric.value}
            </div>
            <p className={`mt-2 text-xs leading-5 ${detailStyle}`}>{metric.change}</p>
          </div>
        )
      })}
    </section>
  )
}
