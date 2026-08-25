import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { createSignedWhatsAppMediaUrl } from '@/lib/whatsapp/media'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sender: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { sender } = await params
    const phone = decodeURIComponent(sender)
    const supabase = createAdminSupabaseClient()

    // 1. Fetch messages (most recent 1000 for the thread)
    const { data: messages, error } = await supabase
      .from('whatsapp_messages')
      .select('id, sender, direction, message_text, automated, trigger_event, responded, created_at, media_type, media_url, media_filename, media_mime_type, media_size_bytes, status, meta_message_id')
      .eq('sender', phone)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) throw new Error(error.message)

    if (messages) messages.reverse()

    // The whatsapp-media bucket is private: replace stored media references
    // (bare storage paths or legacy public/signed URLs) with fresh 1-hour
    // signed URLs so only authenticated admin views can access attachments.
    await Promise.all(
      (messages ?? []).map(async (msg) => {
        if (!msg.media_url || !msg.media_type) return
        const signed = await createSignedWhatsAppMediaUrl(supabase, msg.media_url, 3600)
        if (signed) msg.media_url = signed
      }),
    )

    // Mark unread incoming messages as responded/read when admin views conversation
    await supabase
      .from('whatsapp_messages')
      .update({ responded: true })
      .eq('sender', phone)
      .eq('direction', 'incoming')
      .eq('responded', false)

    // 2. Fetch Customer Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone_number, created_at')
      .eq('phone_number', phone)
      .maybeSingle()

    // 3. Fetch Customer Orders ("Orders on Chat")
    type OrderRow = {
      id: string
      order_number: string
      total_amount: number
      currency: string
      status: string
      payment_status: string
      fulfilment_status: string
      items: unknown
      created_at: string
      shipping_address: unknown
    }
    let orders: OrderRow[] = []
    if (phone || profile?.id) {
      const orderQuery = supabase
        .from('shop_orders')
        .select('id, order_number, total_amount, currency, status, payment_status, fulfilment_status, items, created_at, shipping_address')
        .order('created_at', { ascending: false })
        .limit(10)

      if (profile?.id) {
        orderQuery.or(`user_id.eq.${profile.id},phone.eq.${phone}`)
      } else {
        orderQuery.eq('phone', phone)
      }

      const { data: orderData } = await orderQuery
      orders = (orderData as OrderRow[] | null) ?? []
    }

    // 4. Fetch Internal Admin Notes
    const { data: notes } = await supabase
      .from('whatsapp_internal_notes')
      .select('id, note_text, created_at, author_id')
      .eq('sender', phone)
      .order('created_at', { ascending: false })

    // 5. Fetch Tags & Metadata
    const { data: meta } = await supabase
      .from('whatsapp_conversation_meta')
      .select('*')
      .eq('sender', phone)
      .maybeSingle()

    // 6. Calculate 24-hour Messaging Window Status
    let lastCustomerMessageAt: string | null = null
    for (let i = (messages ?? []).length - 1; i >= 0; i--) {
      if (messages![i].direction === 'incoming') {
        lastCustomerMessageAt = messages![i].created_at
        break
      }
    }

    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000
    const now = Date.now()
    let windowActive = false
    let remainingWindowMinutes = 0

    if (lastCustomerMessageAt) {
      const diff = now - new Date(lastCustomerMessageAt).getTime()
      if (diff < TWENTY_FOUR_HOURS_MS) {
        windowActive = true
        remainingWindowMinutes = Math.floor((TWENTY_FOUR_HOURS_MS - diff) / 60000)
      }
    }

    return NextResponse.json({
      sender: phone,
      contactName: profile?.full_name ?? null,
      contactEmail: profile?.email ?? null,
      profileId: profile?.id ?? null,
      messages: messages ?? [],
      orders,
      notes: notes ?? [],
      tags: meta?.tags ?? [],
      isArchived: meta?.is_archived ?? false,
      lastCustomerMessageAt,
      windowActive,
      remainingWindowMinutes,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
