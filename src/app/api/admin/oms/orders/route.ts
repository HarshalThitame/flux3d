// @ts-nocheck
/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminUser } from '@/lib/admin/server';

// GET /api/admin/oms/orders — list all OMS orders
export async function GET(req: NextRequest) {
  try {
    await requireAdminUser();
    const supabase = await createAdminClient();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const q = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('oms_orders')
      .select(`
        id, order_number, source, source_reference,
        status, payment_status, fulfillment_status,
        subtotal, discount, shipping_cost, tax, total_amount, amount_paid, amount_due,
        refunded_amount,
        order_date, created_at, confirmed_at,
        customer_notes, internal_notes, archived_at,
        customers(id, full_name, phone, email, customer_type, company_name)
      `, { count: 'exact' })
      .is('archived_at', null)
      .order('order_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (source) query = query.eq('source', source);

    const { data, error, count } = await query;
    if (error) throw error;

    // Client-side filter on customer name/phone/order number for search
    let filtered = data || [];
    if (q) {
      const lower = q.toLowerCase();
      filtered = filtered.filter(
        (o: any) =>
          o.order_number?.toLowerCase().includes(lower) ||
          o.customers?.full_name?.toLowerCase().includes(lower) ||
          o.customers?.phone?.includes(q) ||
          o.customers?.email?.toLowerCase().includes(lower)
      );
    }

    return NextResponse.json({ orders: filtered, total: count });
  } catch (err: any) {
    console.error('[OMS] GET /orders error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/oms/orders — create new OMS order
export async function POST(req: NextRequest) {
  try {
    await requireAdminUser();
    const supabase = await createAdminClient();

    const body = await req.json();
    const {
      // Customer
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      customerType = 'individual',
      companyName,
      gstin,
      customerNotes: customerNotesOnCustomer,
      // Order meta
      source = 'whatsapp',
      sourceReference,
      orderDate,
      // Line items
      items = [],
      // Pricing overrides
      discount = 0,
      shippingCost = 0,
      tax = 0,
      // Notes
      customerNotes,
      internalNotes,
    } = body;

    if (!items.length) {
      return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 });
    }

    // ── 1. Customer de-duplication / creation ─────────────────────
    let resolvedCustomerId = customerId;

    if (!resolvedCustomerId) {
      // Search by phone first
      if (customerPhone) {
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', customerPhone)
          .maybeSingle();
        if (existing) resolvedCustomerId = existing.id;
      }

      // Search by email if phone not found
      if (!resolvedCustomerId && customerEmail) {
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .eq('email', customerEmail)
          .maybeSingle();
        if (existing) resolvedCustomerId = existing.id;
      }

      // Create new customer
      if (!resolvedCustomerId) {
        if (!customerName) {
          return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
        }
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            full_name: customerName,
            email: customerEmail || null,
            phone: customerPhone || null,
            customer_type: customerType,
            company_name: companyName || null,
            gstin: gstin || null,
            customer_notes: customerNotesOnCustomer || null,
          })
          .select('id')
          .single();
        if (customerError) throw customerError;
        resolvedCustomerId = newCustomer.id;
      }
    }

    // ── 2. Create OMS order ───────────────────────────────────────
    const { data: order, error: orderError } = await supabase
      .from('oms_orders')
      .insert({
        customer_id: resolvedCustomerId,
        source,
        source_reference: sourceReference || null,
        status: 'DRAFT',
        payment_status: 'UNPAID',
        fulfillment_status: 'NOT_SHIPPED',
        order_date: orderDate ? new Date(orderDate).toISOString() : new Date().toISOString(),
        discount: parseFloat(discount) || 0,
        shipping_cost: parseFloat(shippingCost) || 0,
        tax: parseFloat(tax) || 0,
        customer_notes: customerNotes || null,
        internal_notes: internalNotes || null,
      })
      .select()
      .single();
    if (orderError) throw orderError;

    // ── 3. Create line items ──────────────────────────────────────
    const itemsToInsert = items.map((item: any) => ({
      order_id: order.id,
      product_name: item.productName || item.title,
      description: item.description || null,
      quantity: parseInt(item.quantity) || 1,
      unit_price: parseFloat(item.unitPrice) || 0,
      discount: parseFloat(item.discount) || 0,
      tax: parseFloat(item.tax) || 0,
      custom_attributes: item.customAttributes || null,
    }));

    const { error: itemsError } = await supabase
      .from('oms_order_items')
      .insert(itemsToInsert);
    if (itemsError) throw itemsError;

    // ── 4. Audit log ──────────────────────────────────────────────
    await supabase.from('oms_audit_logs').insert({
      order_id: order.id,
      action: 'ORDER_CREATED',
      new_value: 'DRAFT',
      reason: `Order created via ${source}`,
    });

    // ── 5. Return full order ──────────────────────────────────────
    const { data: finalOrder } = await supabase
      .from('oms_orders')
      .select(`
        *,
        customers(*),
        oms_order_items(*)
      `)
      .eq('id', order.id)
      .single();

    return NextResponse.json({ order: finalOrder }, { status: 201 });
  } catch (err: any) {
    console.error('[OMS] POST /orders error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
