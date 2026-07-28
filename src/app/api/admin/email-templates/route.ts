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
 * GET /api/admin/email-templates
 *
 * Query params:
 *   search     — ILIKE on name or email_type
 *   category   — filter by category
 *   status     — 'enabled' | 'disabled'
 *   page       — default 1
 *   limit      — default 25, max 100
 *
 * Returns: { data: EmailTemplateRow[], total: number, page, limit }
 */
export async function GET(req: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '25')))

    const supabase = createAdminClient()
    let query = supabase.from('email_templates').select('*', { count: 'exact' })

    if (search) {
      query = query.or(`name.ilike.%${search}%,email_type.ilike.%${search}%`)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (status === 'enabled') {
      query = query.eq('is_enabled', true)
    } else if (status === 'disabled') {
      query = query.eq('is_enabled', false)
    }

    query = query.order('created_at', { ascending: false })
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('[admin/email-templates] Query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: (data ?? []) as EmailTemplateRow[],
      total: count ?? 0,
      page,
      limit,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

/**
 * POST /api/admin/email-templates
 *
 * Body: { name, email_type, category, subject, html_body, plain_text?, variables?, description? }
 */
export async function POST(req: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = await req.json()
    const supabase = createAdminClient()

    const htmlBody = String(body.html_body ?? '').trim()
    const plainText = body.plain_text
      ? String(body.plain_text).trim()
      : htmlBody
        ? generatePlainText(htmlBody)
        : null

    const insert = {
      name: String(body.name ?? '').trim(),
      email_type: String(body.email_type ?? '').trim(),
      category: String(body.category ?? 'transactional'),
      subject: String(body.subject ?? '').trim(),
      html_body: htmlBody,
      plain_text: plainText,
      variables: Array.isArray(body.variables) ? body.variables : [],
      description: body.description ? String(body.description).trim() : null,
      is_enabled: body.is_enabled === false ? false : true,
      is_system: false,
      created_by: auth.user.id,
      updated_by: auth.user.id,
    }

    if (!insert.name || !insert.email_type || !insert.subject || !insert.html_body) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email_type, subject, html_body' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('email_templates')
      .insert(insert)
      .select()
      .single()

    if (error) {
      console.error('[admin/email-templates] Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const template = data as EmailTemplateRow

    // Insert version 1
    await supabase.from('email_template_versions').insert({
      template_id: template.id,
      version_number: 1,
      subject: template.subject,
      html_body: template.html_body,
      plain_text: template.plain_text,
      variables: template.variables,
      editor_id: auth.user.id,
    })

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'create_email_template',
      target_type: 'setting',
      target_id: template.id,
      old_value: null,
      new_value: template as Record<string, unknown>,
    })

    return NextResponse.json({ data: template }, { status: 201 })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
