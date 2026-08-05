'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { ArrowRight, BellRing, Package, TrendingDown, Wallet } from 'lucide-react'
import type { AdminToastState } from '@/components/admin/AdminToast'
import StockKpiCards from '@/components/admin/stock/StockKpiCards'
import StockStatusBadge from '@/components/admin/stock/StockStatusBadge'
import {
  STOCK_REASON_LABELS,
  type StockOverview,
  type StockSkuRow,
  type StockMovementRow,
  type StockAlertRow,
} from '@/lib/shop/stock'
import { formatVariantLabel } from '@/lib/shop/selection'

type StockOverviewTabProps = {
  toast: AdminToastState
  setToast: (toast: AdminToastState) => void
  refresh: () => void
  refreshKey: number
  onNavigate: (tab: 'skus' | 'alerts' | 'reservations' | 'movements') => void
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function StockOverviewTab({
  setToast,
  refreshKey,
  onNavigate,
}: StockOverviewTabProps) {
  const [overview, setOverview] = useState<StockOverview | null>(null)
  const [atRiskSkus, setAtRiskSkus] = useState<StockSkuRow[]>([])
  const [recentMovements, setRecentMovements] = useState<StockMovementRow[]>([])
  const [recentAlerts, setRecentAlerts] = useState<StockAlertRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [overviewResponse, skusResponse, movementsResponse, alertsResponse] = await Promise.all([
        fetch('/api/3d-shop/admin/stock/overview'),
        fetch('/api/3d-shop/admin/stock/skus?page_size=8&sort=updated_at'),
        fetch('/api/3d-shop/admin/stock/movements?page=1'),
        fetch('/api/3d-shop/admin/stock/alerts?status=open&page=1&page_size=5'),
      ])

      const [overviewData, skusData, movementsData, alertsData] = await Promise.all([
        overviewResponse.json().catch(() => ({})),
        skusResponse.json().catch(() => ({})),
        movementsResponse.json().catch(() => ({})),
        alertsResponse.json().catch(() => ({})),
      ])

      if (overviewResponse.ok) setOverview(overviewData.overview ?? null)
      if (skusResponse.ok) {
        const rows = (skusData.skus ?? []) as StockSkuRow[]
        setAtRiskSkus(
          rows
            .filter((row) => row.stock_status === 'low_stock' || row.stock_status === 'out_of_stock')
            .slice(0, 8)
        )
      }
      if (movementsResponse.ok) setRecentMovements((movementsData.movements ?? []).slice(0, 6))
      if (alertsResponse.ok) setRecentAlerts((alertsData.alerts ?? []).slice(0, 3))
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load stock dashboard.' })
    } finally {
      setLoading(false)
    }
  }, [setToast])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load, refreshKey])

  return (
    <div className="space-y-6">
      <StockKpiCards overview={overview} loading={loading} />

      <div className="grid gap-6 xl:grid-cols-3">
        {/* At-risk SKUs */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white xl:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-[#0F1B3D]">At-risk inventory</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('skus')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#6d28d9] transition hover:text-[#5b21b6]"
            >
              Manage SKUs <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-40 animate-pulse rounded bg-gray-100" />
                    <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
                  </div>
                </div>
              ))
            ) : atRiskSkus.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-[#6F7192]">
                <Package className="mx-auto h-8 w-8 text-emerald-400" />
                <p className="mt-3 font-medium text-[#0F1B3D]">All inventory is healthy</p>
                <p className="mt-1 text-xs">No SKUs are low on stock or out of stock.</p>
              </div>
            ) : (
              atRiskSkus.map((sku) => (
                <div key={sku.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    {sku.product_thumbnail ? (
                      <Image src={sku.product_thumbnail} alt={sku.product_name ?? ''} fill sizes="40px" className="object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-[10px] text-[#6F7192]">No img</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[#0F1B3D]">{sku.product_name}</div>
                    <div className="truncate text-xs text-[#6F7192]">
                      {sku.sku_code} · {formatVariantLabel(sku.variant_combination)}
                    </div>
                  </div>
                  <div className="hidden text-right sm:block">
                    <div className="text-sm font-bold text-[#0F1B3D]">{sku.stock_quantity}</div>
                    <div className="text-[11px] text-[#6F7192]">
                      {sku.reserved_quantity > 0 ? `${sku.reserved_quantity} reserved` : 'on hand'}
                    </div>
                  </div>
                  <StockStatusBadge status={sku.stock_status} />
                </div>
              ))
            )}
          </div>
        </section>

        {/* Alerts + recent movements */}
        <section className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-rose-500" />
                <h2 className="text-sm font-semibold text-[#0F1B3D]">Recent alerts</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('alerts')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#6d28d9] transition hover:text-[#5b21b6]"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {recentAlerts.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-[#6F7192]">
                  {loading ? 'Loading…' : 'No open alerts. Everything is healthy.'}
                </div>
              ) : (
                recentAlerts.map((alert) => (
                  <div key={alert.id} className="px-5 py-3">
                    <p className="text-xs font-semibold text-[#0F1B3D]">{alert.message}</p>
                    <p className="mt-1 text-[11px] text-[#6F7192]">{formatDate(alert.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-[#6d28d9]" />
                <h2 className="text-sm font-semibold text-[#0F1B3D]">Recent movements</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('movements')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#6d28d9] transition hover:text-[#5b21b6]"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {recentMovements.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-[#6F7192]">
                  {loading ? 'Loading…' : 'No movements recorded yet.'}
                </div>
              ) : (
                recentMovements.map((movement) => (
                  <div key={movement.id} className="flex items-center gap-3 px-5 py-3">
                    <span
                      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        movement.quantity_delta > 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-600'
                      }`}
                    >
                      {movement.quantity_delta > 0 ? '+' : '−'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-[#0F1B3D]">
                        {movement.product_name ?? 'Product'} · {movement.sku_code}
                      </div>
                      <div className="text-[11px] text-[#6F7192]">
                        {STOCK_REASON_LABELS[movement.reason_type]} · {formatDate(movement.created_at)}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#0F1B3D]">
                      {Math.abs(movement.quantity_delta)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
