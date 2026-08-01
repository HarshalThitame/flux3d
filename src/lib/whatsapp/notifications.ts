import { sendWhatsAppTemplate } from '@/lib/whatsapp/messages'
import { ORDERING_ENABLED } from '@/lib/whatsapp/order-flow'

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
