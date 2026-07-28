import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { logAdminAction } from '@/lib/admin/auditLog'
import type { EmailAutomationRuleRow } from 'types/database'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/email-automation-rules
 *
 * Query params:
 *   event_name   — filter by event
 *   is_enabled   — 'true' | 'false'
 *   page         — default 1
 *   limit        — default 25, max 100
 */
export async function GET(req: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { searchParams } = new URL(req.url)
    const eventName = searchParams.get('event_name')
    const enabled = searchParams.get('is_enabled')
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '25')))

    const supabase = createAdminClient()
    let query = supabase
      .from('email_automation_rules')
      .select('*, email_templates(name, email_type)', { count: 'exact' })

    if (eventName) {
      query = query.eq('event_name', eventName)
    }
    if (enabled === 'true') {
      query = query.eq('is_enabled', true)
    } else if (enabled === 'false') {
      query = query.eq('is_enabled', false)
    }

    query = query.order('priority', { ascending: false })
    query = query.order('created_at', { ascending: false })
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('[admin/email-automation-rules] Query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: (data ?? []) as Array<EmailAutomationRuleRow & { email_templates: { name: string; email_type: string } }>,
      total: count ?? 0,
      page,
      limit,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

/**
 * POST /api/admin/email-automation-rules
 *
 * Body: { event_name, template_id, target_audience, delay_minutes?, conditions?, priority?, is_enabled? }
 */
export async function POST(req: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = await req.json()
    const supabase = createAdminClient()

    const insert = {
      event_name: String(body.event_name ?? '').trim(),
      template_id: String(body.template_id ?? '').trim(),
      target_audience: String(body.target_audience ?? 'customer'),
      delay_minutes: Number(body.delay_minutes ?? 0),
      is_enabled: body.is_enabled === false ? false : true,
      conditions:
        typeof body.conditions === 'object' && body.conditions !== null
          ? body.conditions
          : {},
      priority: Number(body.priority ?? 0),
    }

    if (!insert.event_name || !insert.template_id) {
      return NextResponse.json(
        { error: 'Missing required fields: event_name, template_id' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('email_automation_rules')
      .insert(insert)
      .select()
      .single()

    if (error || !data) {
      console.error('[admin/email-automation-rules] Insert error:', error)
      return NextResponse.json(
        { error: error?.message ?? 'Insert failed' },
        { status: 500 }
      )
    }

    const rule = data as EmailAutomationRuleRow

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'create_email_automation_rule',
      target_type: 'setting',
      target_id: rule.id,
      old_value: null,
      new_value: rule as Record<string, unknown>,
    })

    return NextResponse.json({ data: rule }, { status: 201 })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
