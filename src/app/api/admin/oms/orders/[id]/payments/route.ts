// @ts-nocheck
/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminUser } from '@/lib/admin/server';

// GET /api/admin/oms/orders/[id]/payments
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const supabase = await createAdminClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('oms_payment_transactions')
      .select('*')
      .eq('order_id', id)
      .order('transaction_date', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ transactions: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/oms/orders/[id]/payments — record a payment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const supabase = await createAdminClient();
    const { id } = await params;
    const body = await req.json();

    const {
      amount,
      paymentMethod,
      referenceId,
      notes,
      transactionDate,
      actorName,
    } = body;

    if (!amount || !paymentMethod) {
      return NextResponse.json({ error: 'amount and paymentMethod are required' }, { status: 400 });
    }

    // Fetch order for payment_status recalculation
    const { data: order, error: orderError } = await supabase
      .from('oms_orders')
      .select('id, total_amount, amount_paid')
      .eq('id', id)
      .single();
    if (orderError || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    // Insert transaction (trigger will update amount_paid)
    const { data: txn, error: txnError } = await supabase
      .from('oms_payment_transactions')
      .insert({
        order_id: id,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        payment_status: 'received',
        reference_id: referenceId || null,
        notes: notes || null,
        transaction_date: transactionDate ? new Date(transactionDate).toISOString() : new Date().toISOString(),
      })
      .select()
      .single();
    if (txnError) throw txnError;

    // After trigger fires, determine new payment_status
    const newPaid = parseFloat(order.amount_paid) + parseFloat(amount);
    const total = parseFloat(order.total_amount);
    let newPaymentStatus = 'UNPAID';
    if (newPaid >= total) newPaymentStatus = 'PAID';
    else if (newPaid > 0) newPaymentStatus = 'PARTIALLY_PAID';

    await supabase
      .from('oms_orders')
      .update({
        payment_status: newPaymentStatus,
        payment_received_at: newPaymentStatus === 'PAID' ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Audit log
    await supabase.from('oms_audit_logs').insert({
      order_id: id,
      action: 'PAYMENT_RECORDED',
      new_value: `₹${amount} via ${paymentMethod}`,
      actor_name: actorName || null,
    });

    return NextResponse.json({ transaction: txn }, { status: 201 });
  } catch (err: any) {
    console.error('[OMS] POST /payments error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
