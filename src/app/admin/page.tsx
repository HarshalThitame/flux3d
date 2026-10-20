'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import DashboardCards from '@/components/admin/DashboardCards'
import DataTable from '@/components/admin/DataTable'
import DonutChartCard from '@/components/admin/DonutChartCard'
import LineChartCard from '@/components/admin/LineChartCard'
import SkeletonBlock from '@/components/admin/SkeletonBlock'
import StatusBadge from '@/components/admin/StatusBadge'
import { RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { type AdminOrder } from '@/lib/admin/types'
import { useProfile } from '@/hooks/useProfile'

const RANGE_DAYS = [7, 30, 90] as const
const POLL_INTERVAL_MS = 60_000

type DashboardResponse = {
  metrics: Array<{ label: string; value: string; change: string; tone: 'neutral' | 'positive' | 'warning' }>
  orders: AdminOrder[]
  quotes: Array<{ id: number; quote_id: string | null; created_at: string; name: string; estimate?: { total?: number } | null }>
  users: Array<{ id: string; name: string | null; email: string }>
  files: Array<{ id: string; name: string; user: string; uploadedAt: string; size: string }>
  materials: Array<{ id: string; name: string; price_per_gram: number; density: number; colors: string[]; stock: string }>
  materialUsage: Array<{ label: string; value: number; color: string }>
}

function timeSeriesFromOrders(orders: AdminOrder[], days: number) {
  const byDay = days <= 30

  const buckets = orders.reduce<Record<string, number>>((acc, order) => {
    const date = new Date(order.createdAt)
    if (Number.isNaN(date.getTime())) return acc
    const key = byDay
      ? `d-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      : `m-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  return Object.entries(buckets)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => {
      const [, year, month, day] = key.split('-')
      const label = byDay
        ? new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })
        : new Date(Number(year), Number(month) - 1, 1).toLocaleString('en-US', {
            month: 'short',
            year: '2-digit',
          })
      return { label, value }
    })
}

