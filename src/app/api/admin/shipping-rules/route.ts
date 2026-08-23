import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { logAdminAction } from '@/lib/admin/auditLog'
import { normalizeShippingRule, type ShippingRulePayload } from '@/lib/admin/shipping-rules'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('shipping_rules')
      .select('*')
      .order('state', { ascending: true, nullsFirst: false })
      .order('pincode_range_start', { ascending: true, nullsFirst: false })

    if (error) throw new Error(error.message)
    return NextResponse.json({ rules: data ?? [] })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = (await request.json()) as ShippingRulePayload
    const normalized = normalizeShippingRule(body)
    if ('error' in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('shipping_rules')
      .insert(normalized.data)
      .select('*')
      .single()

    if (error) throw new Error(error.message)

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'create_shipping_rule',
      target_type: 'shipping_rule',
      target_id: String(data.id),
      old_value: {},
      new_value: data as Record<string, unknown>,
    })

    return NextResponse.json({ rule: data })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
