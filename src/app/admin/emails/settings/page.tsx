import { requireAdminUser } from '@/lib/admin/server'
import { createAdminClient } from '@/lib/supabase/admin'
import EmailSettingsForm from '@/components/admin/emails/EmailSettingsForm'
import type { EmailSettingsRow } from 'types/database'

export const dynamic = 'force-dynamic'

export default async function EmailSettingsPage() {
  await requireAdminUser()

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('email_settings')
    .select('*')
    .eq('id', 'default')
    .maybeSingle()

  if (error) {
    console.error('[admin/emails/settings] DB error:', error.message)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F1B3D]">Email Settings</h1>
        <p className="text-sm text-[#6F7192] mt-1">
          Sender configuration, maintenance mode, retry policies, and global footer.
        </p>
      </div>

      <EmailSettingsForm initialData={data as EmailSettingsRow | null} />
    </div>
  )
}
