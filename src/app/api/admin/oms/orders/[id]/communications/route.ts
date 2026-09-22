// @ts-nocheck
/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminUser } from '@/lib/admin/server';

// GET /api/admin/oms/orders/[id]/communications
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const supabase = await createAdminClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('oms_communications')
      .select('*')
      .eq('order_id', id)
      .order('communicated_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ communications: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/oms/orders/[id]/communications — add comm entry
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const supabase = await createAdminClient();
    const { id } = await params;
    const { channel, direction = 'outbound', subject, body: msgBody, communicatedAt } = await req.json();

    if (!channel || !msgBody) {
      return NextResponse.json({ error: 'channel and body are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('oms_communications')
      .insert({
        order_id: id,
        channel,
        direction,
        subject: subject || null,
        body: msgBody,
        communicated_at: communicatedAt ? new Date(communicatedAt).toISOString() : new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ communication: data }, { status: 201 });
  } catch (err: any) {
    console.error('[OMS] POST /communications error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
