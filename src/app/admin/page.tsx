'use client'

import { useEffect, useState } from 'react'
import DashboardCards from '@/components/admin/DashboardCards'
import DataTable from '@/components/admin/DataTable'
import DonutChartCard from '@/components/admin/DonutChartCard'
import LineChartCard from '@/components/admin/LineChartCard'
import SkeletonBlock from '@/components/admin/SkeletonBlock'
import StatusBadge from '@/components/admin/StatusBadge'
import { Eye } from 'lucide-react'
import Link from 'next/link'
import { type AdminOrder } from '@/lib/admin/types'
import { useProfile } from '@/hooks/useProfile'

type DashboardResponse = {
  metrics: Array<{ label: string; value: string; change: string; tone: 'neutral' | 'positive' | 'warning' }>
  orders: AdminOrder[]
  quotes: Array<{ id: number; quote_id: string | null; created_at: string; name: string; estimate?: { total?: number } | null }>
  users: Array<{ id: string; name: string | null; email: string }>
  files: Array<{ id: string; name: string; user: string; uploadedAt: string; size: string }>
  materials: Array<{ id: string; name: string; price_per_gram: number; density: number; colors: string[]; stock: string }>
  materialUsage: Array<{ label: string; value: number; color: string }>
}

function timeSeriesFromOrders(orders: AdminOrder[]) {
  const monthly = orders.reduce<Record<string, number>>((acc, order) => {
    const month = new Date(order.createdAt).toLocaleString('en-US', { month: 'short' })
    acc[month] = (acc[month] ?? 0) + 1
    return acc
  }, {})

  return Object.entries(monthly).map(([label, value]) => ({ label, value }))
}

export default function AdminDashboardPage() {
  const { profile, loading: profileLoading } = useProfile()
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (profileLoading) {
      return
    }

    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch('/api/admin/dashboard', { signal: controller.signal })
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? 'Failed to load admin dashboard data.')
        }

        const json = (await response.json()) as DashboardResponse
        setData(json)
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') {
          return
        }
        setError(loadError instanceof Error ? loadError.message : 'Failed to load admin dashboard data.')
      }
    }

    void load()
    return () => controller.abort()
  }, [profileLoading])

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

  if (error) {
    return (
      <div className="rounded-[28px] border border-rose-400/15 bg-rose-400/10 p-6 text-rose-100">
        {error}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
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

  const chartOrders = timeSeriesFromOrders(data.orders)

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(124,92,255,0.18),transparent_28%),radial-gradient(circle_at_right,rgba(167,139,250,0.14),transparent_24%),rgba(10,16,31,0.92)] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.24)]">
        <div className="inline-flex rounded-full border border-[#7C5CFF]/25 bg-[#7C5CFF]/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#A78BFA]">
          Command Center
        </div>
        <h1 className="mt-5 font-[var(--font-syne)] text-[clamp(2.4rem,5vw,4.7rem)] font-extrabold tracking-[-2px] text-white">
          Run the entire 3D printing operation from one <span className="text-[#7dd3fc]">calm, structured dashboard</span>
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-[#9ca7c6]">
          Monitor orders, approve quotes, track material utilization, and keep the production floor moving without drowning in tabs.
        </p>
      </section>

      <DashboardCards metrics={data.metrics} />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <LineChartCard
          title="Orders Over Time"
          subtitle="Daily order velocity across all print request channels."
          points={chartOrders}
        />
        <DonutChartCard
          title="Material Usage"
          subtitle="Current demand split by material family."
          slices={data.materialUsage}
        />
      </div>

      <DataTable
        title="Recent Activity"
        description="High-signal operational events from quotes, orders, user access, and inventory."
        data={data.orders.slice(0, 8)}
        searchPlaceholder="Search recent activity"
        searchKeys={['id', 'material', 'fullName', 'notes']}
        columns={[
          {
            key: 'id',
            label: 'Activity',
            sortable: true,
            sortValue: (row) => row.id,
            render: (row) => (
              <div>
                <div className="font-medium text-white">{row.orderNumber ?? row.id}</div>
                <div className="mt-1 text-xs text-[#8f9abb]">{row.fullName}</div>
              </div>
            ),
          },
          { key: 'status', label: 'Status', sortable: true, sortValue: (row) => row.status, render: (row) => <StatusBadge status={row.status} /> },
          { key: 'createdAt', label: 'Time', sortable: true, sortValue: (row) => row.createdAt, render: (row) => new Date(row.createdAt).toLocaleString('en-IN') },
        ]}
      />

       <DataTable
         title="Live Order Queue"
         description="The most recent jobs moving through review, approval, printing, and completion."
         data={data.orders}
         searchPlaceholder="Search orders"
         searchKeys={['id', 'fullName', 'material', 'status']}
         filters={[
           {
             key: 'status',
             label: 'Status',
             options: [
               { label: 'Pending', value: 'pending' },
               { label: 'Reviewed', value: 'reviewed' },
               { label: 'Approved', value: 'approved' },
               { label: 'Printing', value: 'printing' },
               { label: 'Completed', value: 'completed' },
             ],
             getValue: (row) => row.status,
           },
         ]}
         columns={[
           { key: 'id', label: 'Order ID', sortable: true, sortValue: (row) => row.id, render: (row) => <span className="font-medium text-white">{row.orderNumber ?? row.id}</span> },
           { key: 'fullName', label: 'Customer', sortable: true, sortValue: (row) => row.fullName, render: (row) => row.fullName },
           { key: 'material', label: 'Material', sortable: true, sortValue: (row) => row.material, render: (row) => row.material },
           { key: 'status', label: 'Status', sortable: true, sortValue: (row) => row.status, render: (row) => <StatusBadge status={row.status} /> },
           { key: 'price', label: 'Price', sortable: true, sortValue: (row) => row.totalPrice, render: (row) => `₹${Number(row.totalPrice).toLocaleString('en-IN')}` },
         ]}
       />

       <div className="mt-6 flex items-center gap-4">
         <Link
           href="/admin/blog"
           className="inline-flex items-center gap-2 rounded-xl bg-[#7C5CFF] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
         >
           <Eye className="h-4 w-4" />
           Manage Blog Posts
         </Link>
       </div>
     </div>
   )
}
