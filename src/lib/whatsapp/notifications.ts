import { createAdminSupabaseClient } from '@/lib/admin/server'
import { sendWhatsAppTemplate, sendWhatsAppText, sendWhatsAppDocument } from '@/lib/whatsapp/messages'
import { ORDERING_ENABLED } from '@/lib/whatsapp/order-flow'
import { createInvoiceShareToken } from '@/lib/orders/invoice-token'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://flux3d.in'

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

// Order shipped — parameters: {{1}} order number, {{2}} courier name, {{3}} tracking number
export async function notifyWhatsAppOrderShipped(params: {
  phone: string
  orderNumber: string
  courierName: string
  trackingNumber: string
  trackingUrl?: string
}): Promise<boolean> {
  const name = templateName('ORDER_SHIPPED')
  if (!ORDERING_ENABLED || !name) return false
  const result = await sendWhatsAppTemplate(formatPhone(params.phone), {
    name,
    language: TEMPLATE_LANGUAGE,
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
  })
  if (!result.ok) {
    console.error('[whatsapp] order_shipped template failed:', result.status, result.error)
  }
  return result.ok
}

// Order delivered — parameters: {{1}} order number
export async function notifyWhatsAppOrderDelivered(params: {
  phone: string
  orderNumber: string
}): Promise<boolean> {
  const name = templateName('ORDER_DELIVERED')
  if (!ORDERING_ENABLED || !name) return false
  const result = await sendWhatsAppTemplate(formatPhone(params.phone), {
    name,
    language: TEMPLATE_LANGUAGE,
    components: [
      {
        type: 'body',
        parameters: [{ type: 'text', text: params.orderNumber }],
      },
    ],
  })
  if (!result.ok) {
    console.error('[whatsapp] order_delivered template failed:', result.status, result.error)
  }
  return result.ok
}

// Order confirmation — parameters: {{1}} order number, {{2}} total amount
export async function notifyWhatsAppOrderConfirmation(params: {
  phone: string
  orderNumber: string
  totalAmount: string
}): Promise<boolean> {
  const name = templateName('ORDER_CONFIRMATION')
  if (!ORDERING_ENABLED || !name) return false
  const result = await sendWhatsAppTemplate(formatPhone(params.phone), {
    name,
    language: TEMPLATE_LANGUAGE,
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: params.orderNumber },
          { type: 'text', text: params.totalAmount },
        ],
      },
    ],
  })
  if (!result.ok) {
    console.error('[whatsapp] order_confirmation template failed:', result.status, result.error)
  }
  return result.ok
}

// Payment link — parameters: {{1}} order number, {{2}} payment link URL
export async function notifyWhatsAppPaymentLink(params: {
  phone: string
  orderNumber: string
  paymentLink: string
}): Promise<boolean> {
  const name = templateName('PAYMENT_LINK')
  if (!ORDERING_ENABLED || !name) return false
  const result = await sendWhatsAppTemplate(formatPhone(params.phone), {
    name,
    language: TEMPLATE_LANGUAGE,
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: params.orderNumber },
          { type: 'text', text: params.paymentLink },
        ],
      },
    ],
  })
  if (!result.ok) {
    console.error('[whatsapp] payment_link template failed:', result.status, result.error)
  }
  return result.ok
}

// WhatsApp connected (after account linking) — sends a friendly "you're in!"
// message. Prefers the WHATSAPP_TEMPLATE_CONNECTED HSM (body params {{1}} name,
// {{2}} order count) when configured; otherwise falls back to a session text,
// which only works inside the 24h customer window (e.g. right after the OTP
// flow) and is ignored by the API otherwise.
export async function notifyWhatsAppConnected(params: {
  phone: string
  customerName: string
  orderCount: number
}): Promise<boolean> {
  const to = formatPhone(params.phone)
  const name = templateName('CONNECTED')

  if (name) {
    const result = await sendWhatsAppTemplate(to, {
      name,
      language: TEMPLATE_LANGUAGE,
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.customerName },
            { type: 'text', text: String(params.orderCount) },
          ],
        },
      ],
    })
    if (result.ok) return true
    console.error('[whatsapp] connected template failed:', result.status, result.error)
  }

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

