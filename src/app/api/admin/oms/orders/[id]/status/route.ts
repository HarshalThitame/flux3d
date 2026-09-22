// @ts-nocheck
/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminUser } from '@/lib/admin/server';

// Valid state machine transitions
const TRANSITIONS: Record<string, string[]> = {
  DRAFT:             ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:         ['PAYMENT_PENDING', 'PAYMENT_RECEIVED', 'CANCELLED', 'ON_HOLD'],
  PAYMENT_PENDING:   ['PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'CANCELLED', 'ON_HOLD'],
  PAYMENT_RECEIVED:  ['IN_PRODUCTION', 'CANCELLED', 'ON_HOLD'],
  IN_PRODUCTION:     ['QUALITY_CHECK', 'PRINT_FAILED', 'ON_HOLD'],
  QUALITY_CHECK:     ['PACKED', 'IN_PRODUCTION'],
  PRINT_FAILED:      ['IN_PRODUCTION', 'CANCELLED'],
  PACKED:            ['SHIPPED', 'ON_HOLD'],
  SHIPPED:           ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY:  ['DELIVERED'],
  DELIVERED:         ['RETURN_REQUESTED', 'REFUNDED'],
  RETURN_REQUESTED:  ['RETURNED', 'DELIVERED'],
  RETURNED:          ['REFUNDED'],
  ON_HOLD:           ['CONFIRMED', 'PAYMENT_PENDING', 'PAYMENT_RECEIVED', 'IN_PRODUCTION', 'CANCELLED'],
  CANCELLED:         ['REFUNDED'],
  REFUNDED:          [],
  PAYMENT_FAILED:    ['PAYMENT_PENDING', 'CANCELLED'],
};

// Timestamp field to set for each status transition
const STATUS_TIMESTAMPS: Record<string, string> = {
  CONFIRMED:         'confirmed_at',
  PAYMENT_RECEIVED:  'payment_received_at',
  IN_PRODUCTION:     'production_started_at',
  QUALITY_CHECK:     'production_completed_at',
  PACKED:            'packed_at',
  SHIPPED:           'shipped_at',
  OUT_FOR_DELIVERY:  'out_for_delivery_at',
  DELIVERED:         'delivered_at',
  CANCELLED:         'cancelled_at',
};

const FULFILLMENT_MAP: Record<string, string> = {
  IN_PRODUCTION:     'IN_PRODUCTION',
  QUALITY_CHECK:     'IN_PRODUCTION',
  PACKED:            'PACKED',
  SHIPPED:           'SHIPPED',
  OUT_FOR_DELIVERY:  'OUT_FOR_DELIVERY',
  DELIVERED:         'DELIVERED',
  RETURNED:          'RETURNED',
};

// PATCH /api/admin/oms/orders/[id]/status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const supabase = await createAdminClient();
    const { id } = await params;
    const { status: newStatus, reason, actorName } = await req.json();

    if (!newStatus) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 });
    }

    // Fetch current order
    const { data: order, error: fetchError } = await supabase
      .from('oms_orders')
      .select('id, status, payment_status')
      .eq('id', id)
      .single();
    if (fetchError || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const allowed = TRANSITIONS[order.status] || [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid transition: ${order.status} → ${newStatus}. Allowed: ${allowed.join(', ') || 'none'}` },
        { status: 422 }
      );
    }

    const now = new Date().toISOString();
    const updates: Record<string, any> = {
      status: newStatus,
      updated_at: now,
    };

    // Set lifecycle timestamp
    const tsField = STATUS_TIMESTAMPS[newStatus];
    if (tsField) updates[tsField] = now;

    // Auto-update fulfillment_status
    if (FULFILLMENT_MAP[newStatus]) {
      updates.fulfillment_status = FULFILLMENT_MAP[newStatus];
    }

    const { data: updated, error: updateError } = await supabase
      .from('oms_orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (updateError) throw updateError;

    // Audit log
    await supabase.from('oms_audit_logs').insert({
      order_id: id,
      action: 'STATUS_CHANGE',
      old_value: order.status,
      new_value: newStatus,
      reason: reason || null,
      actor_name: actorName || null,
    });

    return NextResponse.json({ order: updated });
  } catch (err: any) {
    console.error('[OMS] PATCH /orders/[id]/status error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
