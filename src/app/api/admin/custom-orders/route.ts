/* eslint-disable */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminUser } from '@/lib/admin/server';

export async function POST(req: NextRequest) {
  try {
    await requireAdminUser();
    const supabase = await createAdminClient();

    const body = await req.json();
    const { customerName, customerEmail, customerPhone, source = 'whatsapp', items, notes } = body;

    if (!customerName || !items || !items.length) {
      return NextResponse.json({ error: 'Customer name and items are required' }, { status: 400 });
    }

    // 1. Customer De-duplication (Find or Create)
    let customerId;
    if (customerPhone) {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', customerPhone)
        .single();
        
      if (existingCustomer) {
        customerId = existingCustomer.id;
      }
    }

    if (!customerId) {
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          full_name: customerName,
          email: customerEmail,
          phone: customerPhone
        })
        .select('id')
        .single();
        
      if (customerError) throw customerError;
      customerId = newCustomer.id;
    }

    // 2. Create Unified OMS Order
    const { data: order, error: orderError } = await supabase
      .from('oms_orders')
      .insert({
        customer_id: customerId,
        source: source,
        status: 'DRAFT',
        payment_status: 'UNPAID',
        fulfillment_status: 'NOT_SHIPPED',
        customer_notes: notes
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 3. Create Line Items
    const orderItemsToInsert = items.map((item: any) => ({
      order_id: order.id,
      product_name: item.title,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice
    }));

    const { error: itemsError } = await supabase
      .from('oms_order_items')
      .insert(orderItemsToInsert);

    if (itemsError) throw itemsError;

    // 4. Fetch the updated order with calculated totals (trigger handles this)
    const { data: finalOrder, error: fetchError } = await supabase
      .from('oms_orders')
      .select('*, oms_order_items(*)')
      .eq('id', order.id)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json({ order: finalOrder });

  } catch (err: any) {
    console.error('Create unified order error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
