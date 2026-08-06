'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  ExternalLink,
  PauseCircle,
  PlayCircle,
  AlertCircle,
  CheckCircle2,
  Eye,
  RefreshCw,
  Trash2,
  Pencil,
  Loader2,
  FileDown,
} from 'lucide-react'
import MetaAdsDashboard, { type MetaAdsMetric } from '@/components/admin/MetaAdsDashboard'
import InsightsChart, { type InsightPoint } from '@/components/admin/InsightsChart'
import ObjectivesChart from '@/components/admin/ObjectivesChart'
import DataTable from '@/components/admin/DataTable'
import CampaignDetailDrawer from '@/components/admin/CampaignDetailDrawer'
import CampaignEditModal from '@/components/admin/CampaignEditModal'
import CreateCampaignForm from '@/components/admin/CreateCampaignForm'
import QuickActionsToolbar from '@/components/admin/QuickActionsToolbar'

type Campaign = {
  id: string
  name: string
  objective: string
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED'
  effective_status: string
  daily_budget?: string
  budget_remaining?: string
  created_time: string
  updated_time: string
  local_record?: {
    adset_id: string
    creative_id: string
    ad_id: string
    category_name: string | null
    product_count: number
    dpa_campaign_id: string | null
  } | null
  has_local_record: boolean
}

type InsightsData = {
  today: { spend: number; impressions: number; clicks: number; conversions: number }
  last7d: { spend: number; impressions: number; clicks: number; conversions: number }
  last30d: { spend: number; impressions: number; clicks: number; conversions: number }
}

function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(timer)
  }, [interval])
  return now
}

