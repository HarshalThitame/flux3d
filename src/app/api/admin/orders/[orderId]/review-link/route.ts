/* eslint-disable */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/server';
import crypto from 'crypto';

type ParamsType = { orderId: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<ParamsType> }
) {
  try {
    await requireAdminUser();
    const resolvedParams = await params;
    const { orderId } = resolvedParams;

    const body = await req.json();
    const { orderType } = body; // 'shop', 'custom', or 'custom_order'

    if (!['shop', 'custom', 'custom_order'].includes(orderType)) {
      return NextResponse.json({ error: 'Invalid orderType' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // Generate secure 32-byte hex token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiry to 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { data: reviewLink, error } = await supabase
      .from('review_links')
      .insert({
        token,
        order_type: orderType,
        order_id: orderId,
        expires_at: expiresAt.toISOString(),
        is_used: false
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ token, url: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/review/${token}` });

  } catch (err: any) {
    console.error('Create review link error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
