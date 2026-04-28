import type { TrendPoint } from '@/lib/admin/types'

function buildPath(points: TrendPoint[], width: number, height: number) {
  if (points.length === 0) {
    return ''
  }

  const maxValue = Math.max(...points.map((point) => point.value))
  const step = width / Math.max(points.length - 1, 1)

  return points
    .map((point, index) => {
      const x = index * step
      const y = height - (point.value / maxValue) * height
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')
}

export default function LineChartCard({
  title,
  subtitle,
  points,
  accent = '#FF7B43',
}: {
  title: string
  subtitle: string
  points: TrendPoint[]
  accent?: string
}) {
  const width = 560
  const height = 220
  const path = buildPath(points, width, height)

  return (
    <div className="rounded-[28px] border border-white/10 bg-[rgba(10,16,31,0.94)] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
      <div className="mb-5">
        <h3 className="font-[var(--font-syne)] text-2xl font-bold text-white">{title}</h3>
        <p className="mt-2 text-sm text-[#97a2c3]">{subtitle}</p>
      </div>
      <div className="overflow-hidden rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full">
          <defs>
            <linearGradient id={`gradient-${title.replace(/\s+/g, '-')}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.32" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((line) => (
            <line
              key={line}
              x1="0"
              x2={width}
              y1={(height / 4) * line}
              y2={(height / 4) * line}
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="4 8"
            />
          ))}
          <path
            d={`${path} L ${width} ${height} L 0 ${height} Z`}
            fill={`url(#gradient-${title.replace(/\s+/g, '-')})`}
          />
          <path d={path} fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" />
        </svg>
        <div className="mt-3 grid grid-cols-4 gap-2 text-xs uppercase tracking-[0.18em] text-[#7f8bac] md:grid-cols-7">
          {points.map((point) => (
            <div key={point.label}>{point.label}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
