import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { createWhatsappPaymentLink } from '@/lib/whatsapp/payment'
import { notifyWhatsAppPaymentLink } from '@/lib/whatsapp/notifications'
import { sendWhatsAppPaymentLink } from '@/lib/whatsapp/messages'
import { getAdminApiErrorResponse } from '@/lib/admin/api'

export async function POST(
  _request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { orderId } = await context.params
    const supabase = createAdminSupabaseClient()

    const { data: order, error } = await supabase
      .from('shelf_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.payment_status === 'paid') {
      return NextResponse.json({ error: 'Order is already paid' }, { status: 400 })
    }

    const shippingAddress = (order.shipping_address ?? {}) as Record<string, unknown>
    const phone = String(shippingAddress.phone ?? '')

    if (!phone) {
      return NextResponse.json({ error: 'Order shipping phone not found' }, { status: 400 })
    }

    // Generate Razorpay Payment Link
    const paymentLinkResult = await createWhatsappPaymentLink({
      orderId: order.id,
      orderNumber: order.order_number,
      userId: order.user_id,
      amountPaise: Math.round(Number(order.total_amount) * 100),
      customerName: String(shippingAddress.name ?? 'Customer'),
      customerPhone: phone,
    })

    if (!paymentLinkResult) {
      return NextResponse.json({ error: 'Failed to create payment link via Razorpay' }, { status: 500 })
    }

    // Clean country code prefix
    const cleanPhone = phone.replace(/\D/g, '')
    const phoneForWhatsApp = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone

    // Send via WhatsApp — approved PAYMENT_LINK template primary (deliverable
    // outside the 24h window); session text as in-window fallback.
    const templateSent = await notifyWhatsAppPaymentLink({
      phone,
      orderNumber: order.order_number,
      paymentLink: paymentLinkResult.shortUrl,
      userId: order.user_id,
    })

    let whatsappSent = templateSent
    if (!whatsappSent) {
      const sent = await sendWhatsAppPaymentLink(
        phoneForWhatsApp,
        paymentLinkResult.shortUrl,
        `🔗 *Payment link for order ${order.order_number}*`
      )
      whatsappSent = sent.ok
    }

    return NextResponse.json({
      success: true,
      shortUrl: paymentLinkResult.shortUrl,
      whatsappSent,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
