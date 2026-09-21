/* eslint-disable */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminUser } from '@/lib/admin/server';
import Razorpay from 'razorpay';

type ParamsType = { orderId: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<ParamsType> }
) {
  try {
    await requireAdminUser();
    
    // Await params per Next.js 16 conventions
    const resolvedParams = await params;
    const { orderId } = resolvedParams;

    const supabase = await createAdminClient();

    // Fetch the order
    const { data: order, error: orderError } = await supabase
      .from('custom_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: 'Razorpay keys are not configured' }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // Create a Razorpay Payment Link
    const paymentLinkRequest = {
      amount: Math.round(order.total * 100), // Amount in paise
      currency: 'INR',
      accept_partial: false,
      description: `Payment for Custom Order: ${order.display_id}`,
      customer: {
        name: order.customer_name,
        email: order.customer_email || undefined,
        contact: order.customer_phone || undefined,
      },
      notify: {
        sms: true,
        email: true,
      },
      reminder_enable: true,
      reference_id: order.id,
      notes: {
        order_type: 'custom_order'
      }
    };

    const paymentLink = await razorpay.paymentLink.create(paymentLinkRequest);

    // Save payment link id to the order
    const { error: updateError } = await supabase
      .from('custom_orders')
      .update({ payment_link_id: paymentLink.id, status: 'pending' })
      .eq('id', orderId);

    if (updateError) throw updateError;

    return NextResponse.json({ paymentLink: paymentLink.short_url });

  } catch (err: any) {
    console.error('Create payment link error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
