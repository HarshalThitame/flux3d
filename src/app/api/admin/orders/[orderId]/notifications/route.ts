import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export async function GET(req: Request, context: any) {
  // Await the params object to satisfy Next.js 15 routing constraints
  const params = await context.params;
  const orderId = params.orderId;
  const supabase = createAdminSupabaseClient()

  const { data, error } = await supabase
    .from('whatsapp_notification_jobs')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ notifications: data || [] })
}

export async function POST(req: Request, context: any) {
  // Resend notification
  const params = await context.params;
  const orderId = params.orderId;
  const body = await req.json();
  const status = body.status;

  if (!status) {
    return NextResponse.json({ error: 'Missing status' }, { status: 400 })
  }

  // Enqueue it again by importing the enqueue function directly
  try {
    const m = await import('@/lib/whatsapp/order-notifications');
    await m.enqueueOrderNotification(orderId, status);
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
