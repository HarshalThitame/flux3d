import { createAdminSupabaseClient } from '@/lib/admin/server'
import { sendWhatsAppTemplate, sendWhatsAppText } from '@/lib/whatsapp/messages'
import { ORDERING_ENABLED } from '@/lib/whatsapp/order-flow'

function money(amount: number | string): string {
  const value = typeof amount === 'number' ? amount : Number(amount)
  return isFinite(value) ? `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : `₹${amount}`
}

function templateName(key: string): string | null {
  const name = process.env[`WHATSAPP_TEMPLATE_${key}`]?.trim()
  return name || null
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
  const result = await sendWhatsAppTemplate(params.phone, {
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
  const result = await sendWhatsAppTemplate(params.phone, {
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
  const result = await sendWhatsAppTemplate(params.phone, {
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
  const result = await sendWhatsAppTemplate(params.phone, {
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
    '✅ *Payment received!*',
    `Order #${params.orderNumber}`,
    `Amount: ${money(params.amountPaise / 100)}`,
    '',
    'Your order is being prepared. We will notify you here as soon as it ships.',
  ].join('\n')

  const result = await sendWhatsAppText(phoneRaw, message)
  if (!result.ok) {
    console.error('[whatsapp] payment_captured message failed:', result.status, result.error)
  }
  return result.ok
}
