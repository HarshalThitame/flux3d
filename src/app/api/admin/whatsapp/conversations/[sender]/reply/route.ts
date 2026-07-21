import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sender: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { sender } = await params
    const body = (await request.json()) as { message?: string }
    const message = body.message?.trim()
    if (!message) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    if (!phoneNumberId || !accessToken) {
      return NextResponse.json({ error: 'WhatsApp API is not configured.' }, { status: 500 })
    }

    // Send via WhatsApp API
    const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: decodeURIComponent(sender),
        type: 'text',
        text: { preview_url: false, body: message },
      }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error')
      return NextResponse.json({ error: `WhatsApp send failed: ${response.status} ${text}` }, { status: 502 })
    }

    // Log the outgoing message
    const supabase = createAdminSupabaseClient()
    const { error: logError } = await supabase.from('whatsapp_messages').insert({
      sender: decodeURIComponent(sender),
      direction: 'outgoing',
      message_text: message,
      automated: false,
      trigger_event: 'admin_reply',
      responded: true,
    })

    if (logError) {
      console.error('[whatsapp-inbox] Failed to log message:', logError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