// Payment captured — sends within the 24h customer-service window as a plain
// session text (no HSM approval needed), so it works even before business
// verification approves the shipped/delivered HSM templates.
export async function notifyWhatsAppPaymentCaptured(params: {
  orderId: string
  orderNumber: string
  amountPaise: number
}): Promise<boolean> {
  if (!ORDERING_ENABLED) return false

  const supabase = createAdminSupabaseClient()
  const { data: order } = await supabase
    .from('shelf_orders')
    .select('shipping_address')
    .eq('id', params.orderId)
    .maybeSingle()

  const address = (order?.shipping_address ?? {}) as Record<string, unknown>
  const phoneRaw = String(address.phone ?? '').replace(/\D/g, '')
  if (!phoneRaw) {
    console.warn('[whatsapp] Payment captured — no phone on order, skipped WhatsApp notify:', params.orderId)
    return false
  }

  const message = [
    '✅ *Payment captured & order locked in!*',
    '',
    `Order #${params.orderNumber} — ${money(params.amountPaise / 100)} paid.`,
    'We\'re already on it — your tax invoice PDF is coming through right behind this. 📎',
    '',
    'You\'ll get the next ping the very second your print ships, tracking link in hand. 🚀',
  ].join('\n')

  const result = await sendWhatsAppText(formatPhone(phoneRaw), message)
  if (result.ok) return true

  console.error('[whatsapp] payment_captured session message failed:', result.status, result.error)

  // Fallback when the customer-service 24h session window has expired (e.g. a
  // payment confirmation for an order processed retroactively/backfilled): retry
  // via the approved ORDER_CONFIRMATION template, which is deliverable outside
  // the 24h window.
  const tpl = templateName('ORDER_CONFIRMATION')
  if (tpl) {
    const fallback = await sendWhatsAppTemplate(formatPhone(phoneRaw), {
      name: tpl,
      language: TEMPLATE_LANGUAGE,
      components: [
        { type: 'body', parameters: [
          { type: 'text', text: params.orderNumber },
          { type: 'text', text: money(params.amountPaise / 100) },
        ] },
      ],
    })
    if (fallback.ok) return true
    console.error('[whatsapp] payment_captured template fallback failed:', fallback.status, fallback.error)
  }

  return false
}

// Sends the tax-invoice PDF as a WhatsApp `document` message. Deliverable only
// within the active 24h customer-service session (Meta rejects out-of-window
// document sends) — for late/backfilled orders the session-text path above
// already falls back to the ORDER_CONFIRMATION template. The PDF is rendered on
// demand from a one-time, expiring token URL (no PII persisted to storage).
export async function notifyWhatsAppPaymentReceipt(params: {
  orderId: string
  orderNumber: string
  amountPaise: number
}): Promise<boolean> {
  if (!ORDERING_ENABLED) return false

  const supabase = createAdminSupabaseClient()
  const { data: order, error } = await supabase
    .from('shelf_orders')
    .select('order_number, total_amount_paise, payment_currency, payment_method, payment_verified_at, provider_order_id, provider_payment_id, placed_at, shipping_address')
    .eq('id', params.orderId)
    .maybeSingle()

  if (error || !order) {
    console.warn('[whatsapp] Payment receipt — order not found:', params.orderId)
    return false
  }

  const address = order.shipping_address as Record<string, unknown> | null
  const phoneRaw = String(address?.phone ?? '').replace(/\D/g, '')
  if (!phoneRaw) {
    console.warn('[whatsapp] Payment receipt — no phone on order, skipped PDF notify:', params.orderId)
    return false
  }

  const token = createInvoiceShareToken(params.orderId)
  const link = `${SITE_URL}/api/receipts/${params.orderId}/${token}.pdf`

  const paidOn = order.payment_verified_at ?? order.placed_at
  const paidOnStr = new Date(paidOn).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  const result = await sendWhatsAppDocument(formatPhone(phoneRaw), {
    link,
    caption: `Tax invoice for order ${params.orderNumber} — ${money(params.amountPaise / 100)} paid on ${paidOnStr}. Tap to view.`,
  })

  if (!result.ok) {
    console.error('[whatsapp] payment_receipt document failed:', result.status, result.error)
  }
  return result.ok
}
