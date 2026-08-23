import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { logAdminAction } from '@/lib/admin/auditLog'
import { normalizeShippingRule, type ShippingRulePayload } from '@/lib/admin/shipping-rules'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ ruleId: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { ruleId } = await context.params
    const body = (await request.json()) as ShippingRulePayload
    const normalized = normalizeShippingRule(body)
    if ('error' in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const { data: existing, error: fetchError } = await supabase
      .from('shipping_rules')
      .select('*')
      .eq('id', ruleId)
      .single()

    if (fetchError) throw new Error(fetchError.message)

    const { data, error } = await supabase
      .from('shipping_rules')
      .update({ ...normalized.data, updated_at: new Date().toISOString() })
      .eq('id', ruleId)
      .select('*')
      .single()

    if (error) throw new Error(error.message)

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'update_shipping_rule',
      target_type: 'shipping_rule',
      target_id: ruleId,
      old_value: existing as Record<string, unknown>,
      new_value: data as Record<string, unknown>,
    })

    return NextResponse.json({ rule: data })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { ruleId } = await context.params
    const supabase = createAdminSupabaseClient()

    const { data: existing, error: fetchError } = await supabase
      .from('shipping_rules')
      .select('*')
      .eq('id', ruleId)
      .single()

    if (fetchError) throw new Error(fetchError.message)

    const { error } = await supabase
      .from('shipping_rules')
      .delete()
      .eq('id', ruleId)

    if (error) throw new Error(error.message)

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'delete_shipping_rule',
      target_type: 'shipping_rule',
      target_id: ruleId,
      old_value: existing as Record<string, unknown>,
      new_value: {},
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
