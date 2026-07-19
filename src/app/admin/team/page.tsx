'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, Search } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'

type AdminUser = {
  id: string
  email: string | null
  full_name: string | null
  is_admin: boolean
  is_finance: boolean
  is_order_manager: boolean
  is_printer_manager: boolean
  is_qc_manager: boolean
  created_at: string | null
}

const roleLabels: Record<string, string> = {
  is_admin: 'Super Admin',
  is_finance: 'Finance',
  is_order_manager: 'Orders',
  is_printer_manager: 'Printers',
  is_qc_manager: 'QC/Manufacturing',
}

export default function AdminTeamPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<AdminToastState>(null)
  const [savingUserId, setSavingUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers(data.users ?? [])
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to load users' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    window.setTimeout(() => void loadUsers(), 0)
  }, [loadUsers])

  async function toggleRole(userId: string, role: string, currentValue: boolean) {
    setSavingUserId(userId)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, [role]: !currentValue }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, [role]: !currentValue } : u)))
      setToast({ type: 'success', message: 'Role updated' })
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to update role' })
    } finally {
      setSavingUserId(null)
    }
  }

  const filtered = users.filter((u) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (u.email?.toLowerCase() ?? '').includes(q) || (u.full_name?.toLowerCase() ?? '').includes(q)
  })

  return (
    <div className="space-y-6">
      <AdminToast toast={toast} />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/20 bg-[#6d28d9]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#6d28d9]">
            <ShieldCheck className="h-3 w-3" /> Admin
          </div>
          <h1 className="font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">Team & Roles</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#6F7192]">Manage admin user permissions and role assignments.</p>
        </div>
        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F7192]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-9 py-2.5 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/30" />
        </div>
      </motion.div>

      {loading ? (
        <div className="py-12 text-center text-sm text-[#6F7192]">Loading users...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-[#6F7192]">No users found.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#6d28d9]/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#6d28d9]/5 bg-gray-50/50">
                <th className="px-4 py-3 text-left font-semibold text-[#6F7192]">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-[#6F7192]">Email</th>
                {Object.keys(roleLabels).map((role) => (
                  <th key={role} className="px-3 py-3 text-center font-semibold text-[#6F7192]">{roleLabels[role]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b border-[#6d28d9]/5 transition hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-semibold text-[#0F1B3D]">{user.full_name || '—'}</td>
                  <td className="px-4 py-3 text-[#6F7192]">{user.email}</td>
                  {Object.keys(roleLabels).map((role) => (
                    <td key={role} className="px-3 py-3 text-center">
                      <button
                        type="button"
                        disabled={savingUserId === user.id}
                        onClick={() => toggleRole(user.id, role, Boolean((user as Record<string, unknown>)[role]))}
                        className={`inline-flex h-6 w-10 items-center rounded-full p-0.5 transition ${
                          (user as Record<string, unknown>)[role] ? 'bg-[#6d28d9]' : 'bg-gray-200'
                        } ${savingUserId === user.id ? 'opacity-50' : ''}`}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                          (user as Record<string, unknown>)[role] ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
