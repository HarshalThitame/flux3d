'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Eye,
  MousePointerClick,
  LayoutTemplate,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import { motion } from 'framer-motion'
import LineChartCard from '@/components/admin/LineChartCard'
import DonutChartCard from '@/components/admin/DonutChartCard'

export type DashboardData = {
  today: {
    sent: number
    delivered: number
    failed: number
    bounced: number
    successRate: number
  }
  queue: { size: number }
  performance: {
    avgDeliveryMs: number
    openRate: number
    clickRate: number
  }
  templates: {
    mostUsed: { template_name: string; count: number } | null
    failedList: { template_name: string; count: number }[]
  }
  history: {
    date: string
    sent: number
    delivered: number
    failed: number
    opened: number
    clicked: number
  }[]
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subtext,
  tone,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  subtext?: string
  tone: 'positive' | 'warning' | 'negative' | 'neutral'
  onClick?: () => void
}) {
  const toneClasses = {
    positive: 'from-emerald-400/10 to-transparent text-emerald-600 border-emerald-200 bg-emerald-50',
    warning: 'from-amber-400/10 to-transparent text-amber-600 border-amber-200 bg-amber-50',
    negative: 'from-red-400/10 to-transparent text-red-600 border-red-200 bg-red-50',
    neutral: 'from-[#6d28d9]/10 to-transparent text-[#6d28d9] border-[#6d28d9]/20 bg-[#6d28d9]/5',
  }

  const iconBg = {
    positive: 'bg-emerald-500',
    warning: 'bg-amber-500',
    negative: 'bg-red-500',
    neutral: 'bg-[#6d28d9]',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-b p-5 transition hover:shadow-sm ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-[#6F7192]">{label}</div>
          <div className="mt-2 font-[var(--font-syne)] text-3xl font-bold text-[#0F1B3D]">{value}</div>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${iconBg[tone]} text-white shadow-lg`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {subtext && (
        <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${toneClasses[tone]}`}>
          {subtext}
        </div>
      )}
    </motion.div>
  )
}

export default function EmailDashboard() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/email-dashboard')
      .then((r) => r.json())
      .then((json) => {
        setData(json as DashboardData)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#6d28d9] border-t-transparent" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[#6F7192]">
        Failed to load dashboard data.
      </div>
    )
  }

  const { today, queue, performance, templates, history } = data

  // Build chart data
  const sentTrend = history.map((h) => ({ label: h.date.slice(5), value: h.sent }))
  const deliveredTrend = history.map((h) => ({ label: h.date.slice(5), value: h.delivered }))

  // Today's status breakdown for donut
  const statusSlices = [
    { label: 'Delivered', value: today.delivered, color: '#10B981' },
    { label: 'Failed', value: today.failed, color: '#EF4444' },
    { label: 'Bounced', value: today.bounced, color: '#F59E0B' },
    { label: 'Queued', value: queue.size, color: '#6B7280' },
  ].filter((s) => s.value > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1B3D]">Email Dashboard</h1>
          <p className="text-sm text-[#6F7192] mt-1">Real-time overview of email performance and health.</p>
        </div>
      </div>

      {/* Metric Cards Row 1 */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Mail}
          label="Emails Sent Today"
          value={String(today.sent)}
          subtext={`${today.delivered} delivered`}
          tone="neutral"
          onClick={() => router.push('/admin/emails/logs')}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Success Rate"
          value={`${today.successRate}%`}
          subtext={today.successRate >= 95 ? 'Healthy' : today.successRate >= 80 ? 'Fair' : 'Poor'}
          tone={today.successRate >= 95 ? 'positive' : today.successRate >= 80 ? 'warning' : 'negative'}
        />
        <MetricCard
          icon={Clock}
          label="Queue Size"
          value={String(queue.size)}
          subtext={queue.size === 0 ? 'All clear' : `${queue.size} pending`}
          tone={queue.size === 0 ? 'positive' : queue.size < 20 ? 'warning' : 'negative'}
          onClick={() => router.push('/admin/emails/queue')}
        />
        <MetricCard
          icon={Zap}
          label="Avg Delivery Time"
          value={formatMs(performance.avgDeliveryMs)}
          subtext="today"
          tone="neutral"
        />
      </div>

      {/* Metric Cards Row 2 */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          icon={Eye}
          label="Open Rate"
          value={`${performance.openRate}%`}
          subtext="of delivered"
          tone={performance.openRate >= 20 ? 'positive' : 'neutral'}
        />
        <MetricCard
          icon={MousePointerClick}
          label="Click Rate"
          value={`${performance.clickRate}%`}
          subtext="of delivered"
          tone={performance.clickRate >= 2 ? 'positive' : 'neutral'}
        />
        <MetricCard
          icon={XCircle}
          label="Failed Today"
          value={String(today.failed)}
          subtext={today.failed === 0 ? 'All good' : `${today.failed} need attention`}
          tone={today.failed === 0 ? 'positive' : 'negative'}
          onClick={() => router.push('/admin/emails/logs')}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <LineChartCard
          title="7-Day Email Volume"
          subtitle="Sent vs Delivered"
          points={sentTrend}
          accent="#6d28d9"
        />
        <DonutChartCard
          title="Today's Status Breakdown"
          subtitle="Distribution by final status"
          slices={statusSlices.length > 0 ? statusSlices : [{ label: 'No Data', value: 1, color: '#E5E7EB' }]}
        />
      </div>

      {/* Bottom Cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Most Used Template */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-[#6d28d9]" />
            <h3 className="text-lg font-semibold text-[#0F1B3D]">Most Used Template Today</h3>
          </div>
          {templates.mostUsed ? (
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-[#0F1B3D]">{templates.mostUsed.template_name}</div>
                <div className="text-xs text-[#6F7192]">{templates.mostUsed.count} emails sent</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-[#6F7192]">No emails sent today.</div>
          )}
        </div>

        {/* Failed Templates */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-semibold text-[#0F1B3D]">Failed Templates Today</h3>
          </div>
          {templates.failedList.length > 0 ? (
            <div className="space-y-2">
              {templates.failedList.map((t, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-red-50 px-4 py-2.5"
                >
                  <span className="text-sm text-[#0F1B3D]">{t.template_name}</span>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    {t.count} failed
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-[#6F7192]">No failures today. All systems green.</div>
          )}
        </div>
      </div>
    </div>
  )
}
