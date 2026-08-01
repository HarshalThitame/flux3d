import { createAdminSupabaseClient } from '@/lib/admin/server'
import { createRazorpayPaymentLink, getRazorpayConfig } from '@/lib/payments/razorpay'
import { upsertPaymentAttempt } from '@/lib/payments/repository'
import { makeReceipt } from '@/lib/payments/razorpay'

export type WhatsappPaymentLinkResult = {
  shortUrl: string
  paymentAttemptId: string
}

export async function createWhatsappPaymentLink(params: {
  orderId: string
  orderNumber: string
  userId: string
  amountPaise: number
  customerName: string
  customerPhone: string
}): Promise<WhatsappPaymentLinkResult | null> {
  const config = getRazorpayConfig()
  if (!config?.paymentsEnabled) {
    console.error('[whatsapp] Razorpay is not configured/enabled — payment link skipped.')
    return null
  }

  const supabase = createAdminSupabaseClient()

  const receipt = makeReceipt('SHOPWA', 1)
  const idempotencyKey = `whatsapp:${params.orderId}:shop_order:1:${params.amountPaise}`

  const attempt = await upsertPaymentAttempt({
    internal_order_type: 'shop_order',
    internal_order_id: params.orderId,
    customer_id: params.userId,
    provider: 'razorpay',
    payment_purpose: 'shop_order',
    provider_order_id: null,
    provider_payment_id: null,
    amount_paise: params.amountPaise,
    currency: 'INR',
    status: 'created',
    attempt_number: 1,
    idempotency_key: idempotencyKey,
    receipt,
    failure_code: null,
    failure_description: null,
    payment_method: null,
    captured_at: null,
    failed_at: null,
    metadata: { source: 'whatsapp', order_number: params.orderNumber },
  })

  const link = await createRazorpayPaymentLink({
    amountPaise: params.amountPaise,
    currency: 'INR',
    customer: { name: params.customerName.slice(0, 80), contact: params.customerPhone.replace(/\D/g, '').slice(-10) },
    referenceId: `SHOPWA-${params.orderNumber.replace(/[^A-Za-z0-9-]/g, '').slice(-14)}`,
    description: `Flux3D order ${params.orderNumber}`,
    notes: {
      internal_order_id: params.orderId,
      internal_order_type: 'shop_order',
      payment_attempt_id: attempt.id,
      order_number: params.orderNumber,
      source: 'whatsapp',
    },
  })

  // Link the Razorpay order id so the existing payment webhook can resolve this attempt.
  try {
    await supabase
      .from('payment_attempts')
      .update({
        provider_order_id: link.order_id,
        status: 'pending',
        metadata: { ...attempt.metadata, payment_link_id: link.id, payment_link: link },
      })
      .eq('id', attempt.id)
  } catch (err) {
    console.error('[whatsapp] Failed to link payment attempt:', err)
  }

  try {
    await supabase
      .from('shelf_orders')
      .update({
        payment_attempt_id: attempt.id,
        provider_order_id: link.order_id,
        payment_provider: 'razorpay',
        payment_status: 'pending',
      })
      .eq('id', params.orderId)
  } catch (err) {
    console.error('[whatsapp] Failed to link order payment fields:', err)
  }

  return { shortUrl: link.short_url, paymentAttemptId: attempt.id }
}
