'use client'

import { useEffect, useState } from 'react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import DataTable from '@/components/admin/DataTable'
import Drawer from '@/components/admin/Drawer'
import EmptyState from '@/components/admin/EmptyState'
import SkeletonBlock from '@/components/admin/SkeletonBlock'
import StatusBadge from '@/components/admin/StatusBadge'
import type { AdminUser } from '@/lib/admin/types'

type UserRow = AdminUser

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[] | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
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

        const json = (await response.json()) as { users: UserRow[] }
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
    return <div className="rounded-[28px] border border-rose-400/15 bg-rose-400/10 p-6 text-rose-100">{error}</div>
  }

  if (users === null) {
    return <SkeletonBlock className="h-[420px] w-full" />
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
        <section className="rounded-[32px] border border-white/10 bg-[rgba(10,16,31,0.94)] p-6">
          <h1 className="font-[var(--font-syne)] text-4xl font-extrabold text-white">Users</h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-[#9ca7c6]">
            Audit access, signup methods, and account roles with an operator-friendly user management view.
          </p>
        </section>

        <DataTable
          title="User Directory"
          description="Searchable user access list with role context and action entry points."
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
            { key: 'email', label: 'Email', sortable: true, sortValue: (row) => row.email, render: (row) => row.email },
            { key: 'signupMethod', label: 'Signup Method', sortable: true, sortValue: (row) => row.signupMethod, render: (row) => row.signupMethod },
            { key: 'role', label: 'Role', sortable: true, sortValue: (row) => row.role, render: (row) => <StatusBadge status={row.role} /> },
            { key: 'lastActive', label: 'Last Active', sortable: true, sortValue: (row) => row.lastActive, render: (row) => row.lastActive },
          ]}
        />
      </div>

      <Drawer
        open={Boolean(selectedUser)}
        onOpenChange={(open) => {
          if (!open) setSelectedUser(null)
        }}
        title={selectedUser?.name ?? 'User details'}
      >
        {selectedUser ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[#7f8aac]">Account</div>
              <div className="mt-2 text-lg font-semibold text-white">{selectedUser.email}</div>
              <div className="mt-3"><StatusBadge status={selectedUser.role} /></div>
            </div>
            <div className="grid gap-3">
              {['View activity', 'Block user', 'Delete user'].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setToast({ type: label === 'Delete user' ? 'error' : 'info', message: `${label} triggered for ${selectedUser.name}.` })}
                  className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm font-medium text-white transition hover:bg-white/[0.07]"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </Drawer>
      <AdminToast toast={toast} />
    </>
  )
}
