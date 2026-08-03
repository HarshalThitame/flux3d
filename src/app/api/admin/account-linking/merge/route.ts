import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminRequest } from '@/lib/admin/request'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    const body = await request.json()
    const { requestId } = body as { requestId: string }

    if (!requestId) {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 })
    }

    const { data: linkRequest, error: fetchError } = await supabase
      .from('link_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!linkRequest) {
      return NextResponse.json({ error: 'Link request not found' }, { status: 404 })
    }

    if (linkRequest.confirmed_at) {
      return NextResponse.json({ error: 'Link request already confirmed' }, { status: 400 })
    }

    if (new Date(linkRequest.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link request has expired' }, { status: 400 })
    }

    const targetPhone = linkRequest.target_phone
    const targetUserId = linkRequest.target_user_id

    if (!targetUserId) {
      return NextResponse.json({ error: 'No target user on this link request' }, { status: 400 })
    }

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: mergeResult, error: mergeError } = await admin
      .rpc('account_linking_merge_to_user', {
        p_target_user_id: targetUserId,
        p_phone: targetPhone,
      })
      .then((r) => ({ data: r.data, error: r.error }))

    if (mergeError) {
      console.error('[admin] Merge failed:', mergeError.message)
      return NextResponse.json({ error: 'Failed to merge orders' }, { status: 500 })
    }

    const ordersAttributed = (mergeResult as { orders_attributed: number } | null)?.orders_attributed ?? 0

    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        phone: targetPhone,
        phone_number: targetPhone,
        phone_verified: true,
        whatsapp_opt_in: true,
        whatsapp_opt_in_at: now,
        phone_canonical: targetPhone,
      })
      .eq('id', targetUserId)

    if (updateError) {
      console.error('[admin] Profile update failed:', updateError.message)
    }

    const { error: confirmError } = await supabase
      .from('link_requests')
      .update({ confirmed_at: now })
      .eq('id', requestId)

    if (confirmError) {
      console.error('[admin] Failed to confirm link request:', confirmError.message)
    }

    await supabase.from('admin_audit_logs').insert({
      admin_id: null,
      action: 'manual_link_merge',
      target_type: 'link_request',
      target_id: requestId,
      new_value: {
        target_user_id: targetUserId,
        target_phone: targetPhone,
        orders_attributed: ordersAttributed,
        performed_at: now,
      },
    })

    return NextResponse.json({ orders_attributed: ordersAttributed })
  } catch (error) {
    console.error('[admin] Merge error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Merge failed' }, { status: 500 })
  }
}