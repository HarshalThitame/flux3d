/* eslint-disable */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const revalidate = 300; // 5 minutes cache

export async function GET(req: NextRequest) {
  try {
    const supabase = await createAdminClient();

    const { data: testimonials, error } = await supabase
      .from('reviews')
      .select('id, rating, title, body, customer_name, is_verified_purchase, created_at, image_urls, order_type')
      .eq('status', 'approved')
      .order('rating', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return NextResponse.json({ testimonials }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      }
    });

  } catch (err: any) {
    console.error('Fetch testimonials error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
