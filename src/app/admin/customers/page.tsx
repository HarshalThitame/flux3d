'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import DataTable from '@/components/admin/DataTable'
import type { AdminUser } from '@/lib/admin/types'
import SkeletonBlock from '@/components/admin/SkeletonBlock'

export default function CustomersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch('/api/admin/users', { signal: controller.signal })
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? 'Failed to load customers data.')
        }

        const json = (await response.json()) as { users: AdminUser[] }
        setUsers(json.users)
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') {
          return
        }
        setError(loadError instanceof Error ? loadError.message : 'Failed to load customers data.')
      }
    }

    void load()
    return () => controller.abort()
  }, [])

  if (error) {
    return (
      <div className="rounded-[28px] border border-rose-400/15 bg-rose-50 p-6 text-rose-100">
        {error}
      </div>
    )
  }

  if (!users) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-32 w-full" />
        <SkeletonBlock className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#7C5CFF]/20 bg-[#7C5CFF]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#7C5CFF]">
          <Users className="h-3 w-3" />
          Customer Management
        </div>
        <h1 className="mt-2 font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">Customers</h1>
        <p className="mt-2 max-w-xl text-sm text-[#6F7192]">
          View and manage your customer base
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <DataTable
          title="Customers"
          description="Track and manage all customers"
          data={users}
          searchPlaceholder="Search by name, email, phone..."
          searchKeys={['customerId', 'name', 'email', 'phone', 'city']}
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: [
                { label: 'All', value: 'all' },
                { label: 'Active', value: 'Active' },
                { label: 'VIP', value: 'VIP' },
                { label: 'Inactive', value: 'Inactive' },
                { label: 'Blacklisted', value: 'Blacklisted' },
              ],
              getValue: (row) => row.status || 'Active',
            },
          ]}
          columns={[
            { key: 'customerId', label: 'Customer ID', sortable: true, render: (row) => <span className="font-medium text-[#0F1B3D]">{row.customerId}</span> },
            { key: 'name', label: 'Name', sortable: true, render: (row) => <span className="text-[#6F7192]">{row.name}</span> },
            { key: 'email', label: 'Email', render: (row) => <span className="text-[#6F7192]">{row.email}</span> },
            { key: 'phone', label: 'Phone', render: (row) => <span className="text-[#6F7192]">{row.phone}</span> },
            { key: 'city', label: 'City', sortable: true, render: (row) => <span className="text-[#6F7192]">{row.city}</span> },
            { key: 'totalOrders', label: 'Total Orders', sortable: true, render: (row) => <span className="text-[#0F1B3D]">{row.totalOrders || 0}</span> },
            { key: 'totalSpent', label: 'Total Spent', sortable: true, render: (row) => <span className="font-medium text-[#0F1B3D]">₹{(row.totalSpent || 0).toLocaleString('en-IN')}</span> },
            { key: 'lastOrderDate', label: 'Last Order', sortable: true, render: (row) => <span className="text-[#6F7192]">{row.lastOrderDate || 'N/A'}</span> },
            { key: 'status', label: 'Status', sortable: true, render: (row) => (
              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                row.status === 'VIP' ? 'bg-purple-100 text-purple-700' :
                row.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                row.status === 'Inactive' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {row.status || 'Active'}
              </span>
            )},
            { key: 'action', label: 'Action', render: () => (
              <button className="text-[#7C5CFF] hover:text-[#7C5CFF] text-sm">View</button>
            )},
          ]}
        />
      </motion.div>
    </div>
  )
}
