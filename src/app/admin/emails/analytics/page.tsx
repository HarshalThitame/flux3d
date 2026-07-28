import { requireAdminUser } from '@/lib/admin/server'
import EmailAnalyticsClient from '@/components/admin/emails/EmailAnalyticsClient'

export const dynamic = 'force-dynamic'

export default async function EmailAnalyticsPage() {
  await requireAdminUser()

  return (
    <div className="space-y-6">
      <EmailAnalyticsClient />
    </div>
  )
}
