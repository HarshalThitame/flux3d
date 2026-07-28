import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { logAdminAction } from '@/lib/admin/auditLog'
import { generatePlainText } from '@/lib/email/template-engine'
import type { EmailTemplateRow } from 'types/database'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/email-templates/[id]
 *
 * Returns template + last 20 versions
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data: template, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const { data: versions } = await supabase
      .from('email_template_versions')
      .select('*')
      .eq('template_id', id)
      .order('version_number', { ascending: false })
      .limit(20)

    return NextResponse.json({
      data: template as EmailTemplateRow,
      versions: versions ?? [],
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

/**
 * PUT /api/admin/email-templates/[id]
 *
 * Updates template and auto-creates a version row.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id } = await params
    const body = await req.json()
    const supabase = createAdminClient()

    // Fetch existing
    const { data: existing } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const oldTemplate = existing as EmailTemplateRow

    // Build update
    const update: Partial<EmailTemplateRow> = {
      updated_by: auth.user.id,
      updated_at: new Date().toISOString(),
    }
    if ('name' in body) update.name = String(body.name).trim()
    if ('subject' in body) update.subject = String(body.subject).trim()
    if ('html_body' in body) {
      update.html_body = String(body.html_body).trim()
      // Auto-generate plain_text if html_body changed and plain_text not explicitly provided
      if (!('plain_text' in body)) {
        update.plain_text = generatePlainText(update.html_body)
      }
    }
    if ('plain_text' in body) update.plain_text = body.plain_text ? String(body.plain_text).trim() : null
    if ('variables' in body) update.variables = Array.isArray(body.variables) ? body.variables : []
    if ('description' in body) update.description = body.description ? String(body.description).trim() : null
    if ('is_enabled' in body) update.is_enabled = Boolean(body.is_enabled)
    if ('category' in body) update.category = String(body.category) as EmailTemplateRow['category']

    // Prevent changing email_type on system templates
    if (oldTemplate.is_system && body.email_type && body.email_type !== oldTemplate.email_type) {
      return NextResponse.json(
        { error: 'Cannot change email_type on system templates' },
        { status: 400 }
      )
    }
    if ('email_type' in body && !oldTemplate.is_system) {
      update.email_type = String(body.email_type).trim()
    }

    const { data, error } = await supabase
      .from('email_templates')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      console.error('[admin/email-templates] Update error:', error)
      return NextResponse.json(
        { error: error?.message ?? 'Update failed' },
        { status: 500 }
      )
    }

    const updated = data as EmailTemplateRow

    // Determine next version number
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
      action: 'update_email_template',
      target_type: 'setting',
      target_id: id,
      old_value: oldTemplate as Record<string, unknown>,
      new_value: updated as Record<string, unknown>,
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

/**
 * DELETE /api/admin/email-templates/[id]
 *
 * Blocks deletion of system templates.
 */
export async function DELETE(
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

    if (template.is_system) {
      return NextResponse.json(
        { error: 'System templates cannot be deleted' },
        { status: 400 }
      )
    }

    await supabase.from('email_templates').delete().eq('id', id)

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'delete_email_template',
      target_type: 'setting',
      target_id: id,
      old_value: template as Record<string, unknown>,
      new_value: null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
