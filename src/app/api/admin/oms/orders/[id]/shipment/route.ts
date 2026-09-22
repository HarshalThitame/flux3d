// @ts-nocheck
/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminUser } from '@/lib/admin/server';

// GET /api/admin/oms/orders/[id]/shipment
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const supabase = await createAdminClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('oms_shipments')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ shipments: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/oms/orders/[id]/shipment — create shipment
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
      shippingName, shippingPhone,
      addressLine1, addressLine2,
      city, state, pincode, country = 'India', landmark,
      courierName, awbNumber, trackingUrl, shippingMethod,
      expectedShipDate, actualShipDate,
      expectedDeliveryDate, actualDeliveryDate,
      shippingRequired = true,
    } = body;

    const { data, error } = await supabase
      .from('oms_shipments')
      .insert({
        order_id: id,
        shipping_name: shippingName,
        shipping_phone: shippingPhone || null,
        address_line1: addressLine1 || null,
        address_line2: addressLine2 || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        country,
        landmark: landmark || null,
        courier_name: courierName || null,
        awb_number: awbNumber || null,
        tracking_url: trackingUrl || null,
        shipping_method: shippingMethod || null,
        expected_ship_date: expectedShipDate || null,
        actual_ship_date: actualShipDate || null,
        expected_delivery_date: expectedDeliveryDate || null,
        actual_delivery_date: actualDeliveryDate || null,
        shipping_required: shippingRequired,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('oms_audit_logs').insert({
      order_id: id,
      action: 'SHIPMENT_CREATED',
      new_value: awbNumber || courierName || 'Shipment added',
    });

    return NextResponse.json({ shipment: data }, { status: 201 });
  } catch (err: any) {
    console.error('[OMS] POST /shipment error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/admin/oms/orders/[id]/shipment — update shipment by shipmentId in body
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const supabase = await createAdminClient();
    const { id } = await params;
    const body = await req.json();
    const { shipmentId, ...fields } = body;

    if (!shipmentId) {
      return NextResponse.json({ error: 'shipmentId required' }, { status: 400 });
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    const fieldMap: Record<string, string> = {
      shippingName: 'shipping_name', shippingPhone: 'shipping_phone',
      addressLine1: 'address_line1', addressLine2: 'address_line2',
      city: 'city', state: 'state', pincode: 'pincode', country: 'country', landmark: 'landmark',
      courierName: 'courier_name', awbNumber: 'awb_number',
      trackingUrl: 'tracking_url', shippingMethod: 'shipping_method',
      expectedShipDate: 'expected_ship_date', actualShipDate: 'actual_ship_date',
      expectedDeliveryDate: 'expected_delivery_date', actualDeliveryDate: 'actual_delivery_date',
      shippingRequired: 'shipping_required',
    };
    for (const [k, v] of Object.entries(fields)) {
      if (fieldMap[k]) updates[fieldMap[k]] = v;
    }

    const { data, error } = await supabase
      .from('oms_shipments')
      .update(updates)
      .eq('id', shipmentId)
      .eq('order_id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ shipment: data });
  } catch (err: any) {
    console.error('[OMS] PATCH /shipment error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
