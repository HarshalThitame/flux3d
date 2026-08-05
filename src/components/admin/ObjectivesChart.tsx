'use client'

import { motion } from 'framer-motion'

export type ObjectiveSlice = {
  label: string
  value: number
  color: string
}

const OBJECTIVE_COLORS: Record<string, string> = {
  'OUTCOME_SALES': '#6d28d9',
  'OUTCOME_AWARENESS': '#3B82F6',
  'OUTCOME_TRAFFIC': '#10B981',
  'CONVERSIONS': '#F59E0B',
  'PRODUCT_CATALOG_SALES': '#EF4444',
  'default': '#6F7192',
}

function getObjectiveColor(objective: string): string {
  return OBJECTIVE_COLORS[objective] ?? OBJECTIVE_COLORS.default
}

function getObjectiveLabel(objective: string): string {
  const labels: Record<string, string> = {
    'OUTCOME_SALES': 'Sales',
    'OUTCOME_AWARENESS': 'Awareness',
    'OUTCOME_TRAFFIC': 'Traffic',
    'CONVERSIONS': 'Conversions',
    'PRODUCT_CATALOG_SALES': 'Catalog Sales',
  }
  return labels[objective] ?? objective.replace(/_/g, ' ')
}

export default function ObjectivesChart({
  title,
  subtitle,
  campaigns,
}: {
  title: string
  subtitle: string
  campaigns: { objective: string }[]
}) {
  // Group by objective
  const counts = campaigns.reduce<Record<string, number>>((acc, c) => {
    acc[c.objective] = (acc[c.objective] ?? 0) + 1
    return acc
  }, {})

  const slices: ObjectiveSlice[] = Object.entries(counts).map(([objective, count]) => ({
    label: getObjectiveLabel(objective),
    value: count,
    color: getObjectiveColor(objective),
  }))

  const total = slices.reduce((sum, slice) => sum + slice.value, 0)

  const background = slices
    .reduce<{ color: string; start: number; end: number; progress: number }[]>(
      (segments, slice) => {
        const previousProgress = segments.at(-1)?.progress ?? 0
        const nextProgress = previousProgress + slice.value
        return [
          ...segments,
          {
            color: slice.color,
            start: (previousProgress / total) * 360,
            end: (nextProgress / total) * 360,
            progress: nextProgress,
          },
        ]
      },
      []
    )
    .map((segment) => `${segment.color} ${segment.start}deg ${segment.end}deg`)
    .join(', ')

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-[#FFFFFF] p-5">
      <div>
        <h3 className="text-lg font-semibold text-[#0F1B3D]">{title}</h3>
        <p className="mt-1 text-sm text-[#6F7192]">{subtitle}</p>
      </div>

      <div className="mt-6 flex flex-col items-center gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative">
          <div
            className="grid h-44 w-44 place-items-center rounded-full shadow-inner"
            style={{ background: `conic-gradient(${background})` }}
          >
            <div className="grid h-[136px] w-[136px] place-items-center rounded-full bg-[#FFFFFF] text-center">
              <div>
                <div className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">{total}</div>
                <div className="text-[10px] uppercase tracking-[0.15em] text-[#6F7192]">Campaigns</div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full space-y-2">
          {slices.map((slice, i) => (
            <motion.div
              key={slice.label}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5"
            >
              <div className="inline-flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: slice.color }} />
                <span className="text-xs text-[#6F7192]">{slice.label}</span>
              </div>
              <div className="text-xs font-medium text-[#0F1B3D]">{slice.value}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
