import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyResendWebhookSignature } from '@/lib/email/webhook-verification'
import { logEmailEvent } from '@/lib/email/logEmailEvent'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type WebhookEvent = {
  type: string
  data: {
    email_id?: string
    created_at?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

const EVENT_TYPE_MAP: Record<string, 'sent' | 'delivered' | 'opened' | 'bounced' | 'failed' | 'complained' | 'clicked' | 'delivery_delayed'> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.opened': 'opened',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.clicked': 'clicked',
  'email.delivery_delayed': 'delivery_delayed',
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()

    const signatureHeader = req.headers.get('svix-signature')
    const secret = process.env.RESEND_WEBHOOK_SECRET

    if (secret) {
      const isValid = verifyResendWebhookSignature(rawBody, signatureHeader, secret)
      if (!isValid) {
        console.warn('[email-webhook] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    } else {
      console.warn('[email-webhook] No RESEND_WEBHOOK_SECRET configured — skipping verification')
    }

    const payload: WebhookEvent = JSON.parse(rawBody)
    const eventType = EVENT_TYPE_MAP[payload.type]

    if (!eventType) {
      return NextResponse.json({ received: true })
    }

    const resendId = payload.data?.email_id
    if (!resendId) {
      return NextResponse.json({ received: true })
    }

    const supabase = createAdminClient()

    const { data: logs } = await supabase
      .from('email_logs')
      .select('id')
      .eq('resend_id', resendId)
      .limit(1)

    const logId = (logs?.[0] as { id: string } | undefined)?.id

    if (!logId) {
      console.warn(`[email-webhook] No log found for resend_id: ${resendId}`)
      return NextResponse.json({ received: true })
    }

    const timestamp = payload.data?.created_at ?? new Date().toISOString()
    const updateField: Record<string, string> = {}
    updateField[`${eventType}_at`] = timestamp
    updateField.status = eventType === 'bounced' ? 'bounced' : eventType

    await supabase
      .from('email_logs')
      .update(updateField)
      .eq('id', logId)

    await logEmailEvent(logId, eventType, resendId, payload).catch(() => {})

    if (eventType === 'bounced') {
      const { data: log } = await supabase
        .from('email_logs')
        .select('user_id')
        .eq('id', logId)
        .single()

      if (log?.user_id) {
        await supabase
          .from('profiles')
          .update({ email_bounced: true, email_bounced_at: timestamp })
          .eq('id', log.user_id)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[email-webhook] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
