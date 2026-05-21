import { motion } from 'framer-motion'
import type { TrendPoint } from '@/lib/admin/types'

function buildPath(points: TrendPoint[], width: number, height: number, valueKey: 'value' | 'orders' = 'value') {
  if (points.length === 0) return ''
  
  const maxValue = Math.max(...points.map((point) => point[valueKey] || point.value), 1)
  const step = width / Math.max(points.length - 1, 1)
  
  return points
    .map((point, index) => {
      const x = index * step
      const y = height - ((point[valueKey] || point.value) / maxValue) * (height - 10) - 5
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

export default function LineChartCard({
  title,
  subtitle,
  points,
  showOrders = false,
  accent = '#6d28d9',
}: {
  title: string
  subtitle: string
  points: TrendPoint[]
  showOrders?: boolean
  accent?: string
}) {
  const width = 560
  const height = 180
  const path = buildPath(points, width, height, 'value')
  const orderPath = showOrders ? buildPath(points, width, height, 'orders') : ''
  const gradientId = `gradient-${title.replace(/\s+/g, '-')}`
  
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-[#FFFFFF] p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[#0F1B3D]">{title}</h3>
        <p className="mt-1 text-sm text-[#6F7192]">{subtitle}</p>
      </div>
      <div className="overflow-hidden rounded-xl bg-gray-50 p-3">
        {points.length > 0 ? (
          <>
            <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full">
              <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity="0.2" />
                  <stop offset="100%" stopColor={accent} stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3].map((line) => (
                <line
                  key={line}
                  x1="0"
                  x2={width}
                  y1={(height / 4) * line + 5}
                  y2={(height / 4) * line + 5}
                  stroke="rgba(109, 40, 217,0.3)"
                  strokeDasharray="4 8"
                />
              ))}
              <path
                d={`${path} L ${width} ${height} L 0 ${height} Z`}
                fill={`url(#${gradientId})`}
              />
              <path d={path} fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {showOrders && orderPath && (
                <path d={orderPath} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8 4" />
              )}
            </svg>
            <div className="mt-2 flex justify-between px-1 text-[10px] uppercase tracking-[0.12em] text-[#6F7192]">
              {points.map((point) => (
                <div key={point.label} className="text-center">{point.label}</div>
              ))}
            </div>
            {showOrders && (
              <div className="mt-3 flex items-center gap-4 text-[10px] text-[#6F7192]">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-4 rounded-full bg-[#6d28d9]" />
                  <span>Revenue (solid line — orange)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-4 rounded-full bg-[#3B82F6] border-b border-dashed border-[#3B82F6]" />
                  <span>Orders (dashed line — blue)</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-48 items-center justify-center text-sm text-[#6F7192]">
            No data available
          </div>
        )}
      </div>
    </div>
  )
}
