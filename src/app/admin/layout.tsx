import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import AdminShell from '@/components/admin/AdminShell'
import { requireAdminUser } from '@/lib/admin/server'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title: `${settings.businessName} — Admin Dashboard`,
    description: settings.businessDescription || 'Flux3D SaaS admin dashboard for orders, quotes, users, analytics, and operations control.',
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdminUser()
  return <AdminShell>{children}</AdminShell>
}
