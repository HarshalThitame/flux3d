// @ts-nocheck
/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminUser } from '@/lib/admin/server';

// GET /api/admin/oms/customers/search?q=phone_or_name
export async function GET(req: NextRequest) {
  try {
    await requireAdminUser();
    const supabase = await createAdminClient();
    const q = new URL(req.url).searchParams.get('q') || '';

    if (q.length < 3) {
      return NextResponse.json({ customers: [] });
    }

    const isPhone = /^\d/.test(q);

    let query = supabase
      .from('customers')
      .select('id, full_name, phone, email, customer_type, company_name, gstin, created_at')
      .limit(10);

    if (isPhone) {
      query = query.ilike('phone', `%${q}%`);
    } else {
      query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ customers: data });
  } catch (err: any) {
    console.error('[OMS] GET /customers/search error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
