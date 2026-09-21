/* eslint-disable */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/server';

export async function POST(req: NextRequest) {
  try {
    await requireAdminUser();
    const supabase = await createAdminClient();

    const body = await req.json();
    const { customerName, customerEmail, customerPhone, shippingAddress, items, notes } = body;

    if (!customerName || !items || !items.length) {
      return NextResponse.json({ error: 'Customer name and items are required' }, { status: 400 });
    }

    // Begin custom order creation
    const { data: order, error: orderError } = await supabase
      .from('custom_orders')
      .insert({
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        shipping_address: shippingAddress,
        notes: notes,
        status: 'pending'
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create line items
    const orderItemsToInsert = items.map((item: any) => ({
      custom_order_id: order.id,
      title: item.title,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.quantity * item.unitPrice
    }));

    const { error: itemsError } = await supabase
      .from('custom_order_items')
      .insert(orderItemsToInsert);

    if (itemsError) throw itemsError;

    // Fetch the updated order with calculated totals (trigger handles this)
    const { data: finalOrder, error: fetchError } = await supabase
      .from('custom_orders')
      .select('*, custom_order_items(*)')
      .eq('id', order.id)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json({ order: finalOrder });

  } catch (err: any) {
    console.error('Create custom order error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
