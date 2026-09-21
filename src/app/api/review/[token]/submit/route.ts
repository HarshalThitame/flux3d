/* eslint-disable */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type ParamsType = { token: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<ParamsType> }
) {
  try {
    // Initialize Redis for rate limiting inside handler to avoid build time errors
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || 'https://dummy.upstash.io',
      token: process.env.UPSTASH_REDIS_REST_TOKEN || 'dummy',
    });

    // Create a new ratelimiter, that allows 3 requests per 1 day
    const ratelimit = new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(3, '1 d'),
      analytics: true,
    });

    const resolvedParams = await params;
    const { token } = resolvedParams;

    // Rate Limiting by IP
    const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
    const { success } = await ratelimit.limit(`review_submit_${ip}`);
    
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();
    const { website, rating, title, body: reviewBody, customerName, imageUrls } = body;

    // Honeypot check: If the hidden 'website' field is filled, silently bin it.
    if (website) {
      return NextResponse.json({ success: true, message: 'Review submitted successfully' }); 
    }

    const supabase = await createAdminClient();

    // Validate the token
    const { data: link, error: linkError } = await supabase
      .from('review_links')
      .select('*')
      .eq('token', token)
      .eq('is_used', false)
      .single();

    if (linkError || !link) {
      return NextResponse.json({ error: 'Invalid or expired review link' }, { status: 400 });
    }

    // Check expiry
    if (new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Review link has expired' }, { status: 400 });
    }

    // Insert the review with 'pending' status
    const { error: reviewError } = await supabase
      .from('reviews')
      .insert({
        order_type: link.order_type,
        order_id: link.order_id,
        rating,
        title,
        body: reviewBody,
        customer_name: customerName,
        image_urls: imageUrls || [],
        status: 'pending',
        is_verified_purchase: true
      });

    if (reviewError) throw reviewError;

    // Mark token as used
    await supabase
      .from('review_links')
      .update({ is_used: true })
      .eq('id', link.id);

    return NextResponse.json({ success: true, message: 'Review submitted successfully' });

  } catch (err: any) {
    console.error('Submit review error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
