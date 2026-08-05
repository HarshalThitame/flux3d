'use client'

import { useEffect, useState } from 'react'
import {
  Megaphone,
  Plus,
  ExternalLink,
  PauseCircle,
  PlayCircle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  IndianRupee,
  Tag,
  Package,
  Eye,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'

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

export default function AdminAdsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<Record<string, unknown> | null>(null)

  // Form state
  const [categoryName, setCategoryName] = useState('3D Printed Home Decor')
  const [dailyBudget, setDailyBudget] = useState(150)
  const [createDpa, setCreateDpa] = useState(true)
  const [pageId, setPageId] = useState('')

  const adAccountId = process.env.NEXT_PUBLIC_META_AD_ACCOUNT_ID || ''

  useEffect(() => {
    loadCampaigns()
  }, [])

  async function loadCampaigns() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/ads/list')
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to load')
      const data = (await res.json()) as { campaigns: Campaign[] }
      setCampaigns(data.campaigns ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)
    setCreateSuccess(null)

    try {
      const res = await fetch('/api/admin/ads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryName,
          dailyBudgetPaise: dailyBudget * 100,
          createDpa,
          pageId: pageId || undefined,
        }),
      })

      const data = (await res.json()) as Record<string, unknown>

      if (!res.ok) {
        throw new Error((data.error as string) ?? 'Creation failed')
      }

      setCreateSuccess(data)
      await loadCampaigns()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Creation failed')
    } finally {
      setCreating(false)
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
        <button
          onClick={loadCampaigns}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-[#6F7192] bg-white border border-[rgba(109,40,217,0.2)] hover:border-[rgba(109,40,217,0.4)] transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Create Ad Form */}
      <div className="rounded-2xl border border-[rgba(109,40,217,0.15)] bg-white p-6">
        <h2 className="text-lg font-semibold text-[#0F1B3D] mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-[#6d28d9]" />
          Create New Ad Campaign
        </h2>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-[#6F7192] mb-1.5">Category</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6F7192]" />
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. 3D Printed Home Decor"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgba(109,40,217,0.2)] bg-white text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9] transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6F7192] mb-1.5">
                Daily Budget (₹)
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6F7192]" />
                <input
                  type="number"
                  min={50}
                  max={50000}
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgba(109,40,217,0.2)] bg-white text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9] transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6F7192] mb-1.5">
                Facebook Page ID
              </label>
              <div className="relative">
                <Eye className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6F7192]" />
                <input
                  type="text"
                  value={pageId}
                  onChange={(e) => setPageId(e.target.value)}
                  placeholder="Optional — falls back to META_PAGE_ID"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgba(109,40,217,0.2)] bg-white text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9] transition-colors"
                />
              </div>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createDpa}
                  onChange={(e) => setCreateDpa(e.target.checked)}
                  className="w-4 h-4 rounded border-[rgba(109,40,217,0.3)] text-[#6d28d9] focus:ring-[#6d28d9]"
                />
                <span className="text-sm text-[#0F1B3D]">Also create DPA retargeting</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 bg-[#6d28d9] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#4c1d95] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Megaphone className="w-4 h-4" />
                  Create Paused Ad
                </>
              )}
            </button>
            <span className="text-xs text-[#6F7192]">
              Campaigns are created in <strong>PAUSED</strong> status. Publish manually in Meta Ads Manager.
            </span>
          </div>
        </form>

        {createError && (
          <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-50 p-4 text-sm text-rose-600 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Failed to create campaign</p>
              <p className="mt-1">{createError}</p>
            </div>
          </div>
        )}

        {createSuccess && (
          <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-50 p-4 text-sm text-emerald-700 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Campaigns created successfully!</p>
              <p className="mt-1">{(createSuccess.note as string) ?? 'Status: PAUSED'}</p>
              {createSuccess.carousel != null && (
                <div className="mt-2 space-y-1 text-xs font-mono text-emerald-800">
                  <p>Carousel Campaign: {(createSuccess.carousel as Record<string, string>).campaignId}</p>
                  <p>Ad Set: {(createSuccess.carousel as Record<string, string>).adSetId}</p>
                  <p>Ad: {(createSuccess.carousel as Record<string, string>).adId}</p>
                </div>
              )}
              {createSuccess.dpa != null && (
                <div className="mt-2 space-y-1 text-xs font-mono text-emerald-800">
                  <p>DPA Campaign: {((createSuccess.dpa as Record<string, string>) ?? {}).campaignId}</p>
                </div>
              )}
              <a
                href={(createSuccess.metaAdsManagerUrl as string) ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-[#6d28d9] hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Open in Meta Ads Manager
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Campaigns List */}
      <div>
        <h2 className="text-lg font-semibold text-[#0F1B3D] mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-[#6d28d9]" />
          Active Campaigns
        </h2>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#6d28d9] animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-rose-400/20 bg-rose-50 p-6 text-rose-600 text-center">
            <AlertCircle className="mx-auto w-8 h-8 mb-2" />
            <p>{error}</p>
            <button
              onClick={loadCampaigns}
              className="mt-3 text-sm font-medium text-[#6d28d9] hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && campaigns.length === 0 && (
          <div className="text-center py-16 rounded-2xl border border-dashed border-[rgba(109,40,217,0.2)] bg-white">
            <Megaphone className="mx-auto w-12 h-12 text-[#6F7192] mb-4" />
            <p className="text-[#6F7192]">No campaigns found in your Meta ad account</p>
            <p className="text-xs text-[#6F7192] mt-1">
              Create your first campaign using the form above
            </p>
          </div>
        )}

        {!loading && !error && campaigns.length > 0 && (
          <div className="space-y-3">
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="group bg-white rounded-2xl border border-[rgba(109,40,217,0.15)] p-5 hover:border-[rgba(109,40,217,0.3)] hover:shadow-[0_4px_20px_rgba(109,40,217,0.06)] transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-semibold text-[#0F1B3D] truncate">{c.name}</h3>
                      {statusBadge(c.status)}
                      {c.has_local_record && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-[#6d28d9] bg-[rgba(109,40,217,0.1)] border border-[rgba(109,40,217,0.2)]">
                          <CheckCircle2 className="w-3 h-3" /> Flux3D
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6F7192]">
                      <span className="inline-flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {c.objective}
                      </span>
                      {c.daily_budget && (
                        <span className="inline-flex items-center gap-1">
                          <IndianRupee className="w-3 h-3" />
                          ₹{(Number(c.daily_budget) / 100).toLocaleString('en-IN')}/day
                        </span>
                      )}
                      {c.budget_remaining && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ₹{(Number(c.budget_remaining) / 100).toLocaleString('en-IN')} remaining
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(c.created_time).toLocaleDateString('en-IN')}
                      </span>
                      {c.local_record?.category_name && (
                        <span className="inline-flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {c.local_record.category_name}
                        </span>
                      )}
                      {c.local_record?.product_count ? (
                        <span className="inline-flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {c.local_record.product_count} products
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <a
                    href={`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${adAccountId}&selected_campaign_ids=${c.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#6d28d9] hover:underline shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Manage
                    <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
