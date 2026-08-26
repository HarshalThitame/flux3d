import { rateLimitCheck } from '@/lib/rate-limit'
import { getResendClient, getSenderAddress } from '@/lib/email/resend-client'
import { getSettings } from '@/lib/settings'

/**
 * Lightweight ops alerting.
 *
 * Writes to `error_logs` (ops visibility) AND emails the business primary
 * address via Resend. Alerts are rate-limited per alert key so a failure
 * storm cannot flood the inbox — the same key is emailed at most
 * OPS_ALERT_EMAIL_LIMIT times per window; error_logs still records every one.
 */

export type OpsAlertSeverity = 'info' | 'warning' | 'error' | 'critical'

type OpsAlert = {
  /** Stable key for dedupe/rate-limiting, e.g. 'meta_catalog_sync_failures' */
  key: string
  subject: string
  body: string
  severity?: OpsAlertSeverity
  source?: string
  metadata?: Record<string, unknown>
}

const ALERT_EMAIL_WINDOW_SECONDS = 60 * 60 // 1 hour
const ALERT_EMAIL_LIMIT = 2

async function logToDb(alert: Required<Pick<OpsAlert, 'key' | 'subject'>> & OpsAlert) {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()
    if (!supabase) return
    await supabase.from('error_logs').insert({
      source: alert.source ?? `ops_alert:${alert.key}`,
      severity: alert.severity ?? 'error',
      message: alert.subject,
      error_message: alert.subject,
      metadata: { alertKey: alert.key, ...(alert.metadata ?? {}) },
    })
  } catch (e) {
    console.error('[ops-alert] Failed to write error_logs:', e)
  }
}

async function emailAlert(alert: OpsAlert): Promise<void> {
  try {
    const limit = await rateLimitCheck(
      `ops_alert_email:${alert.key}`,
      ALERT_EMAIL_WINDOW_SECONDS,
      ALERT_EMAIL_LIMIT,
    )
    if (!limit.success) return

    // NOTE: sequential awaits, NOT Promise.all([a(), b(), c()]): if any of
    // these functions throws synchronously (e.g. a broken module mock), the
    // remaining array elements are never given rejection handlers by all/allSettled
    // — the already-created promises would float as unhandled rejections.
    let client: Awaited<ReturnType<typeof getResendClient>>
    try {
      client = await getResendClient()
    } catch (e) {
      console.error('[ops-alert] Resend client unavailable, cannot email alert:', e)
      return
    }

    let sender = { name: 'Flux3D Ops', email: 'onboarding@resend.dev' }
    try {
      const resolved = await getSenderAddress()
      sender = resolved
    } catch {
      // fall back to default sender
    }

    let settings: Awaited<ReturnType<typeof getSettings>> | null = null
    try {
      settings = await getSettings()
    } catch {
      // recipient lookup failed; OPS_ALERT_EMAIL fallback below
    }

    const recipient = settings?.primaryEmail || settings?.supportEmail || process.env.OPS_ALERT_EMAIL
    if (!recipient) {
      console.warn('[ops-alert] No recipient configured (primaryEmail/supportEmail/OPS_ALERT_EMAIL), skipping email')
      return
    }

    await client.emails.send({
      from: `${sender.name} <${sender.email}>`,
      to: recipient,
      subject: `[${(alert.severity ?? 'error').toUpperCase()}] ${alert.subject}`,
      text: alert.body,
    })
  } catch (e) {
    // Never let alerting itself throw into caller paths
    console.error('[ops-alert] Failed to send alert email:', e)
  }
}

/**
 * Fire-and-forget ops alert. Safe to call from any server context;
 * awaits DB write (bounded by caller's catch) but never throws.
 */
export async function sendOpsAlert(alert: OpsAlert): Promise<void> {
  try {
    await logToDb({ ...alert })
  } catch {
    // logged inside
  }
  // Email is best-effort and must not block the response path
  // Belt-and-braces: emailAlert never rejects, but a floating rejection on a
  // voided promise would crash serverless invocations.
  emailAlert(alert).catch((e) => console.error('[ops-alert] Alert email promise rejected:', e))
}
