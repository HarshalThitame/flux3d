import { requireAdminUser } from '@/lib/admin/server'
import { createAdminClient } from '@/lib/supabase/admin'
import TemplateEditor from '@/components/admin/emails/TemplateEditor'
import type { EmailTemplateRow, EmailTemplateVersionRow } from 'types/database'

export const dynamic = 'force-dynamic'

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdminUser()
  const { id } = await params

  const supabase = createAdminClient()

  const { data: template, error: templateError } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (templateError) {
    console.error('[admin/templates/edit] DB error:', templateError.message)
  }

  const { data: versions } = await supabase
    .from('email_template_versions')
    .select('*')
    .eq('template_id', id)
    .order('version_number', { ascending: false })
    .limit(20)

  return (
    <TemplateEditor
      template={template as EmailTemplateRow | null}
      versions={(versions ?? []) as EmailTemplateVersionRow[]}
    />
  )
}
