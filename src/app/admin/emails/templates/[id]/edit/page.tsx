import { requireAdminUser } from '@/lib/admin/server'
import TemplateEditor from '@/components/admin/emails/TemplateEditor'
import type { EmailTemplateRow } from 'types/database'

export const dynamic = 'force-dynamic'

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdminUser()
  const { id } = await params

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/admin/email-templates/${id}`,
    { cache: 'no-store' }
  )

  let template: EmailTemplateRow | null = null
  let versions: unknown[] = []

  if (res.ok) {
    const json = await res.json()
    template = json.data as EmailTemplateRow | null
    versions = json.versions ?? []
  } else {
    console.error('[admin/templates/edit] Failed to fetch template:', await res.text())
  }

  return <TemplateEditor template={template} versions={versions} />
}
