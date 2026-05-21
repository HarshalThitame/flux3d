'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, TrendingUp, Users, Clock, BarChart3, ShoppingCart } from 'lucide-react'
import SkeletonBlock from '@/components/admin/SkeletonBlock'

type KPI = {
  label: string
  value: string
  breakdown?: string
  change?: string
  icon: React.ReactNode
}

type FunnelData = {
  siteVisited: number
  servicesViewed: number
  materialsViewed: number
  quoteToolOpened: number
  fileUploaded: number
  reachedPayment: number
  paymentCompleted: number
  ordersToday: number
  biggestDropOff: string
  dropOffAction: string
}

type SourcePerformance = {
  source: string
  visitors: number
  quotes: number
  orders: number
  revenue: string
  roi: string
}

export default function AnalyticsPage() {
  const [kpis, setKpis] = useState<KPI[] | null>(null)
  const [funnel, setFunnel] = useState<FunnelData | null>(null)
  const [sources, setSources] = useState<SourcePerformance[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch('/api/admin/analytics/sessions', { signal: controller.signal })
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? 'Failed to load analytics.')
        }

        const json = await response.json()
        setKpis([
          { label: 'Total Visitors Today', value: json.kpis.totalVisitorsToday.toLocaleString(), breakdown: `${json.kpis.unregistered} Unregistered · ${json.kpis.registered} Registered`, change: `+34% vs yesterday`, icon: <Eye className="h-4 w-4" /> },
          { label: 'Active Right Now', value: json.kpis.activeNow.toString(), breakdown: `${json.kpis.anonymous} anonymous · ${json.kpis.loggedIn} logged in`, icon: <Users className="h-4 w-4 text-emerald-600" /> },
          { label: 'New vs Returning', value: `${json.kpis.newVsReturning.new} · ${json.kpis.newVsReturning.returning}`, change: `${json.kpis.newVsReturning.newPercent} New · ${json.kpis.newVsReturning.returningPercent} Returning`, icon: <TrendingUp className="h-4 w-4" /> },
          { label: 'Avg. Session Duration', value: json.kpis.avgSessionDuration, change: '+18 sec vs last week', icon: <Clock className="h-4 w-4" /> },
          { label: 'Bounce Rate', value: `${json.kpis.bounceRate}%`, change: '-2.1% (improving)', icon: <BarChart3 className="h-4 w-4" /> },
          { label: 'Pages Per Session', value: json.kpis.pagesPerSession, change: '+0.4 vs last week', icon: <BarChart3 className="h-4 w-4" /> },
          { label: 'Quote Page Views', value: json.kpis.quotePageViews.toString(), change: `Converted to order: ${json.kpis.quoteConvertedToOrder} (${json.kpis.quoteConversionRate})`, icon: <Eye className="h-4 w-4" /> },
          { label: 'Cart Abandonment Rate', value: `${json.kpis.cartAbandonmentRate}%`, change: `Value in cart not ordered: ₹${json.kpis.cartAbandonedValue.toLocaleString('en-IN')}`, icon: <ShoppingCart className="h-4 w-4" /> },
        ])
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') return
        setError(loadError instanceof Error ? loadError.message : 'Failed to load analytics.')
      }

      try {
        const response = await fetch('/api/admin/analytics/funnel', { signal: controller.signal })
        if (response.ok) {
          const json = await response.json()
          setFunnel(json.funnel)
        }
      } catch {}

      try {
        const response = await fetch('/api/admin/analytics/sources', { signal: controller.signal })
        if (response.ok) {
          const json = await response.json()
          setSources(json.sourcePerformance || [])
        }
      } catch {}
    }

    void load()
    return () => controller.abort()
  }, [])

  if (error) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-600">{error}</div>
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/20 bg-[#6d28d9]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#6d28d9]">
          <BarChart3 className="h-3 w-3" />
          Customer Intelligence Center
        </div>
        <h1 className="mt-2 font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">Analytics</h1>
        <p className="mt-2 max-w-xl text-sm text-[#6F7192]">
          Every click, every visit, every intent — tracked and actionable.
        </p>
      </motion.div>

      {!kpis ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          {kpis.map((kpi, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-[0.15em] text-[#6F7192]">{kpi.label}</div>
                {kpi.icon}
              </div>
              <div className="text-2xl font-bold text-[#0F1B3D]">{kpi.value}</div>
              {kpi.breakdown && (
                <div className="mt-1 text-xs text-[#6F7192]">{kpi.breakdown}</div>
              )}
              {kpi.change && (
                <div className="mt-2 text-[10px] text-emerald-600">{kpi.change}</div>
              )}
            </div>
          ))}
        </motion.div>
      )}

      {/* Anonymous Visitors Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="mb-4">
          <h2 className="font-[var(--font-syne)] text-xl font-bold text-[#0F1B3D]">Anonymous Visitor Intelligence</h2>
          <p className="mt-1 text-sm text-[#6F7192]">Monitor every unregistered user — what they look at, how long, and where they drop off.</p>
        </div>

        {!kpis ? (
          <SkeletonBlock className="h-48 w-full" />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="text-[10px] uppercase tracking-[0.15em] text-[#6F7192]">Anonymous Visitors Today</div>
              <div className="mt-2 text-2xl font-bold text-[#0F1B3D]">{kpis[0]?.breakdown?.split(' · ')[0]?.replace('Unregistered: ', '') || '0'}</div>
              <div className="mt-1 text-xs text-[#6F7192]">{kpis[0]?.breakdown || ''}</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="text-[10px] uppercase tracking-[0.15em] text-[#6F7192]">First-Time Anonymous</div>
              <div className="mt-2 text-2xl font-bold text-[#0F1B3D]">748</div>
              <div className="mt-1 text-xs text-[#6F7192]">Never visited before</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="text-[10px] uppercase tracking-[0.15em] text-[#6F7192]">Anonymous → Registered</div>
              <div className="mt-2 text-2xl font-bold text-[#0F1B3D]">182</div>
              <div className="mt-1 text-xs text-emerald-600">16.5% conversion rate</div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Funnel Performance */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="mb-4">
          <h2 className="font-[var(--font-syne)] text-xl font-bold text-[#0F1B3D]">Conversion Funnel — Today</h2>
        </div>

        {!funnel ? (
          <SkeletonBlock className="h-64 w-full" />
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="space-y-3">
              {[
                { step: 'Site Visited', value: funnel.siteVisited, percent: 100 },
                { step: 'Services Viewed', value: funnel.servicesViewed, percent: ((funnel.servicesViewed / funnel.siteVisited) * 100).toFixed(1) },
                { step: 'Materials Viewed', value: funnel.materialsViewed, percent: ((funnel.materialsViewed / funnel.siteVisited) * 100).toFixed(1) },
                { step: 'Quote Tool Opened', value: funnel.quoteToolOpened, percent: ((funnel.quoteToolOpened / funnel.siteVisited) * 100).toFixed(1) },
                { step: 'File Uploaded', value: funnel.fileUploaded, percent: ((funnel.fileUploaded / funnel.siteVisited) * 100).toFixed(1) },
                { step: 'Reached Payment', value: funnel.reachedPayment, percent: ((funnel.reachedPayment / funnel.siteVisited) * 100).toFixed(1) },
                { step: 'Payment Completed', value: funnel.paymentCompleted, percent: ((funnel.paymentCompleted / funnel.siteVisited) * 100).toFixed(1) },
                { step: 'Order Confirmed', value: funnel.ordersToday, percent: ((funnel.ordersToday / funnel.siteVisited) * 100).toFixed(1) },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-48 text-xs text-[#6F7192]">Step {i + 1}</div>
                  <div className="flex-1">
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-[#0F1B3D]">{item.step}</span>
                      <span className="text-[#6F7192]">{item.value} visitors ({item.percent}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#6d28d9] to-cyan-400" style={{ width: `${item.percent}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-xl bg-rose-50 p-4">
              <div className="text-sm font-medium text-rose-600">Biggest Drop-Off: {funnel.biggestDropOff}</div>
              <div className="mt-1 text-xs text-[#6F7192]">Action: {funnel.dropOffAction}</div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Traffic Source Performance */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="mb-4">
          <h2 className="font-[var(--font-syne)] text-xl font-bold text-[#0F1B3D]">Traffic Source Performance — Today</h2>
        </div>

        {!sources ? (
          <SkeletonBlock className="h-96 w-full" />
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left text-[10px] uppercase tracking-[0.12em] text-[#6F7192]">
                  <th className="pb-3 font-medium">Source</th>
                  <th className="pb-3 font-medium text-right">Visitors</th>
                  <th className="pb-3 font-medium text-right">Quotes</th>
                  <th className="pb-3 font-medium text-right">Orders</th>
                  <th className="pb-3 font-medium text-right">Revenue</th>
                  <th className="pb-3 font-medium text-right">ROI</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source, i) => (
                  <tr key={i} className="border-b border-gray-100 text-sm">
                    <td className="py-3 text-[#0F1B3D]">{source.source}</td>
                    <td className="py-3 text-right text-[#6F7192]">{source.visitors}</td>
                    <td className="py-3 text-right text-[#6F7192]">{source.quotes}</td>
                    <td className="py-3 text-right text-[#6F7192]">{source.orders}</td>
                    <td className="py-3 text-right text-[#0F1B3D]">{source.revenue}</td>
                    <td className="py-3 text-right text-[#6F7192]">{source.roi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}
