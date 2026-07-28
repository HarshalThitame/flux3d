import { requireAdminUser } from '@/lib/admin/server'
import { createAdminClient } from '@/lib/supabase/admin'
import TestEmailSender from '@/components/admin/emails/TestEmailSender'
import type { EmailTemplateRow } from 'types/database'

export const dynamic = 'force-dynamic'

export default async function EmailTestPage() {
  await requireAdminUser()

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('is_enabled', true)
    .order('name', { ascending: true })
    .limit(200)

  if (error) {
    console.error('[admin/emails/test] DB error:', error.message)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F1B3D]">Test Email Sender</h1>
        <p className="text-sm text-[#6F7192] mt-1">
          Preview and send test emails with custom variable data.
        </p>
      </div>

      <TestEmailSender templates={(data ?? []) as EmailTemplateRow[]} />
    </div>
  )
}
