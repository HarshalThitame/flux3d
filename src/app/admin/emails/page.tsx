import { requireAdminUser } from '@/lib/admin/server'
import EmailDashboard from '@/components/admin/emails/EmailDashboard'

export const dynamic = 'force-dynamic'

export default async function EmailsDashboardPage() {
  await requireAdminUser()
  return <EmailDashboard />
}
