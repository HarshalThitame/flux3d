import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Body = {
  orderId?: unknown
  consent?: unknown
}

function appendNote(existing: string | null | undefined, note: string) {
  return existing ? `${existing}\n${note}` : note
}

export async function POST(request: Request) {
  const authSupabase = await createServerSupabaseClient()
  const { data: authData, error: authError } = await authSupabase.auth.getUser()
  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as Body
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : ''
    const consent = body.consent === true

    if (!orderId || !consent) {
      return NextResponse.json({ error: 'Consent is required.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const { data: order, error: orderError } = await supabase
      .from('shelf_orders')
      .select('id, user_id, admin_notes')
      .eq('id', orderId)
      .eq('user_id', authData.user.id)
      .maybeSingle()

    if (orderError) throw new Error(orderError.message)
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

    const note = JSON.stringify({
      type: 'PAYU_CONSENT',
      acceptedAt: new Date().toISOString(),
      userAgent: request.headers.get('user-agent') || '',
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '',
      policyVersion: 'payu-checkout-v1',
    })

    const { error: updateError } = await supabase
      .from('shelf_orders')
      .update({
        payment_method: 'payu',
        admin_notes: appendNote(order.admin_notes, note),
      })
      .eq('id', orderId)

    if (updateError) throw new Error(updateError.message)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record consent.' },
      { status: 400 }
    )
  }
}
