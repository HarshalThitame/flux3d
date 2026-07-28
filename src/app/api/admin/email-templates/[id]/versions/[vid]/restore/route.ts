import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { logAdminAction } from '@/lib/admin/auditLog'
import type { EmailTemplateRow } from 'types/database'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/email-templates/[id]/versions/[vid]/restore
 *
 * Restores an old version by copying its content into the current template.
 * Creates a new version row (so the restore itself is auditable).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; vid: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id, vid } = await params
    const supabase = createAdminClient()

    // Fetch the version to restore
    const { data: version } = await supabase
      .from('email_template_versions')
      .select('*')
      .eq('template_id', id)
      .eq('version_number', Number(vid))
      .maybeSingle()

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    // Fetch current template for audit
    const { data: currentTemplate } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!currentTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Update template with version content
    const { data: updated, error: updateError } = await supabase
      .from('email_templates')
      .update({
        subject: version.subject ?? currentTemplate.subject,
        html_body: version.html_body ?? currentTemplate.html_body,
        plain_text: version.plain_text ?? currentTemplate.plain_text,
        variables: version.variables ?? currentTemplate.variables,
        updated_by: auth.user.id,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError || !updated) {
      console.error('[admin/email-templates/restore] Update error:', updateError)
      return NextResponse.json(
        { error: updateError?.message ?? 'Restore failed' },
        { status: 500 }
      )
    }

    // Create a new version row for this restore action
    const { data: lastVersion } = await supabase
      .from('email_template_versions')
      .select('version_number')
      .eq('template_id', id)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextVersion = (lastVersion?.version_number ?? 0) + 1

    await supabase.from('email_template_versions').insert({
      template_id: id,
      version_number: nextVersion,
      subject: updated.subject,
      html_body: updated.html_body,
      plain_text: updated.plain_text,
      variables: updated.variables,
      editor_id: auth.user.id,
    })

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'restore_email_template_version',
      target_type: 'setting',
      target_id: id,
      old_value: {
        restored_from_version: vid,
        previous_subject: currentTemplate.subject,
        previous_html_body: currentTemplate.html_body,
      },
      new_value: updated as Record<string, unknown>,
    })

    return NextResponse.json({
      data: updated as EmailTemplateRow,
      restoredFromVersion: Number(vid),
      newVersion: nextVersion,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
