import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { logAdminAction } from '@/lib/admin/auditLog'
import type { EmailTemplateRow } from 'types/database'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/email-templates/[id]/duplicate
 *
 * Clones a template, appends " (Copy)", resets is_system=false.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data: existing } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const template = existing as EmailTemplateRow

    const { data, error } = await supabase
      .from('email_templates')
      .insert({
        name: `${template.name} (Copy)`,
        email_type: template.email_type,
        category: template.category,
        subject: template.subject,
        html_body: template.html_body,
        plain_text: template.plain_text,
        variables: template.variables,
        is_enabled: false, // disabled by default so admin can review
        is_system: false,
        description: template.description,
        created_by: auth.user.id,
        updated_by: auth.user.id,
      })
      .select()
      .single()

    if (error || !data) {
      console.error('[admin/email-templates/duplicate] Insert error:', error)
      return NextResponse.json(
        { error: error?.message ?? 'Duplicate failed' },
        { status: 500 }
      )
    }

    const cloned = data as EmailTemplateRow

    await supabase.from('email_template_versions').insert({
      template_id: cloned.id,
      version_number: 1,
      subject: cloned.subject,
      html_body: cloned.html_body,
      plain_text: cloned.plain_text,
      variables: cloned.variables,
      editor_id: auth.user.id,
    })

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'duplicate_email_template',
      target_type: 'setting',
      target_id: cloned.id,
      old_value: { original_id: id },
      new_value: cloned as Record<string, unknown>,
    })

    return NextResponse.json({ data: cloned }, { status: 201 })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
