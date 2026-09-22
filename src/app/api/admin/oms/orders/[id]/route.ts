// @ts-nocheck
/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminUser } from '@/lib/admin/server';

// GET /api/admin/oms/orders/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const supabase = await createAdminClient();
    const { id } = await params;

    const { data: order, error } = await supabase
      .from('oms_orders')
      .select(`
        *,
        customers(*),
        oms_order_items(*),
        oms_shipments(*),
        oms_production_jobs(
          *,
          oms_print_attempts(*)
        ),
        oms_files(*),
        oms_documents(*),
        oms_payment_transactions(*),
        oms_communications(*),
        oms_audit_logs(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    return NextResponse.json({ order });
  } catch (err: any) {
    console.error('[OMS] GET /orders/[id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/admin/oms/orders/[id] — update order fields (notes, dates, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const supabase = await createAdminClient();
    const { id } = await params;
    const body = await req.json();

    const allowedFields = [
      'customer_notes', 'internal_notes', 'order_date',
      'source', 'source_reference',
      'discount', 'shipping_cost', 'tax',
    ];
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const field of allowedFields) {
      if (field in body) updates[field] = body[field];
    }

    const { data, error } = await supabase
      .from('oms_orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ order: data });
  } catch (err: any) {
    console.error('[OMS] PATCH /orders/[id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
