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
    <div className="rounded-[28px] border border-white/10 bg-[rgba(10,16,31,0.94)] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
      <div>
        <h3 className="font-[var(--font-syne)] text-2xl font-bold text-white">{title}</h3>
        <p className="mt-2 text-sm text-[#97a2c3]">{subtitle}</p>
      </div>
      <div className="mt-8 flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="grid h-52 w-52 place-items-center rounded-full"
          style={{ background: `conic-gradient(${background})` }}
        >
          <div className="grid h-34 w-34 place-items-center rounded-full bg-[#08101e] text-center">
            <div className="font-[var(--font-syne)] text-3xl font-extrabold text-white">{total}%</div>
            <div className="text-xs uppercase tracking-[0.18em] text-[#8f9abb]">Usage mix</div>
          </div>
        </div>
        <div className="w-full space-y-3">
          {slices.map((slice) => (
            <div key={slice.label} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <div className="inline-flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: slice.color }} />
                <span className="text-sm text-white">{slice.label}</span>
              </div>
              <div className="text-sm font-medium text-[#d8def1]">{slice.value}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
