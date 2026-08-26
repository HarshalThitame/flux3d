import { createAdminSupabaseClient } from '@/lib/admin/server'
import { reportError } from '@/lib/error-handling'
import {
  sendWhatsAppTemplate,
  sendWhatsAppText,
  type WhatsAppTemplateComponent,
} from '@/lib/whatsapp/messages'
import { enqueueTemplateSend, completeOutboxSend, loadOutboxRow, type OutboxRow } from '@/lib/whatsapp/outbox'
import { classifyGraphError } from '@/lib/whatsapp/graph-errors'

// Mirrors WHATSAPP_ORDERING_ENABLED without importing order-flow.ts — importing
// it here would create a circular dependency (order-flow imports notifications).
const TEMPLATES_ENABLED = (process.env.WHATSAPP_ORDERING_ENABLED?.trim() || 'true') !== 'false'

function money(amount: number | string): string {
  const value = typeof amount === 'number' ? amount : Number(amount)
  return isFinite(value) ? `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : `₹${amount}`
}

function templateName(key: string): string | null {
  const name = process.env[`WHATSAPP_TEMPLATE_${key}`]?.trim()
  return name || null
}

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length === 10 ? `91${cleaned}` : cleaned
}

const TEMPLATE_LANGUAGE = process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'en_IN'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

class NonRetryableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NonRetryableError'
  }
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      // Permanent failures (auth, re-engagement, template, recipient) will
      // never succeed on retry — fail fast instead of burning 3 attempts.
      if (err instanceof NonRetryableError) throw err
      if (attempt < attempts - 1) await sleep(750 * Math.pow(2, attempt))
    }
  }
  throw lastError
}

type ReliableSendParams = {
  /** Env suffix in WHATSAPP_TEMPLATE_<KEY>, e.g. ORDER_SHIPPED. */
  templateKey: string
  phone: string
  components: WhatsAppTemplateComponent[]
  logText: string
  triggerEvent: string
  userId?: string | null
  /**
   * Dedupe gate for lifecycle events that must never double-fire
   * (e.g. `order_shipped:ORD-123`). Omit for user-initiated re-sends
   * (payment links) where a fresh message is legitimate.
   */
  idempotencyKey?: string | null
}

async function sendTemplateReliably(p: ReliableSendParams): Promise<boolean> {
  if (!TEMPLATES_ENABLED) return false

  const name = templateName(p.templateKey)
  if (!name) {
    console.warn(`[whatsapp] Template WHATSAPP_TEMPLATE_${p.templateKey} not configured — skipping`)
    return false
  }

  const to = formatPhone(p.phone)
  if (!to || to.length < 10) {
    console.warn(`[whatsapp] ${p.templateKey}: no usable customer phone — skipping`)
    return false
  }

  const outcome = await enqueueTemplateSend({
    idempotencyKey: p.idempotencyKey || crypto.randomUUID(),
    templateName: name,
    phone: to,
    components: p.components,
    logText: p.logText,
    triggerEvent: p.triggerEvent,
    userId: p.userId ?? null,
  })

  if (outcome.outcome === 'duplicate') {
    console.info(`[whatsapp] ${p.triggerEvent} already sent (${p.idempotencyKey}) — deduped`)
    return true
  }

  if (outcome.outcome === 'queued') return true

  // Outbox unavailable → direct inline send so the message still goes out.
  const row: OutboxRow | null = outcome.outboxId ? await loadOutboxRow(outcome.outboxId).catch(() => null) : null
  try {
    const result = await withRetry(async () => {
      const r = await sendWhatsAppTemplate(to, { name, language: TEMPLATE_LANGUAGE, components: p.components })
      // Non-ok API responses (4xx/5xx) must count as failures so they are
      // retried here and trigger caller-side fallbacks instead of being
      // silently reported as delivered. Auth/re-engagement/template errors
      // are permanent and skip the retry loop entirely.
      if (!r.ok) {
        const classified = classifyGraphError(r.status ?? 0, r.error ?? '')
        if (!classified.retryable && classified.kind !== 'unknown') {
          throw new NonRetryableError(
            `${classified.kind} (code ${classified.code}): ${classified.message.slice(0, 200)}`,
          )
        }
        throw new Error(r.error ?? `HTTP ${r.status ?? '?'}`)
      }
      return r
    })
    if (row) await completeOutboxSend(row, { ok: true, messageId: result.messageId }).catch(() => {})
    else await logInlineSend(p, to, { ok: true, messageId: result.messageId })
    return true
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error(`[whatsapp] ${p.templateKey} template failed after retries:`, error)
    reportError(new Error(error), `WhatsApp template send failed: ${p.templateKey}`, {
      level: 'warn',
      module: 'whatsapp',
      tags: { triggerEvent: p.triggerEvent },
      metadata: { phone: to, orderNumber: p.logText.slice(0, 120) },
    })
    if (row) await completeOutboxSend(row, { ok: false, error }).catch(() => {})
    else await logInlineSend(p, to, { ok: false, error })
    return false
  }
}

/** Inbox mirror for inline fallbacks when no outbox row exists to close. */
async function logInlineSend(
  p: ReliableSendParams,
  to: string,
  result: { ok: boolean; messageId?: string; error?: string }
): Promise<void> {
  try {
    const supabase = createAdminSupabaseClient()
    if (!supabase) return
    await supabase.from('whatsapp_messages').insert({
      user_id: p.userId ?? null,
      sender: to,
      direction: 'outgoing',
      message_text: p.logText,
      automated: true,
      trigger_event: p.triggerEvent,
      responded: true,
      media_type: 'template',
      meta_message_id: result.messageId ?? null,
      status: result.ok ? 'sent' : 'failed',
      status_error: result.error ? result.error.slice(0, 300) : null,
    })
  } catch (err) {
    console.warn('[whatsapp] inbox mirror insert failed:', err instanceof Error ? err.message : err)
  }
}

// Order shipped — parameters: {{1}} order number, {{2}} courier name, {{3}} tracking number
export async function notifyWhatsAppOrderShipped(params: {
  phone: string
  orderNumber: string
  courierName: string
  trackingNumber: string
  trackingUrl?: string
  userId?: string | null
}): Promise<boolean> {
  return sendTemplateReliably({
    templateKey: 'ORDER_SHIPPED',
    phone: params.phone,
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: params.orderNumber },
          { type: 'text', text: params.courierName },
          { type: 'text', text: params.trackingNumber },
        ],
      },
    ],
    logText: `Order #${params.orderNumber} shipped via ${params.courierName}, tracking ${params.trackingNumber}`,
    triggerEvent: 'order_shipped',
    userId: params.userId ?? null,
    // Tracking number in the key: a returned-then-reshipped order with new
    // tracking legitimately re-notifies, while webhook replays stay deduped.
    idempotencyKey: `order_shipped:${params.orderNumber}:${params.trackingNumber}`,
  })
}

