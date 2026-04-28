import type { Metadata } from 'next'
import AdminShell from '@/components/admin/AdminShell'
import { requireAdminUser } from '@/lib/admin/server'

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Flux3D SaaS admin dashboard for orders, quotes, users, analytics, and operations control.',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdminUser()
  return <AdminShell>{children}</AdminShell>
}
