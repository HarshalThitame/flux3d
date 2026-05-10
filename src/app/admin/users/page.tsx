'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Users } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import DataTable from '@/components/admin/DataTable'
import Drawer from '@/components/admin/Drawer'
import EmptyState from '@/components/admin/EmptyState'
import SkeletonBlock from '@/components/admin/SkeletonBlock'
import StatusBadge from '@/components/admin/StatusBadge'
import type { AdminUser } from '@/lib/admin/types'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [toast, setToast] = useState<AdminToastState>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch('/api/admin/users', { signal: controller.signal })
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? 'Failed to load users.')
        }

        const json = (await response.json()) as { users: AdminUser[] }
        setUsers(json.users)
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') return
        setError(loadError instanceof Error ? loadError.message : 'Failed to load users.')
      }
    }

    void load()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  if (error) {
    return <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-5 text-sm text-rose-300">{error}</div>
  }

  if (users === null) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <SkeletonBlock className="h-8 w-48" />
          <SkeletonBlock className="h-5 w-72 max-w-full" />
        </div>
        <SkeletonBlock className="h-[420px] w-full" />
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <EmptyState
        title="No users found"
        description="User accounts will appear here after signups begin."
        ctaLabel="Go to analytics"
        ctaHref="/admin/analytics"
      />
    )
  }

  return (
    <>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300">
            <Users className="h-3 w-3" />
            User Management
          </div>
          <h1 className="mt-2 font-[var(--font-syne)] text-3xl font-bold tracking-tight text-white">Users</h1>
          <p className="mt-2 max-w-xl text-sm text-[#6F7192]">
            Audit access, signup methods, and account roles.
          </p>
        </motion.div>

        <DataTable
          title="User Directory"
          description={`${users.length} registered users`}
          data={users}
          searchPlaceholder="Search name or email"
          searchKeys={['name', 'email', 'signupMethod', 'role']}
          onRowClick={setSelectedUser}
          filters={[
            {
              key: 'role',
              label: 'Role',
              options: [
                { label: 'Admin', value: 'admin' },
                { label: 'Operator', value: 'operator' },
                { label: 'Customer Success', value: 'customer-success' },
              ],
              getValue: (row) => row.role,
            },
          ]}
          columns={[
            { key: 'name', label: 'Name', sortable: true, sortValue: (row) => row.name, render: (row) => <span className="font-medium text-white">{row.name}</span> },
            { key: 'email', label: 'Email', sortable: true, sortValue: (row) => row.email, render: (row) => <span className="text-[#c6cee5]">{row.email}</span> },
            { key: 'signupMethod', label: 'Signup Method', sortable: true, sortValue: (row) => row.signupMethod, render: (row) => <span className="text-[#c6cee5]">{row.signupMethod}</span> },
            { key: 'role', label: 'Role', sortable: true, sortValue: (row) => row.role, render: (row) => <StatusBadge status={row.role} /> },
            { key: 'lastActive', label: 'Last Active', sortable: true, sortValue: (row) => row.lastActive, render: (row) => <span className="text-[#8b95b5]">{row.lastActive}</span> },
          ]}
        />
      </div>

      <Drawer
        open={Boolean(selectedUser)}
        onOpenChangeAction={(open) => { if (!open) setSelectedUser(null) }}
        title={selectedUser?.name ?? 'User details'}
      >
        {selectedUser && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-400 text-sm font-bold text-white">
                {selectedUser.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div>
                <div className="text-sm font-medium text-white">{selectedUser.name}</div>
                <div className="flex items-center gap-1.5 text-xs text-[#6F7192]">
                  <Mail className="h-3 w-3" />
                  {selectedUser.email}
                </div>
              </div>
            </div>

            <InfoCard label="Role" value={selectedUser.role} />
            <InfoCard label="Signup Method" value={selectedUser.signupMethod} />
            <InfoCard label="Last Active" value={selectedUser.lastActive} />

            <div className="space-y-2 border-t border-white/[0.06] pt-4">
              <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a6580]">Actions</div>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setToast({ type: 'info', message: `Activity view for ${selectedUser.name}.` })}
                  className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-2.5 text-left text-sm text-[#c6cee5] transition hover:bg-white/[0.05]"
                >
                  View activity
                </button>
              </div>
            </div>
          </div>
        )}
      </Drawer>
      <AdminToast toast={toast} />
    </>
  )
}

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
      <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a6580]">{label}</div>
      <div className="mt-1.5 text-sm text-white">{value}</div>
    </div>
  )
}
