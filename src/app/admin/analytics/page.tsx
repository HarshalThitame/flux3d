'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Eye,
  TrendingUp,
  Users,
  Clock,
  BarChart3,
  ShoppingCart,
  Search,
  Target,
  MapPin,
  Printer,
  IndianRupee,
  Package,
} from 'lucide-react'
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

type BusinessIntelData = {
  revenueAnalytics: { totalRevenue: number; revenueByPaymentMethod: { method: string; amount: number }[] }
  orderAnalytics: { totalOrders: number; ordersByStatus: { status: string; count: number }[]; ordersByCity: { city: string; count: number }[] }
  materialAnalytics: { topMaterialsByRevenue: { material: string; revenue: number }[]; materials: { id: string; name: string; sku: string | null; type: string | null; brand: string | null; price_per_gram: number | null; stock: string | null; current_stock: number | null; min_threshold: number | null; unit: string | null }[] }
  customerAnalytics: { newCustomers: number; returningCustomers: number; totalCustomers: number }
  printerPerformance: { id: string; name: string; model: string | null; status: string; lastActive: string | null }[]
}

type VisitorsData = {
  anonymousVisitors: { visitorId: string; location: string | null; device: string | null; source: string | null; visitCount: number | null }[]
  sourceBreakdown: { source: string; count: number; percent: string }[]
  firstTimeVisitors: number
  returningVisitors: number
  conversionToRegistered: { count: number; rate: string }
  intentSignals: { highIntent: { count: number; action: string }; mediumIntent: { count: number; action: string }; lowIntent: { count: number; action: string } }
  topPages: { url: string; views: number; avgTime: string }[]
  quoteUsage: { totalQuotes: number; withFile: number; withoutFile: number; reachedPayment: number; droppedAtPayment: number; convertedToOrder: number }
}

type KeywordsData = { topKeywords: { term: string; visitors: number }[] }

type PrinterStatus = 'operational' | 'busy' | 'idle' | 'maintenance' | 'offline' | string

const printerStatusClass = (status: PrinterStatus): string => {
  const s = status?.toLowerCase() ?? ''
  if (s === 'operational' || s === 'printing' || s === 'busy') return 'bg-emerald-100 text-emerald-700'
  if (s === 'maintenance' || s === 'error') return 'bg-rose-400/20 text-rose-500'
  if (s === 'offline') return 'bg-gray-200 text-[#6F7192]'
  return 'bg-yellow-100 text-yellow-700'
}