export default function AdminAdsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [insights, setInsights] = useState<InsightsData | null>(null)
  const [chartPoints, setChartPoints] = useState<InsightPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [insightsLoading, setInsightsLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<Record<string, unknown> | null>(null)
  const [asyncJobId, setAsyncJobId] = useState<string | null>(null)
  const [asyncJobStatus, setAsyncJobStatus] = useState<string>('pending')
  const [asyncJobError, setAsyncJobError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const hasInitialized = useRef(false)

  // Drawer / Modal state
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [editingCampaign, setEditingCampaign] = useState<{ id: string; name: string; daily_budget?: string } | null>(null)

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkProcessing, setBulkProcessing] = useState(false)

  // Per-row action loading
  const [actionLoadingIds, setActionLoadingIds] = useState<Set<string>>(new Set())

  const adAccountId = process.env.NEXT_PUBLIC_META_AD_ACCOUNT_ID || ''
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const asyncPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadCampaigns = useCallback(async () => {
    setLoading(true)
    setListError(null)
    try {
      const res = await fetch('/api/admin/ads/list')
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to load')
      const data = (await res.json()) as { campaigns: Campaign[] }
      setCampaigns(data.campaigns ?? [])
      setLastUpdated(new Date())
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadInsights = useCallback(async () => {
    setInsightsLoading(true)
    try {
      const res = await fetch('/api/admin/ads/insights')
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to load insights')
      const data = (await res.json()) as InsightsData
      setInsights(data)
    } catch (err) {
      console.error('Insights load error:', err)
    } finally {
      setInsightsLoading(false)
    }
  }, [])

  const loadTimeSeries = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ads/time-series')
      if (!res.ok) throw new Error('Failed to load time-series')
      const data = (await res.json()) as { points: InsightPoint[] }
      setChartPoints(data.points ?? [])
    } catch (err) {
      console.error('Time-series load error:', err)
    }
  }, [])

  const loadAll = useCallback(async () => {
    await Promise.all([loadCampaigns(), loadInsights(), loadTimeSeries()])
  }, [loadCampaigns, loadInsights, loadTimeSeries])

  // Initial load — guarded by ref to avoid cascading renders
  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true
    void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-refresh every 30s
  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      void loadAll()
    }, 30000)

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Async job polling
  useEffect(() => {
    if (!asyncJobId) {
      if (asyncPollRef.current) clearInterval(asyncPollRef.current)
      return
    }

    asyncPollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/ads/jobs/${asyncJobId}`)
        const data = (await res.json()) as { status: string; error_message?: string; result?: Record<string, unknown> }
        setAsyncJobStatus(data.status)
        if (data.status === 'completed') {
          setCreateSuccess(data.result ?? { note: 'Campaign created asynchronously.' })
          setCreateError(null)
          setAsyncJobId(null)
          void loadAll()
        } else if (data.status === 'failed') {
          setAsyncJobError(data.error_message ?? 'Async creation failed')
          setCreateError(data.error_message ?? 'Async creation failed')
          setAsyncJobId(null)
        }
      } catch {
        // Ignore poll errors
      }
    }, 3000)

    return () => {
      if (asyncPollRef.current) clearInterval(asyncPollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asyncJobId])

  async function toggleCampaign(id: string, currentStatus: string) {
    const nextStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    setActionLoadingIds((prev) => new Set(prev).add(id))
    try {
      const res = await fetch(`/api/admin/ads/campaigns/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) throw new Error('Toggle failed')
      await loadCampaigns()
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Toggle failed')
    } finally {
      setActionLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function deleteCampaign(id: string) {
    if (!confirm('Are you sure you want to archive this campaign?')) return
    setActionLoadingIds((prev) => new Set(prev).add(id))
    try {
      const res = await fetch(`/api/admin/ads/campaigns/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      await loadCampaigns()
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setActionLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  // ─── Bulk actions ─────────────────────────────────────────────────────────

  async function bulkToggleSelected() {
    setBulkProcessing(true)
    const ids = Array.from(selectedIds)
    const activeIds = ids.filter((id) => campaigns.find((c) => c.id === id)?.status === 'ACTIVE')
    const pausedIds = ids.filter((id) => campaigns.find((c) => c.id === id)?.status === 'PAUSED')

    const statusMap = new Map<string, 'ACTIVE' | 'PAUSED'>()
    activeIds.forEach((id) => statusMap.set(id, 'PAUSED'))
    pausedIds.forEach((id) => statusMap.set(id, 'ACTIVE'))

    // Group by status for API efficiency
    const toPause = activeIds
    const toResume = pausedIds

    try {
      const promises: Promise<Response>[] = []
      if (toPause.length > 0) {
        promises.push(
          fetch('/api/admin/ads/bulk/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: toPause, status: 'PAUSED' }),
          })
        )
      }
      if (toResume.length > 0) {
        promises.push(
          fetch('/api/admin/ads/bulk/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: toResume, status: 'ACTIVE' }),
          })
        )
      }

      const results = await Promise.all(promises)
      const allOk = results.every((r) => r.ok)
      if (!allOk) {
        const errors = await Promise.all(results.filter((r) => !r.ok).map((r) => r.json().catch(() => ({}))))
        throw new Error(errors.map((e) => e.error ?? 'Bulk toggle failed').join('; '))
      }

      setSelectedIds(new Set())
      await loadCampaigns()
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Bulk toggle failed')
    } finally {
      setBulkProcessing(false)
    }
  }

  async function bulkArchiveSelected() {
    setBulkProcessing(true)
    const ids = Array.from(selectedIds)

    try {
      const res = await fetch('/api/admin/ads/bulk/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? 'Bulk archive failed')
      }
      setSelectedIds(new Set())
      await loadCampaigns()
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Bulk archive failed')
    } finally {
      setBulkProcessing(false)
    }
  }

  async function bulkDuplicateSelected() {
    setBulkProcessing(true)
    const ids = Array.from(selectedIds)

    try {
      // Duplicate one by one via create endpoint (now supports duplicateFromId properly)
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch('/api/admin/ads/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ duplicateFromId: id }),
          }).then(async (res) => {
            if (!res.ok) {
              const data = (await res.json().catch(() => ({}))) as { error?: string }
              throw new Error(data.error ?? 'Duplicate failed')
            }
            return res.json()
          })
        )
      )

      const failed = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)))

      if (failed.length > 0) {
        throw new Error(`${failed.length} duplication(s) failed: ${failed.join('; ')}`)
      }

      setSelectedIds(new Set())
      await loadAll()
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Bulk duplicate failed')
    } finally {
      setBulkProcessing(false)
    }
  }

  const statusBadge = (status: string) => {
    if (status === 'ACTIVE')
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-[#10B981] bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)]">
          <PlayCircle className="w-3 h-3" /> Active
        </span>
      )
    if (status === 'PAUSED')
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-[#F59E0B] bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)]">
          <PauseCircle className="w-3 h-3" /> Paused
        </span>
      )
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-[#6F7192] bg-[rgba(111,113,146,0.1)] border border-[rgba(111,113,146,0.2)]">
        <AlertCircle className="w-3 h-3" /> {status}
      </span>
    )
  }

  // Build metrics from insights
  const metrics: MetaAdsMetric[] = insights
    ? [
        {
          label: '7-Day Spend',
          value: `₹${Math.round(insights.last7d.spend).toLocaleString('en-IN')}`,
          change: `+${Math.round((insights.today.spend / Math.max(insights.last7d.spend / 7, 1)) * 100)}% vs avg`,
          tone: 'positive',
        },
        {
          label: '7-Day Impressions',
          value: insights.last7d.impressions.toLocaleString('en-IN'),
          change: `${Math.round((insights.last7d.clicks / Math.max(insights.last7d.impressions, 1)) * 100)}% CTR`,
          tone: 'neutral',
        },
        {
          label: '7-Day Clicks',
          value: insights.last7d.clicks.toLocaleString('en-IN'),
          change: `${Math.round(insights.last7d.conversions)} conversions`,
          tone: 'positive',
        },
        {
          label: 'Active Campaigns',
          value: String(campaigns.filter((c) => c.status === 'ACTIVE').length),
          change: `${campaigns.length} total`,
          tone: 'neutral',
        },
      ]
    : [
        { label: '7-Day Spend', value: '₹0', tone: 'neutral' },
        { label: '7-Day Impressions', value: '0', tone: 'neutral' },
        { label: '7-Day Clicks', value: '0', tone: 'neutral' },
        { label: 'Active Campaigns', value: '0', tone: 'neutral' },
      ]

  const now = useNow()
  const seconds = Math.floor((now - lastUpdated.getTime()) / 1000)
  const timeAgo = seconds < 5 ? 'just now' : seconds < 60 ? `${seconds}s ago` : `${Math.floor(seconds / 60)}m ago`

  function exportCampaignsToCSV(campaigns: Campaign[]) {
    const headers = ['ID', 'Name', 'Objective', 'Status', 'Effective Status', 'Daily Budget (₹)', 'Budget Remaining (₹)', 'Created', 'Updated', 'Flux3D Record']
    const rows = campaigns.map((c) => [
      c.id,
      c.name,
      c.objective.replace(/_/g, ' '),
      c.status,
      c.effective_status,
      c.daily_budget ? (Number(c.daily_budget) / 100).toString() : '',
      c.budget_remaining ? (Number(c.budget_remaining) / 100).toString() : '',
      new Date(c.created_time).toLocaleDateString('en-IN'),
      new Date(c.updated_time).toLocaleDateString('en-IN'),
      c.has_local_record ? 'Yes' : 'No',
    ])

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const str = String(cell ?? '')
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`
            }
            return str
          })
          .join(','),
      )
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.href = url
    link.setAttribute('download', `meta-campaigns-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1B3D]">Meta Ads</h1>
          <p className="text-sm text-[#6F7192] mt-1">
            Create and manage Facebook & Instagram ad campaigns for your 3D shop
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#6F7192]">Updated {timeAgo}</span>
          <button
            onClick={loadAll}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-[#6F7192] bg-white border border-[rgba(109,40,217,0.2)] hover:border-[rgba(109,40,217,0.4)] transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading || insightsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <MetaAdsDashboard metrics={metrics} />

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <InsightsChart
            title="7-Day Performance"
            subtitle="Daily spend, impressions, and clicks across all campaigns (live Meta data)"
            points={chartPoints}
            activeMetrics={['spend', 'impressions', 'clicks']}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <ObjectivesChart
            title="Campaign Objectives"
            subtitle="Breakdown by objective type"
            campaigns={campaigns}
          />
        </motion.div>
      </div>

      {/* Create Ad Form */}
      <CreateCampaignForm
        onSuccess={(data: Record<string, unknown>) => {
          setCreateSuccess(data)
          setCreateError(null)
          setAsyncJobId(null)
          setAsyncJobStatus('pending')
          setAsyncJobError(null)
          void loadAll()
        }}
        onAsyncInitiated={(jobId: string) => {
          setAsyncJobId(jobId)
          setAsyncJobStatus('pending')
          setCreateError(null)
          setCreateSuccess(null)
        }}
        onError={(message: string) => {
          setCreateError(message)
          setCreateSuccess(null)
          setAsyncJobId(null)
        }}
      />

      {/* Page-level error / success display */}
      {createError && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-50 p-4 text-sm text-rose-600 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Campaign creation failed</p>
            <p className="mt-1">{createError}</p>
          </div>
        </div>
      )}

      {asyncJobId && (
        <div className="rounded-xl border border-[rgba(109,40,217,0.15)] bg-[rgba(109,40,217,0.05)] p-4 text-sm text-[#0F1B3D] flex items-start gap-3">
          <Loader2 className="w-5 h-5 shrink-0 mt-0.5 animate-spin text-[#6d28d9]" />
          <div>
            <p className="font-medium">Creating campaign in background…</p>
            <p className="mt-1">Job ID: {asyncJobId}</p>
            <p className="mt-1 text-xs text-[#6F7192]">Status: {asyncJobStatus}. Polling every 3 seconds.</p>
          </div>
        </div>
      )}

      {createSuccess && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-50 p-4 text-sm text-emerald-700 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Campaign created successfully!</p>
            <p className="mt-1">{(createSuccess.note as string) ?? 'Status: PAUSED'}</p>
            <a
              href={(createSuccess.metaAdsManagerUrl as string) ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[#6d28d9] hover:underline text-xs"
            >
              <ExternalLink className="w-3 h-3" />
              Open in Meta Ads Manager
            </a>
          </div>
        </div>
      )}

      {/* Campaigns Table */}
      <div className="space-y-4">
        <QuickActionsToolbar
          campaigns={campaigns.map((c) => ({ id: c.id, name: c.name, status: c.status }))}
          selectedIds={selectedIds}
          onSelectAll={(select) => {
            if (select) {
              setSelectedIds(new Set(campaigns.map((c) => c.id)))
            } else {
              setSelectedIds(new Set())
            }
          }}
          onPauseSelected={bulkToggleSelected}
          onArchiveSelected={bulkArchiveSelected}
          onDuplicateSelected={bulkDuplicateSelected}
          isProcessing={bulkProcessing}
        />

        {listError && (
          <div className="mb-4 rounded-xl border border-rose-400/20 bg-rose-50 p-4 text-sm text-rose-600 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Failed to load campaigns</p>
              <p className="mt-1">{listError}</p>
            </div>
          </div>
        )}
        <DataTable
          title="Campaigns"
          description={`${campaigns.length} campaigns in your Meta ad account. Auto-refreshes every 30 seconds.`}
          data={campaigns}
          action={
            <button
              onClick={() => exportCampaignsToCSV(campaigns)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-[#6d28d9] bg-[rgba(109,40,217,0.08)] border border-[rgba(109,40,217,0.15)] hover:bg-[rgba(109,40,217,0.12)] transition-all"
            >
              <FileDown className="w-4 h-4" />
              Export CSV
            </button>
          }
          columns={[
            {
              key: 'select',
              label: (
                <input
                  type="checkbox"
                  checked={campaigns.length > 0 && campaigns.every((c) => selectedIds.has(c.id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(new Set(campaigns.map((c) => c.id)))
                    } else {
                      setSelectedIds(new Set())
                    }
                  }}
                  className="w-4 h-4 rounded border-[rgba(109,40,217,0.3)] text-[#6d28d9] focus:ring-[#6d28d9]"
                />
              ),
              sortable: false,
              render: (row: Campaign) => (
                <input
                  type="checkbox"
                  checked={selectedIds.has(row.id)}
                  onChange={() => {
                    const next = new Set(selectedIds)
                    if (next.has(row.id)) {
                      next.delete(row.id)
                    } else {
                      next.add(row.id)
                    }
                    setSelectedIds(next)
                  }}
                  className="w-4 h-4 rounded border-[rgba(109,40,217,0.3)] text-[#6d28d9] focus:ring-[#6d28d9]"
                />
              ),
            },
            {
              key: 'name',
              label: 'Campaign',
              sortable: true,
              sortValue: (row: Campaign) => row.name,
              render: (row: Campaign) => (
                <div>
                  <div className="font-semibold text-[#0F1B3D]">{row.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    {statusBadge(row.status)}
                    {row.has_local_record && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-[#6d28d9] bg-[rgba(109,40,217,0.1)] border border-[rgba(109,40,217,0.2)]">
                        <CheckCircle2 className="w-3 h-3" /> Flux3D
                      </span>
                    )}
                  </div>
                </div>
              ),
            },
            {
              key: 'objective',
              label: 'Objective',
              sortable: true,
              sortValue: (row: Campaign) => row.objective,
              render: (row: Campaign) => (
                <span className="text-sm text-[#6F7192]">{row.objective.replace(/_/g, ' ')}</span>
              ),
            },
            {
              key: 'budget',
              label: 'Budget',
              sortable: true,
              sortValue: (row: Campaign) => Number(row.daily_budget ?? 0),
              render: (row: Campaign) => (
                <div className="text-sm">
                  {row.daily_budget ? (
                    <span className="font-medium text-[#0F1B3D]">
                      ₹{(Number(row.daily_budget) / 100).toLocaleString('en-IN')}/day
                    </span>
                  ) : (
                    <span className="text-[#6F7192]">—</span>
                  )}
                  {row.budget_remaining && (
                    <div className="text-xs text-[#6F7192] mt-0.5">
                      ₹{(Number(row.budget_remaining) / 100).toLocaleString('en-IN')} remaining
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'created',
              label: 'Created',
              sortable: true,
              sortValue: (row: Campaign) => row.created_time,
              render: (row: Campaign) => (
                <span className="text-sm text-[#6F7192]">
                  {new Date(row.created_time).toLocaleDateString('en-IN')}
                </span>
              ),
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (row: Campaign) => {
                const isLoading = actionLoadingIds.has(row.id)
                return (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleCampaign(row.id, row.status)}
                    disabled={isLoading}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
                      row.status === 'ACTIVE'
                        ? 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
                    }`}
                    title={row.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : row.status === 'ACTIVE' ? (
                      <PauseCircle className="w-3.5 h-3.5" />
                    ) : (
                      <PlayCircle className="w-3.5 h-3.5" />
                    )}
                    {row.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    onClick={() => setSelectedCampaignId(row.id)}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#6d28d9] bg-[rgba(109,40,217,0.08)] border border-[rgba(109,40,217,0.15)] hover:bg-[rgba(109,40,217,0.12)] transition-all disabled:opacity-50"
                    title="View details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </button>
                  <button
                    onClick={() =>
                      setEditingCampaign({ id: row.id, name: row.name, daily_budget: row.daily_budget })
                    }
                    disabled={isLoading}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#6F7192] bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-all disabled:opacity-50"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${adAccountId}&selected_campaign_ids=${row.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#6d28d9] bg-[rgba(109,40,217,0.08)] border border-[rgba(109,40,217,0.15)] hover:bg-[rgba(109,40,217,0.12)] transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => deleteCampaign(row.id)}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all disabled:opacity-50"
                    title="Archive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )},
            },
          ]}
          searchPlaceholder="Search campaigns..."
          searchKeys={['name', 'objective']}
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: [
                { label: 'All', value: 'all' },
                { label: 'Active', value: 'ACTIVE' },
                { label: 'Paused', value: 'PAUSED' },
                { label: 'Archived', value: 'ARCHIVED' },
              ],
              getValue: (row: Campaign) => row.status,
            },
            {
              key: 'objective',
              label: 'Objective',
              options: [
                { label: 'All', value: 'all' },
                { label: 'Sales', value: 'OUTCOME_SALES' },
                { label: 'Awareness', value: 'OUTCOME_AWARENESS' },
                { label: 'Traffic', value: 'OUTCOME_TRAFFIC' },
                { label: 'Conversions', value: 'CONVERSIONS' },
              ],
              getValue: (row: Campaign) => row.objective,
            },
          ]}
        />
      </div>

      {/* Campaign Detail Drawer */}
      <CampaignDetailDrawer
        campaignId={selectedCampaignId}
        onClose={() => setSelectedCampaignId(null)}
      />

      {/* Campaign Edit Modal */}
      <CampaignEditModal
        campaign={editingCampaign}
        onClose={() => setEditingCampaign(null)}
        onSave={() => {
          setEditingCampaign(null)
          void loadCampaigns()
        }}
      />
    </div>
  )
}