// Order delivered — parameters: {{1}} order number
export async function notifyWhatsAppOrderDelivered(params: {
  phone: string
  orderNumber: string
  userId?: string | null
}): Promise<boolean> {
  return sendTemplateReliably({
    templateKey: 'ORDER_DELIVERED',
    phone: params.phone,
    components: [
      {
        type: 'body',
        parameters: [{ type: 'text', text: params.orderNumber }],
      },
    ],
    logText: `Order #${params.orderNumber} delivered`,
    triggerEvent: 'order_delivered',
    userId: params.userId ?? null,
    idempotencyKey: `order_delivered:${params.orderNumber}`,
  })
}

// Order confirmed (payment captured) — parameters: {{1}} order number, {{2}} total amount
// Fires once per order when the payment lands. Primary channel is the approved
// UTILITY template (works outside the 24h window); the playful session text is a
// best-effort secondary inside the window when the template cannot be sent.
// `orderTable` selects where to resolve the customer phone from: shop orders
// live in shelf_orders; instant-quote / cart-quote orders live in orders.
export async function notifyWhatsAppOrderConfirmed(params: {
  orderId: string
  orderNumber: string
  amountPaise: number
  orderTable?: 'shelf_orders' | 'orders'
  userId?: string | null
}): Promise<boolean> {
  const phone = await lookupOrderPhone(params.orderId, params.orderTable ?? 'shelf_orders')

  const templateSent = await sendTemplateReliably({
    templateKey: 'ORDER_CONFIRMATION',
    phone: phone ?? '',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: params.orderNumber },
          { type: 'text', text: money(params.amountPaise / 100) },
        ],
      },
    ],
    logText: `Order #${params.orderNumber} confirmed — payment received ${money(params.amountPaise / 100)}`,
    triggerEvent: 'order_confirmed',
    userId: params.userId ?? null,
    idempotencyKey: `order_confirmed:${params.orderId}`,
  })

  if (!phone || templateSent) return templateSent

  // Session-text fallback (only deliverable inside the 24h customer window).
  const message = [
    '🎊 *CHA-CHING! Payment received!*',
    '',
    `Order #${params.orderNumber}`,
    `Amount: ${money(params.amountPaise / 100)} ✅`,
    'Status: Being packed with love 📦💕',
    '',
    'Sit back and relax — we\u2019ll message you the SECOND it ships, tracking link included! 🚀',
  ].join('\n')

  const result = await sendWhatsAppText(formatPhone(phone), message)
  if (!result.ok) {
    console.error('[whatsapp] order confirmed session-text fallback failed:', result.status, result.error)
  }
  return result.ok
}

