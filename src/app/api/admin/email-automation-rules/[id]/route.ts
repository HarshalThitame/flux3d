import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { logAdminAction } from '@/lib/admin/auditLog'
import type { EmailAutomationRuleRow } from 'types/database'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * PUT /api/admin/email-automation-rules/[id]
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

    const { data: existing } = await supabase
      .from('email_automation_rules')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    const oldRule = existing as EmailAutomationRuleRow
    const update: Partial<EmailAutomationRuleRow> = {}

    if ('event_name' in body) update.event_name = String(body.event_name).trim()
    if ('template_id' in body) update.template_id = String(body.template_id).trim()
    if ('target_audience' in body) update.target_audience = String(body.target_audience) as any
    if ('delay_minutes' in body) update.delay_minutes = Number(body.delay_minutes)
    if ('is_enabled' in body) update.is_enabled = Boolean(body.is_enabled)
    if ('priority' in body) update.priority = Number(body.priority)
    if ('conditions' in body) {
      update.conditions =
        typeof body.conditions === 'object' && body.conditions !== null
          ? body.conditions
          : {}
    }

    const { data, error } = await supabase
      .from('email_automation_rules')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      console.error('[admin/email-automation-rules] Update error:', error)
      return NextResponse.json(
        { error: error?.message ?? 'Update failed' },
        { status: 500 }
      )
    }

    const updated = data as EmailAutomationRuleRow

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'update_email_automation_rule',
      target_type: 'setting',
      target_id: id,
      old_value: oldRule as Record<string, unknown>,
      new_value: updated as Record<string, unknown>,
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

/**
 * DELETE /api/admin/email-automation-rules/[id]
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
      .from('email_automation_rules')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    await supabase.from('email_automation_rules').delete().eq('id', id)

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'delete_email_automation_rule',
      target_type: 'setting',
      target_id: id,
      old_value: existing as Record<string, unknown>,
      new_value: null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
