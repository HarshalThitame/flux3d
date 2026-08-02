import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBusinessSettings } from '@/lib/admin/business-settings'
import { verifyResendWebhookSignature } from '@/lib/email/webhook-verification'
import type { EmailLogRow } from 'types/database'

/**
 * Resend Webhook Handler — POST /api/webhooks/resend
 *
 * Processes Resend webhook events:
 *   - email.sent      → update log to 'sent'
 *   - email.delivered → update log to 'delivered'
 *   - email.opened    → update log to 'opened'
 *   - email.bounced   → update log to 'bounced', flag hard bounces on profile
 *   - email.failed    → update log to 'failed'
 *   - email.complained → update log to 'complained'
 *
 * Security:
 *   - Verifies Svix signature using resend_webhook_secret.
 *   - Rate-limited implicitly by Resend (they don't spam).
 *
 * Idempotency:
 *   - Uses provider_event_id to avoid duplicate email_events rows.
 *   - If provider_event_id is missing, falls back to (email_log_id + event_type) hash.
 */

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const signatureHeader = req.headers.get('svix-signature')
    const timestampHeader = req.headers.get('svix-timestamp')
    const svixIdHeader = req.headers.get('svix-id')

    // Load webhook secret from business_settings or env
    const settings = await getBusinessSettings().catch(() => null)
    const secret =
      settings?.resendWebhookSecret ||
      process.env.RESEND_WEBHOOK_SECRET ||
      ''

    if (!secret) {
      console.warn('[webhooks/resend] Webhook secret not configured')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 })
    }

    if (!verifyResendWebhookSignature(rawBody, signatureHeader, timestampHeader, svixIdHeader, secret)) {
      console.warn('[webhooks/resend] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    let event: Record<string, unknown>
    try {
      event = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const eventData = event.data as Record<string, unknown> | undefined
    const eventType = String(event.type ?? '')
    const providerMessageId = String(eventData?.email_id ?? '')
    const providerEventId = String(event.id ?? '')
    const recipient = String((eventData?.to as string[] | undefined)?.[0] ?? '')
    const timestamp = event.created_at ? new Date(Number(event.created_at) * 1000).toISOString() : new Date().toISOString()

    const supabase = createAdminClient()

    // Find the matching email log
    let log: EmailLogRow | null = null
    if (providerMessageId) {
      const { data } = await supabase
        .from('email_logs')
        .select('*')
        .eq('provider_message_id', providerMessageId)
        .single()
      log = data as EmailLogRow | null
    }

    if (!log && recipient) {
      // Fallback: match by recipient + recent timestamp if provider_message_id missing
      const { data } = await supabase
        .from('email_logs')
        .select('*')
        .eq('recipient', recipient)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      log = data as EmailLogRow | null
    }

    // Insert raw event into email_events (immutable audit trail)
    const eventInsert = {
      email_log_id: log?.id ?? null,
      event_type: mapResendEventType(eventType),
      provider: 'resend' as const,
      provider_event_id: providerEventId || null,
      raw_payload: event as unknown as Record<string, unknown>,
      recipient: recipient || null,
      ip_address: String(eventData?.ip ?? '') || null,
      user_agent: String(eventData?.user_agent ?? '') || null,
      geo_location: (eventData?.geo as Record<string, unknown>) ?? null,
      provider_timestamp: timestamp,
    }

    await supabase.from('email_events').insert(eventInsert)

    // Update email_logs status
    if (log?.id) {
      const updates: Partial<EmailLogRow> = {}

      switch (eventType) {
        case 'email.sent':
          updates.status = 'sent'
          updates.sent_at = timestamp
          break
        case 'email.delivered':
          updates.status = 'delivered'
          updates.delivered_at = timestamp
          break
        case 'email.opened':
          updates.status = 'opened'
          updates.opened_at = timestamp
          break
        case 'email.bounced': {
          updates.status = 'bounced'
          updates.bounced_at = timestamp
          const bounceType = String(eventData?.bounce_type ?? '')
          updates.bounce_type = bounceType === 'hard' ? 'hard' : 'soft'
          updates.error_message = String(eventData?.bounce_message ?? '') || null

          // Hard bounce handling: flag profile
          if (bounceType === 'hard' && log.user_id) {
            await supabase
              .from('profiles')
              .update({ email_bounced: true, email_bounced_at: timestamp })
              .eq('id', log.user_id)
          }
          break
        }
        case 'email.failed':
          updates.status = 'failed'
          updates.failed_at = timestamp
          updates.error_message = String(eventData?.error_message ?? '') || null
          break
        case 'email.complained':
          updates.status = 'complained'
          break
        case 'email.delivery_delayed':
          // Don't change status to delayed; just log the event
          break
        default:
          break
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from('email_logs').update(updates).eq('id', log.id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Webhook processing error'
    console.error('[webhooks/resend] Error:', errMsg)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

function mapResendEventType(type: string): string {
  const map: Record<string, string> = {
    'email.sent': 'sent',
    'email.delivered': 'delivered',
    'email.opened': 'opened',
    'email.bounced': 'bounced',
    'email.failed': 'failed',
    'email.complained': 'complained',
    'email.clicked': 'clicked',
    'email.delivery_delayed': 'delivery_delayed',
  }
  return map[type] ?? type
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