/** Reads the shipping-address phone for an order (null when absent/unavailable). */
async function lookupOrderPhone(orderId: string, orderTable: 'shelf_orders' | 'orders' = 'shelf_orders'): Promise<string | null> {
  try {
    const supabase = createAdminSupabaseClient()
    if (!supabase) return null
    const { data: order } = await supabase
      .from(orderTable)
      .select('phone')
      .eq('id', orderId)
      .maybeSingle()
    const phoneRaw = String(order?.phone ?? '').replace(/\D/g, '')
    if (!phoneRaw) {
      console.warn('[whatsapp] No phone on order — WhatsApp confirm skipped:', orderId)
      return null
    }
    return phoneRaw
  } catch (err) {
    console.error('[whatsapp] Failed to read order phone:', err instanceof Error ? err.message : err)
    return null
  }
}

// Payment link — parameters: {{1}} order number, {{2}} payment link URL.
// No dedupe key: admins may legitimately re-send a link for the same order.
export async function notifyWhatsAppPaymentLink(params: {
  phone: string
  orderNumber: string
  paymentLink: string
  userId?: string | null
}): Promise<boolean> {
  return sendTemplateReliably({
    templateKey: 'PAYMENT_LINK',
    phone: params.phone,
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: params.orderNumber },
          { type: 'text', text: params.paymentLink },
        ],
      },
    ],
    logText: `Payment link for order #${params.orderNumber}: ${params.paymentLink}`,
    triggerEvent: 'payment_link',
    userId: params.userId ?? null,
    idempotencyKey: null,
  })
}

// WhatsApp connected (after account linking) — parameters: {{1}} name, {{2}} order count.
// Template-primary; falls back to the playful session text (only deliverable
// inside the 24h customer window, e.g. right after the OTP flow).
export async function notifyWhatsAppConnected(params: {
  phone: string
  customerName: string
  orderCount: number
}): Promise<boolean> {
  const to = formatPhone(params.phone)

  const templateSent = await sendTemplateReliably({
    templateKey: 'CONNECTED',
    phone: params.phone,
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: params.customerName },
          { type: 'text', text: String(params.orderCount) },
        ],
      },
    ],
    logText: `WhatsApp connected for ${params.customerName} (${params.orderCount} linked orders)`,
    triggerEvent: 'account_connected',
    idempotencyKey: null,
  })

  if (templateSent) return true

  const message = [
    '🎉 *You\u2019re officially connected!*',
    '',
    `Hey ${params.customerName}! Your WhatsApp is now linked to Flux3D.`,
    params.orderCount > 0
      ? `We found ${params.orderCount} past order${params.orderCount === 1 ? '' : 's'} and brought them home to your account. 📦`
      : 'No orphaned orders this time — your account is squeaky clean. ✨',
    '',
    'We\u2019ll only ping you for the good stuff: order updates, shipping, and the occasional high-five. 🖐️',
    '',
    'Ready to make something awesome? 🚀',
  ].join('\n')

  const result = await sendWhatsAppText(to, message)
  if (!result.ok) {
    console.error('[whatsapp] connected text failed:', result.status, result.error)
  }
  return result.ok
}
