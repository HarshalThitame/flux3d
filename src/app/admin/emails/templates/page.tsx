import { requireAdminUser } from '@/lib/admin/server'
import EmailTemplatesClient from '@/components/admin/emails/EmailTemplatesClient'
import type { EmailTemplateRow } from 'types/database'

export const dynamic = 'force-dynamic'

export default async function AdminEmailTemplatesPage() {
  await requireAdminUser()

  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/admin/email-templates?page=1&limit=50`, {
    cache: 'no-store',
  })

  let templates: EmailTemplateRow[] = []
  let total = 0

  if (res.ok) {
    const json = await res.json()
    templates = (json.data as EmailTemplateRow[]) ?? []
    total = json.total ?? 0
  } else {
    console.error('[admin/emails/templates] Failed to fetch templates:', await res.text())
  }

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
