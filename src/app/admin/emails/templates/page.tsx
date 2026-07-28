import { requireAdminUser } from '@/lib/admin/server'
import { createAdminClient } from '@/lib/supabase/admin'
import EmailTemplatesClient from '@/components/admin/emails/EmailTemplatesClient'
import type { EmailTemplateRow } from 'types/database'

export const dynamic = 'force-dynamic'

export default async function AdminEmailTemplatesPage() {
  await requireAdminUser()

  const supabase = createAdminClient()

  const { data, error, count } = await supabase
    .from('email_templates')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(0, 49)

  if (error) {
    console.error('[admin/emails/templates] DB error:', error.message)
  }

  const templates = (data ?? []) as EmailTemplateRow[]
  const total = count ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1B3D]">Email Templates</h1>
          <p className="text-sm text-[#6F7192] mt-1">
            Manage, edit, preview and test all transactional, marketing, and system email templates.
          </p>
        </div>
      </div>

      <EmailTemplatesClient initialData={templates} initialTotal={total} />
    </div>
  )
}
