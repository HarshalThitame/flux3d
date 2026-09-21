import { NextResponse } from 'next/server'
import { createAdminSupabaseClient, requireAdminUser } from '@/lib/admin/server'
import { createRazorpayPaymentLink, isRazorpayEnabled } from '@/lib/payments/razorpay'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ orderId: string }>
}

export async function POST(request: Request, props: Props) {
  try {
    await requireAdminUser()
    const { orderId } = await props.params
    const supabase = createAdminSupabaseClient()
    
    if (!isRazorpayEnabled()) {
      return NextResponse.json({ error: 'Payments are not enabled.' }, { status: 400 })
    }
    
    const { data: order, error: orderError } = await supabase
      .from('custom_orders')
      .select('*')
      .eq('id', orderId)
      .single()
      
    if (orderError || !order) {
      throw new Error(orderError?.message || 'Order not found')
    }
    
    if (order.payment_status === 'paid') {
      return NextResponse.json({ error: 'Order is already paid.' }, { status: 400 })
    }
    
    const amountPaise = Math.round(order.total_amount * 100)
    
    const paymentLink = await createRazorpayPaymentLink({
      amountPaise,
      currency: 'INR',
      customer: {
        name: order.customer_name,
        contact: order.customer_phone,
      },
      referenceId: order.order_number,
      description: `Payment for Custom Order ${order.order_number}`,
      notes: {
        orderId: order.id,
        type: 'custom_order'
      }
    })
    
    const { data: updatedOrder, error: updateError } = await supabase
      .from('custom_orders')
      .update({
        payment_link_id: paymentLink.id,
        payment_link_url: paymentLink.short_url,
        payment_status: 'link_sent'
      })
      .eq('id', orderId)
      .select('*, items:custom_order_items(*)')
      .single()
      
    if (updateError) throw new Error(updateError.message)
    
    return NextResponse.json(updatedOrder)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
