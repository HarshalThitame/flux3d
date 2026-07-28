import { getAdminOrdersData } from '@/lib/admin/queries'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminUser } from '@/lib/admin/server'
import EmailLogsTable from '@/components/admin/EmailLogsTable'
import type { EmailLogRow } from 'types/database'

export const dynamic = 'force-dynamic'

export default async function AdminEmailLogsPage() {
  await requireAdminUser()

  const supabase = createAdminClient()

  const { data, error, count } = await supabase
    .from('email_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(25)

  if (error) {
    console.error('[admin/email-logs] Server fetch error:', error)
  }

  const logs = (data ?? []) as EmailLogRow[]
  const total = count ?? 0

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Logs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Global transactional email history, status tracking, and resend controls.
          </p>
        </div>
      </div>

      <EmailLogsTable initialData={logs} initialTotal={total} />
    </div>
  )
}
