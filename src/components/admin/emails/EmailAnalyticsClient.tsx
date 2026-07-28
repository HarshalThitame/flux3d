'use client'

import { useEffect, useState } from 'react'
import { TrendPoint, DonutSlice } from '@/lib/admin/types'
import DonutChartCard from '@/components/admin/DonutChartCard'
import LineChartCard from '@/components/admin/LineChartCard'
import { motion } from 'framer-motion'
import {
  Calendar,
  MailCheck,
  Eye,
  MousePointerClick,
  ArrowDown,
  AlertTriangle,
  BarChart3,
} from 'lucide-react'

type AnalyticsData = {
  range: string
  startDate: string
  endDate: string
  totals: {
    sent: number
    delivered: number
    failed: number
    bounced: number
    opened: number
    clicked: number
  }
  rates: {
    deliveryRate: number
    bounceRate: number
    failureRate: number
    openRate: number
    clickRate: number
  }
  history: { date: string; sent: number; delivered: number; failed: number; opened: number; clicked: number }[]
  topTemplates: { template_name: string; count: number }[]
  topOpenedTemplates: { template_name: string; count: number }[]
}

function MetricPill({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  color: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${color} text-white`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs text-[#6F7192]">{label}</div>
        <div className="text-xl font-bold text-[#0F1B3D]">{value}</div>
      </div>
    </div>
  )
}

function BarList({
  title,
  items,
  color,
}: {
  title: string
  items: { label: string; value: number }[]
  color: string
}) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-[#0F1B3D]">{title}</h3>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#0F1B3D]">{item.label}</span>
              <span className="font-medium text-[#6F7192]">{item.value}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(item.value / max) * 100}%` }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
              />
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-[#6F7192]">No data available for this range.</div>
        )}
      </div>
    </div>
  )
}

export default function EmailAnalyticsClient() {
  const [range, setRange] = useState<'today' | '7d' | '30d' | 'custom'>('7d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    params.set('range', range)
    if (range === 'custom' && customFrom && customTo) {
      params.set('from', customFrom)
      params.set('to', customTo)
    }
    try {
      const res = await fetch(`/api/admin/email-analytics?${params.toString()}`)
      const json = await res.json()
      if (res.ok) {
        setData(json as AnalyticsData)
      } else {
        setError(json.error ?? 'Failed to load analytics')
        console.error('[EmailAnalytics] API error:', json.error)
      }
    } catch (err) {
      setError('Network error while loading analytics')
      console.error('[EmailAnalytics] Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range])

  // Debounced custom range fetch
  useEffect(() => {
    if (range !== 'custom') return
    if (!customFrom || !customTo) return
    const t = setTimeout(() => fetchAnalytics(), 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customFrom, customTo])

  if (!data && loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#6d28d9] border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1B3D]">Email Analytics</h1>
          <p className="text-sm text-[#6F7192] mt-1">
            Delivery, engagement, and performance metrics over time.
          </p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-5 w-5" />
            Failed to load analytics
          </div>
          <p className="mt-1 text-sm">{error}</p>
          <button
            type="button"
            onClick={fetchAnalytics}
            className="mt-4 rounded-xl bg-[#6d28d9] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#5b21b6]"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const totals = data?.totals
  const rates = data?.rates

  // Build donut slices
  const bounceSlices: DonutSlice[] = totals
    ? [
        { label: 'Delivered', value: totals.delivered, color: '#10B981' },
        { label: 'Bounced', value: totals.bounced, color: '#F59E0B' },
      ]
    : []
  const failureSlices: DonutSlice[] = totals
    ? [
        { label: 'Delivered', value: totals.delivered, color: '#10B981' },
        { label: 'Failed', value: totals.failed, color: '#EF4444' },
      ]
    : []

  // Top templates
  const topList = (data?.topTemplates ?? []).map((t) => ({
    label: t.template_name,
    value: t.count,
  }))
  const openedList = (data?.topOpenedTemplates ?? []).map((t) => ({
    label: t.template_name,
    value: t.count,
  }))

  return (
    <div className="space-y-6">
      {/* Header + Range Selector */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1B3D]">Email Analytics</h1>
          <p className="text-sm text-[#6F7192] mt-1">
            Delivery, engagement, and performance metrics over time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['today', '7d', '30d', 'custom'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-xl px-3.5 py-2 text-sm font-medium transition min-h-[44px] ${
                range === r
                  ? 'bg-[#6d28d9] text-white'
                  : 'border border-gray-200 bg-white text-[#6F7192] hover:bg-gray-50'
              }`}
            >
              {r === 'today' ? 'Today' : r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : 'Custom'}
            </button>
          ))}
          {range === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2 text-sm text-[#0F1B3D] outline-none"
              />
              <span className="text-sm text-[#6F7192]">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2 text-sm text-[#0F1B3D] outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Rate Pills */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricPill
          icon={MailCheck}
          label="Delivery Rate"
          value={`${rates?.deliveryRate ?? 0}%`}
          color="bg-emerald-500"
        />
        <MetricPill
          icon={Eye}
          label="Open Rate"
          value={`${rates?.openRate ?? 0}%`}
          color="bg-[#6d28d9]"
        />
        <MetricPill
          icon={MousePointerClick}
          label="Click Rate"
          value={`${rates?.clickRate ?? 0}%`}
          color="bg-cyan-500"
        />
        <MetricPill
          icon={AlertTriangle}
          label="Bounce Rate"
          value={`${rates?.bounceRate ?? 0}%`}
          color="bg-amber-500"
        />
      </div>

      {/* Time-Series Trend */}
      {data?.history && data.history.length > 0 && (
        <LineChartCard
          title="Email Activity Over Time"
          subtitle={`Daily sent, delivered, and opened counts for selected range`}
          points={data.history.map((h) => ({ label: h.date.slice(5), value: h.sent, orders: h.opened }))}
          showOrders
          accent="#6d28d9"
        />
      )}

      {/* Donut Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DonutChartCard
          title="Bounce Rate"
          subtitle="Delivered vs Bounced"
          slices={bounceSlices.length > 0 ? bounceSlices : [{ label: 'No Data', value: 1, color: '#E5E7EB' }]}
        />
        <DonutChartCard
          title="Failure Rate"
          subtitle="Delivered vs Failed"
          slices={failureSlices.length > 0 ? failureSlices : [{ label: 'No Data', value: 1, color: '#E5E7EB' }]}
        />
      </div>

      {/* Top Templates */}
      <div className="grid gap-4 lg:grid-cols-2">
        <BarList title="Top Templates by Volume" items={topList} color="#6d28d9" />
        <BarList title="Most Opened Templates" items={openedList} color="#10B981" />
      </div>
    </div>
  )
}
