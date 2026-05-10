import { motion } from 'framer-motion'
import type { DonutSlice } from '@/lib/admin/types'

export default function DonutChartCard({
  title,
  subtitle,
  slices,
}: {
  title: string
  subtitle: string
  slices: DonutSlice[]
}) {
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
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#FFFFFF] p-5">
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
                <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a6580]">Total</div>
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
              className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5"
            >
              <div className="inline-flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: slice.color }} />
                <span className="text-xs text-[#c6cee5]">{slice.label}</span>
              </div>
              <div className="text-xs font-medium text-[#0F1B3D]">{slice.value}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
