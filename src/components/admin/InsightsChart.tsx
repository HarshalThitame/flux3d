'use client'

import { useMemo } from 'react'

export type InsightPoint = {
  label: string
  spend: number
  impressions: number
  clicks: number
}

function buildPath(points: InsightPoint[], width: number, height: number, valueKey: 'spend' | 'impressions' | 'clicks') {
  if (points.length === 0) return ''

  const values = points.map((p) => p[valueKey])
  const maxValue = Math.max(...values, 1)
  const step = width / Math.max(points.length - 1, 1)

  return points
    .map((point, index) => {
      const x = index * step
      const y = height - (point[valueKey] / maxValue) * (height - 10) - 5
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

const SERIES_CONFIG = {
  spend: { label: 'Spend (₹)', color: '#6d28d9', dash: '' },
  impressions: { label: 'Impressions', color: '#3B82F6', dash: '8 4' },
  clicks: { label: 'Clicks', color: '#10B981', dash: '4 4' },
} as const

type MetricKey = keyof typeof SERIES_CONFIG

export default function InsightsChart({
  title,
  subtitle,
  points,
  activeMetrics = ['spend'],
  height = 180,
}: {
  title: string
  subtitle: string
  points: InsightPoint[]
  activeMetrics?: MetricKey[]
  height?: number
}) {
  const width = 560
  const gradientId = `gradient-${title.replace(/\s+/g, '-')}`

  const spendPath = useMemo(() => buildPath(points, width, height, 'spend'), [points, height])
  const impressionsPath = useMemo(() => buildPath(points, width, height, 'impressions'), [points, height])
  const clicksPath = useMemo(() => buildPath(points, width, height, 'clicks'), [points, height])

  const pathMap: Record<MetricKey, string> = {
    spend: spendPath,
    impressions: impressionsPath,
    clicks: clicksPath,
  }

  const totalSpend = points.reduce((sum, p) => sum + p.spend, 0)
  const totalImpressions = points.reduce((sum, p) => sum + p.impressions, 0)
  const totalClicks = points.reduce((sum, p) => sum + p.clicks, 0)

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-[#FFFFFF] p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#0F1B3D]">{title}</h3>
          <p className="mt-1 text-sm text-[#6F7192]">{subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-1 text-[10px] text-[#6F7192]">
          <span>₹{Math.round(totalSpend).toLocaleString('en-IN')} spend</span>
          <span>{totalImpressions.toLocaleString('en-IN')} impressions</span>
          <span>{totalClicks.toLocaleString('en-IN')} clicks</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-gray-50 p-3">
        {points.length > 0 ? (
          <>
            <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full">
              <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#6d28d9" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#6d28d9" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {[0, 1, 2, 3].map((line) => (
                <line
                  key={line}
                  x1="0"
                  x2={width}
                  y1={(height / 4) * line + 5}
                  y2={(height / 4) * line + 5}
                  stroke="rgba(109, 40, 217,0.2)"
                  strokeDasharray="4 8"
                />
              ))}

              {/* Area fill for spend */}
              {activeMetrics.includes('spend') && (
                <path
                  d={`${spendPath} L ${width} ${height} L 0 ${height} Z`}
                  fill={`url(#${gradientId})`}
                />
              )}

              {/* Data lines */}
              {activeMetrics.map((metric) => (
                <path
                  key={metric}
                  d={pathMap[metric]}
                  fill="none"
                  stroke={SERIES_CONFIG[metric].color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={SERIES_CONFIG[metric].dash}
                />
              ))}
            </svg>

            {/* X-axis labels */}
            <div className="mt-2 flex justify-between px-1 text-[10px] uppercase tracking-[0.12em] text-[#6F7192]">
              {points.map((point) => (
                <div key={point.label} className="text-center">{point.label}</div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] text-[#6F7192]">
              {activeMetrics.map((metric) => (
                <div key={metric} className="flex items-center gap-1">
                  <div
                    className="h-2 w-4 rounded-full"
                    style={{
                      backgroundColor: SERIES_CONFIG[metric].color,
                      borderBottom: SERIES_CONFIG[metric].dash ? `1px dashed ${SERIES_CONFIG[metric].color}` : undefined,
                    }}
                  />
                  <span>{SERIES_CONFIG[metric].label}</span>
                </div>
              ))}
            </div>
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
