'use client'

import { useEffect, useState } from 'react'
import DashboardCards from '@/components/admin/DashboardCards'
import DonutChartCard from '@/components/admin/DonutChartCard'
import LineChartCard from '@/components/admin/LineChartCard'
import EmptyState from '@/components/admin/EmptyState'
import SkeletonBlock from '@/components/admin/SkeletonBlock'
import type { DashboardMetric, DonutSlice, TrendPoint } from '@/lib/admin/types'

type AnalyticsResponse = {
  revenueTrend: TrendPoint[]
  ordersGrowth: TrendPoint[]
  materialUsage: DonutSlice[]
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [metrics, setMetrics] = useState<DashboardMetric[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const [analyticsResponse, dashboardResponse] = await Promise.all([
          fetch('/api/admin/analytics', { signal: controller.signal }),
          fetch('/api/admin/dashboard', { signal: controller.signal }),
        ])

        if (!analyticsResponse.ok || !dashboardResponse.ok) {
          const body = (await analyticsResponse.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? 'Failed to load analytics.')
        }

        const analyticsJson = (await analyticsResponse.json()) as AnalyticsResponse
        const dashboardJson = (await dashboardResponse.json()) as { metrics: DashboardMetric[] }
        setData(analyticsJson)
        setMetrics(dashboardJson.metrics)
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') return
        setError(loadError instanceof Error ? loadError.message : 'Failed to load analytics.')
      }
    }

    void load()
    return () => controller.abort()
  }, [])

  if (error) {
    return <div className="rounded-[28px] border border-rose-400/15 bg-rose-400/10 p-6 text-rose-100">{error}</div>
  }

  if (!data || !metrics) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-40 w-full" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <SkeletonBlock className="h-[420px] w-full" />
          <SkeletonBlock className="h-[420px] w-full" />
        </div>
        <SkeletonBlock className="h-[420px] w-full" />
      </div>
    )
  }

  if (data.revenueTrend.length === 0 && data.ordersGrowth.length === 0) {
    return (
      <EmptyState
        title="No analytics yet"
        description="Analytics will populate after orders start flowing through the system."
        ctaLabel="Review orders"
        ctaHref="/admin/orders"
      />
    )
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 rounded-[32px] border border-white/10 bg-[rgba(10,16,31,0.94)] p-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-[var(--font-syne)] text-4xl font-extrabold text-white">Analytics</h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-[#9ca7c6]">
            Revenue, growth, and demand mix views designed for leadership and operations reviews.
          </p>
        </div>
        <div className="flex gap-3">
          <select className="rounded-[18px] border border-white/10 bg-[#0f182c] px-4 py-3 text-sm text-white">
            <option>Last 30 days</option>
            <option>Last 90 days</option>
            <option>Year to date</option>
          </select>
          <select className="rounded-[18px] border border-white/10 bg-[#0f182c] px-4 py-3 text-sm text-white">
            <option>All channels</option>
            <option>Website</option>
            <option>Enterprise</option>
            <option>Operators</option>
          </select>
        </div>
      </section>

      <DashboardCards metrics={metrics} />

      <div className="grid gap-6 xl:grid-cols-2">
        <LineChartCard
          title="Revenue Trend"
          subtitle="Net print request revenue over time."
          points={data.revenueTrend}
          accent="#39BDF8"
        />
        <LineChartCard
          title="Orders Growth"
          subtitle="Order volume momentum by week."
          points={data.ordersGrowth}
          accent="#34D399"
        />
      </div>

      <DonutChartCard
        title="Demand Mix"
        subtitle="Which material families are driving the busiest queue."
        slices={data.materialUsage}
      />
    </div>
  )
}