export default function AdminDashboardPage() {
  const { loading: profileLoading } = useProfile()
  const [days, setDays] = useState<number>(30)
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const dataRef = useRef<DashboardResponse | null>(null)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  const load = useCallback(
    async (silent: boolean) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      if (!silent) {
        setError(null)
        setRefreshing(true)
      }

      try {
        const response = await fetch(`/api/admin/dashboard?days=${days}`, { signal: controller.signal })
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? 'Failed to load admin dashboard data.')
        }

        if (!controller.signal.aborted) {
          const json = (await response.json()) as DashboardResponse
          setData(json)
          setError(null)
        }
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError' || controller.signal.aborted) {
          return
        }
        if (!silent || !dataRef.current) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load admin dashboard data.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setRefreshing(false)
        }
      }
    },
    [days]
  )

  useEffect(() => {
    if (profileLoading) {
      return
    }

    window.setTimeout(() => void load(false), 0)

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void load(true)
      }
    }, POLL_INTERVAL_MS)

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void load(true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      abortRef.current?.abort()
    }
  }, [load, profileLoading])

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-40 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="rounded-[28px] border border-rose-400/15 bg-rose-50 p-6 text-rose-600">
        {error}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-40 w-full" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <SkeletonBlock className="h-[420px] w-full" />
          <SkeletonBlock className="h-[420px] w-full" />
        </div>
        <SkeletonBlock className="h-12 w-48" />
      </div>
    )
  }

  const chartOrders = timeSeriesFromOrders(data.orders, days)
  const chartGranularity = days <= 30 ? 'by day' : 'by month'

  return (
    <div className="space-y-6">

      <section className="flex flex-wrap items-end justify-between gap-5 rounded-2xl border border-[#e4e8ef] bg-white px-6 py-6 shadow-[0_3px_18px_rgba(25,35,65,0.035)] sm:px-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7c58c9]">Flux3D / Operations</p>
          <h1 className="mt-2 font-[var(--font-syne)] text-[clamp(1.8rem,3vw,2.5rem)] font-bold tracking-[-0.04em] text-[#182540]">Business overview</h1>
          <p className="mt-2 text-sm text-[#66758d]">A live view of sales, production and work that needs attention.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/custom-orders/create" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5720ae]">Create manual order <span aria-hidden="true">→</span></Link>
          <Link href="/admin/orders" className="inline-flex min-h-10 items-center rounded-xl border border-[#dce2ec] bg-white px-4 py-2 text-sm font-semibold text-[#273b58] transition hover:bg-[#f5f2fc]">View orders</Link>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
          {RANGE_DAYS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDays(option)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                days === option ? 'bg-[#6d28d9] text-white' : 'text-[#6F7192] hover:bg-gray-100'
              }`}
            >
              {option} days
            </button>
          ))}
        </div>
        <div className="inline-flex items-center gap-2 text-xs text-[#6F7192]">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-[#6d28d9]' : ''}`} />
          {refreshing ? 'Refreshing…' : 'Auto-refreshes every 60s'}
        </div>
      </div>

      <DashboardCards metrics={data.metrics} />

      <section aria-labelledby="attention-heading" className="rounded-2xl border border-[#e4e8ef] bg-white p-5 shadow-[0_3px_18px_rgba(25,35,65,0.035)] sm:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="attention-heading" className="text-base font-bold text-[#182540]">Work requiring attention</h2>
          <span className="text-xs text-[#8190a5]">Current operations and recent quotes</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Link href="/admin/orders?status=pending" className="group rounded-xl border border-[#ede6f8] bg-[#faf7ff] p-4 transition hover:border-[#bda6eb] hover:shadow-sm">
            <span className="block text-xs font-semibold text-[#695681]">Pending requests</span>
            <strong className="mt-2 block text-2xl font-bold text-[#372453]">{data.metrics[2]?.value ?? '0'}</strong>
            <span className="mt-2 flex items-center justify-between text-xs text-[#7b63a8]">Review new orders <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span></span>
          </Link>
          <Link href="/admin/production" className="group rounded-xl border border-[#dce9f6] bg-[#f6faff] p-4 transition hover:border-[#9cc5e8] hover:shadow-sm">
            <span className="block text-xs font-semibold text-[#536d87]">Active prints</span>
            <strong className="mt-2 block text-2xl font-bold text-[#233d5c]">{data.metrics[3]?.value ?? '0'}</strong>
            <span className="mt-2 flex items-center justify-between text-xs text-[#5b7c9b]">Open production <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span></span>
          </Link>
          <Link href="/admin/quotes" className="group rounded-xl border border-[#e5ece5] bg-[#f7faf7] p-4 transition hover:border-[#a9cfb2] hover:shadow-sm">
            <span className="block text-xs font-semibold text-[#607d67]">Recent quotes</span>
            <strong className="mt-2 block text-2xl font-bold text-[#294d35]">{data.quotes.length}</strong>
            <span className="mt-2 flex items-center justify-between text-xs text-[#62896b]">Open quotes <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span></span>
          </Link>
          <Link href="/admin/refunds" className="group rounded-xl border border-[#f2e8df] bg-[#fffaf5] p-4 transition hover:border-[#deb99a] hover:shadow-sm">
            <span className="block text-xs font-semibold text-[#8a715c]">Refund rate</span>
            <strong className="mt-2 block text-2xl font-bold text-[#604730]">{data.metrics[6]?.value ?? '0%'}</strong>
            <span className="mt-2 flex items-center justify-between text-xs text-[#a07e60]">Review refunds <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span></span>
          </Link>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-400/15 bg-rose-50 p-4 text-sm text-rose-600">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <LineChartCard
          title="Order volume"
          subtitle={`Order velocity ${chartGranularity} across all print request channels (last ${days} days).`}
          points={chartOrders}
        />
        <DonutChartCard
          title="Material mix"
          subtitle={`Share of print orders by material family (last ${days} days).`}
          slices={data.materialUsage}
        />
      </div>

       <DataTable
         title="Recent orders"
         description={`The most recent jobs moving through review, approval, printing, and completion (last ${days} days).`}
         data={data.orders}
         searchPlaceholder="Search orders"
         searchKeys={['id', 'fullName', 'material', 'status']}
         exportFilename="live-order-queue.csv"
         filters={[
           {
             key: 'status',
             label: 'Status',
             options: [
               { label: 'Pending', value: 'pending' },
               { label: 'Confirmed', value: 'confirmed' },
               { label: 'Printing', value: 'printing' },
               { label: 'Delivered', value: 'delivered' },
               { label: 'Completed', value: 'completed' },
             ],
             getValue: (row) => row.status,
           },
         ]}
         columns={[
           { key: 'id', label: 'Order ID', sortable: true, sortValue: (row) => row.id, exportValue: (row) => row.orderNumber ?? row.id, render: (row) => <span className="font-medium text-[#0F1B3D]">{row.orderNumber ?? row.id}</span> },
           { key: 'fullName', label: 'Customer', sortable: true, sortValue: (row) => row.fullName, exportValue: (row) => row.fullName, render: (row) => row.fullName },
           { key: 'material', label: 'Material', sortable: true, sortValue: (row) => row.material, exportValue: (row) => row.material, render: (row) => row.material },
           { key: 'status', label: 'Status', sortable: true, sortValue: (row) => row.status, exportValue: (row) => row.status, render: (row) => <StatusBadge status={row.status} /> },
           { key: 'price', label: 'Price', sortable: true, sortValue: (row) => row.grandTotal, exportValue: (row) => row.grandTotal, render: (row) => `₹${Number(row.grandTotal).toLocaleString('en-IN')}` },
         ]}
       />

       <p className="pt-1 text-xs text-[#8997a9]">Metrics reflect the selected period. Production counts show current workflow state.</p>
     </div>
   )
}