export default function AnalyticsPage() {
  const [kpis, setKpis] = useState<KPI[] | null>(null)
  const [funnel, setFunnel] = useState<FunnelData | null>(null)
  const [sources, setSources] = useState<SourcePerformance[] | null>(null)
  const [business, setBusiness] = useState<BusinessIntelData | null>(null)
  const [visitors, setVisitors] = useState<VisitorsData | null>(null)
  const [keywords, setKeywords] = useState<KeywordsData | null>(null)
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

      const funnelPromise = fetch('/api/admin/analytics/funnel', { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => setFunnel(json?.funnel ?? null))
        .catch(() => {})

      const sourcesPromise = fetch('/api/admin/analytics/sources', { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => setSources(json?.sourcePerformance || []))
        .catch(() => {})

      const businessPromise = fetch('/api/admin/analytics', { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => setBusiness(json))
        .catch(() => {})

      const visitorsPromise = fetch('/api/admin/analytics/visitors', { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => setVisitors(json))
        .catch(() => {})

      const keywordsPromise = fetch('/api/admin/analytics/keywords', { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => setKeywords(json))
        .catch(() => {})

      await Promise.allSettled([funnelPromise, sourcesPromise, businessPromise, visitorsPromise, keywordsPromise])
    }

    void load()
    return () => controller.abort()
  }, [])

  if (error) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-600">{error}</div>
  }

  const maxKeywordVisitors = keywords?.topKeywords?.[0]?.visitors || 1
  const totalSources = (visitors?.sourceBreakdown || []).reduce((sum, s) => sum + s.count, 0)

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

        {!visitors && !kpis ? (
          <SkeletonBlock className="h-48 w-full" />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="text-[10px] uppercase tracking-[0.15em] text-[#6F7192]">Anonymous Visitors Today</div>
              <div className="mt-2 text-2xl font-bold text-[#0F1B3D]">
                {visitors ? visitors.anonymousVisitors.length : (kpis?.[0]?.breakdown?.split(' · ')[0]?.replace('Unregistered: ', '') || '0')}
              </div>
              <div className="mt-1 text-xs text-[#6F7192]">
                {visitors ? `${visitors.returningVisitors} returning · ${visitors.firstTimeVisitors} first-time` : kpis?.[0]?.breakdown || ''}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="text-[10px] uppercase tracking-[0.15em] text-[#6F7192]">First-Time Anonymous</div>
              <div className="mt-2 text-2xl font-bold text-[#0F1B3D]">
                {visitors ? visitors.firstTimeVisitors : '—'}
              </div>
              <div className="mt-1 text-xs text-[#6F7192]">
                {visitors ? `Of ${visitors.anonymousVisitors.length} anonymous visitors today` : 'Never visited before'}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="text-[10px] uppercase tracking-[0.15em] text-[#6F7192]">Anonymous → Registered</div>
              <div className="mt-2 text-2xl font-bold text-[#0F1B3D]">
                {visitors ? visitors.conversionToRegistered.count : '—'}
              </div>
              <div className="mt-1 text-xs text-emerald-600">
                {visitors ? `${visitors.conversionToRegistered.rate} conversion rate` : 'No data yet'}
              </div>
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

      {/* Business Intelligence */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <div className="mb-4">
          <h2 className="font-[var(--font-syne)] text-xl font-bold text-[#0F1B3D]">Business Intelligence</h2>
          <p className="mt-1 text-sm text-[#6F7192]">Revenue, orders, materials, and printer performance at a glance.</p>
        </div>

        {!business ? (
          <SkeletonBlock className="h-96 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[#6F7192]">Total Revenue</div>
                  <IndianRupee className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="mt-2 text-2xl font-bold text-[#0F1B3D]">
                  ₹{business.revenueAnalytics.totalRevenue.toLocaleString('en-IN')}
                </div>
                <div className="mt-1 text-xs text-[#6F7192]">
                  {business.revenueAnalytics.revenueByPaymentMethod.map((m) => `${m.method}: ₹${m.amount.toLocaleString('en-IN')}`).join(' · ')}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[#6F7192]">Total Orders</div>
                  <Package className="h-4 w-4" />
                </div>
                <div className="mt-2 text-2xl font-bold text-[#0F1B3D]">{business.orderAnalytics.totalOrders}</div>
                <div className="mt-1 text-xs text-[#6F7192]">
                  {business.orderAnalytics.ordersByCity.slice(0, 3).map((c) => `${c.city}: ${c.count}`).join(' · ')}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[#6F7192]">Customers</div>
                  <Users className="h-4 w-4" />
                </div>
                <div className="mt-2 text-2xl font-bold text-[#0F1B3D]">{business.customerAnalytics.totalCustomers}</div>
                <div className="mt-1 text-xs text-[#6F7192]">
                  {business.customerAnalytics.newCustomers} new · {business.customerAnalytics.returningCustomers} returning
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 text-sm font-semibold text-[#0F1B3D]">Orders by Status</h3>
                <div className="space-y-3">
                  {business.orderAnalytics.ordersByStatus.length === 0 && (
                    <div className="text-sm text-[#6F7192]">No orders recorded yet.</div>
                  )}
                  {business.orderAnalytics.ordersByStatus.map((item) => {
                    const max = Math.max(1, ...business.orderAnalytics.ordersByStatus.map((s) => s.count))
                    return (
                      <div key={item.status} className="flex items-center gap-3">
                        <div className="w-32 text-xs text-[#6F7192]">{item.status}</div>
                        <div className="h-2 flex-1 rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-[#6d28d9]" style={{ width: `${(item.count / max) * 100}%` }} />
                        </div>
                        <div className="w-10 text-right text-xs font-semibold text-[#0F1B3D]">{item.count}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 text-sm font-semibold text-[#0F1B3D]">Top Materials by Revenue</h3>
                <div className="space-y-3">
                  {business.materialAnalytics.topMaterialsByRevenue.length === 0 && (
                    <div className="text-sm text-[#6F7192]">No material revenue yet.</div>
                  )}
                  {business.materialAnalytics.topMaterialsByRevenue.map((item) => {
                    const max = Math.max(1, ...business.materialAnalytics.topMaterialsByRevenue.map((m) => m.revenue))
                    return (
                      <div key={item.material} className="flex items-center gap-3">
                        <div className="w-40 truncate text-xs text-[#6F7192]">{item.material || 'Unknown'}</div>
                        <div className="h-2 flex-1 rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-[#6d28d9]" style={{ width: `${(item.revenue / max) * 100}%` }} />
                        </div>
                        <div className="w-24 text-right text-xs font-semibold text-[#0F1B3D]">₹{item.revenue.toLocaleString('en-IN')}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0F1B3D]">
                <Printer className="h-4 w-4" />
                Printer Performance
              </h3>
              {business.printerPerformance.length === 0 ? (
                <div className="text-sm text-[#6F7192]">No printers registered yet.</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {business.printerPerformance.map((printer) => (
                    <div key={printer.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-[#0F1B3D]">{printer.name}</div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${printerStatusClass(printer.status)}`}>
                          {printer.status}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-[#6F7192]">
                        {printer.model || 'Model unknown'} · {printer.lastActive ? `last active ${new Date(printer.lastActive).toLocaleString()}` : 'never active'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Visitor Deep-Dive */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="mb-4">
          <h2 className="font-[var(--font-syne)] text-xl font-bold text-[#0F1B3D]">Visitor Deep-Dive</h2>
          <p className="mt-1 text-sm text-[#6F7192]">Sources, intent signals, and page popularity for anonymous traffic.</p>
        </div>

        {!visitors ? (
          <SkeletonBlock className="h-96 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: 'High Intent', count: visitors.intentSignals.highIntent.count, action: visitors.intentSignals.highIntent.action, className: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                { label: 'Medium Intent', count: visitors.intentSignals.mediumIntent.count, action: visitors.intentSignals.mediumIntent.action, className: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
                { label: 'Low Intent', count: visitors.intentSignals.lowIntent.count, action: visitors.intentSignals.lowIntent.action, className: 'bg-gray-50 border-gray-200 text-[#6F7192]' },
              ].map((signal) => (
                <div key={signal.label} className={`rounded-2xl border p-5 ${signal.className}`}>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    <div className="text-[10px] uppercase tracking-[0.15em]">{signal.label}</div>
                  </div>
                  <div className="mt-2 text-2xl font-bold">{signal.count}</div>
                  <div className="mt-1 text-xs opacity-80">{signal.action}</div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 text-sm font-semibold text-[#0F1B3D]">Source Breakdown</h3>
                {visitors.sourceBreakdown.length === 0 ? (
                  <div className="text-sm text-[#6F7192]">No visitor sources recorded today.</div>
                ) : (
                  <div className="space-y-3">
                    {visitors.sourceBreakdown.map((source) => (
                      <div key={source.source} className="flex items-center gap-3">
                        <div className="w-32 truncate text-xs text-[#6F7192]">{source.source}</div>
                        <div className="h-2 flex-1 rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-[#6d28d9]" style={{ width: `${totalSources ? (source.count / totalSources) * 100 : 0}%` }} />
                        </div>
                        <div className="w-20 text-right text-xs text-[#6F7192]">{source.count} ({source.percent})</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 text-sm font-semibold text-[#0F1B3D]">Quote Tool Usage</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Quotes created', value: visitors.quoteUsage.totalQuotes },
                    { label: 'With file', value: visitors.quoteUsage.withFile },
                    { label: 'Without file', value: visitors.quoteUsage.withoutFile },
                    { label: 'Reached payment', value: visitors.quoteUsage.reachedPayment },
                    { label: 'Dropped at payment', value: visitors.quoteUsage.droppedAtPayment },
                    { label: 'Converted to order', value: visitors.quoteUsage.convertedToOrder },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <span className="text-[#6F7192]">{item.label}</span>
                      <span className="font-semibold text-[#0F1B3D]">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-sm font-semibold text-[#0F1B3D]">Top Pages by Views</h3>
              {visitors.topPages.length === 0 ? (
                <div className="text-sm text-[#6F7192]">No page views recorded today.</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-[10px] uppercase tracking-[0.12em] text-[#6F7192]">
                      <th className="pb-3 font-medium">Page</th>
                      <th className="pb-3 font-medium text-right">Views</th>
                      <th className="pb-3 font-medium text-right">Avg. Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitors.topPages.map((page, i) => (
                      <tr key={i} className="border-b border-gray-100 text-sm">
                        <td className="py-3 text-[#0F1B3D]">{page.url}</td>
                        <td className="py-3 text-right text-[#6F7192]">{page.views}</td>
                        <td className="py-3 text-right text-[#6F7192]">{page.avgTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Search Keywords */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <div className="mb-4">
          <h2 className="font-[var(--font-syne)] text-xl font-bold text-[#0F1B3D]">Search Keywords</h2>
          <p className="mt-1 text-sm text-[#6F7192]">Top search terms driving traffic to your site.</p>
        </div>

        {!keywords ? (
          <SkeletonBlock className="h-64 w-full" />
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            {keywords.topKeywords.length === 0 ? (
              <div className="text-sm text-[#6F7192]">No search keywords recorded yet.</div>
            ) : (
              <div className="space-y-3">
                {keywords.topKeywords.map((keyword, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex w-8 items-center justify-center">
                      <Search className="h-4 w-4 text-[#6F7192]" />
                    </div>
                    <div className="w-64 truncate text-sm text-[#0F1B3D]">{keyword.term}</div>
                    <div className="h-2 flex-1 rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#6d28d9] to-cyan-400" style={{ width: `${(keyword.visitors / maxKeywordVisitors) * 100}%` }} />
                    </div>
                    <div className="w-16 text-right text-sm font-semibold text-[#0F1B3D]">{keyword.visitors}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Geography */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="mb-4">
          <h2 className="font-[var(--font-syne)] text-xl font-bold text-[#0F1B3D]">Orders by City</h2>
        </div>

        {!business ? (
          <SkeletonBlock className="h-40 w-full" />
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            {business.orderAnalytics.ordersByCity.length === 0 ? (
              <div className="text-sm text-[#6F7192]">No order locations recorded yet.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {business.orderAnalytics.ordersByCity.map((city) => (
                  <div key={city.city} className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm">
                    <MapPin className="h-3.5 w-3.5 text-[#6d28d9]" />
                    <span className="text-[#0F1B3D]">{city.city}</span>
                    <span className="rounded-full bg-[#6d28d9]/10 px-2 py-0.5 text-[10px] font-semibold text-[#6d28d9]">{city.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}