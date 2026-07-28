import { requireAdminUser } from '@/lib/admin/server'
import EmailQueueTable from '@/components/admin/emails/EmailQueueTable'

export const dynamic = 'force-dynamic'

export default async function EmailQueuePage() {
  await requireAdminUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F1B3D]">Email Queue</h1>
        <p className="text-sm text-[#6F7192] mt-1">
          Monitor and manage queued, sending, and retrying emails.
        </p>
      </div>

      <EmailQueueTable />
    </div>
  )
}
