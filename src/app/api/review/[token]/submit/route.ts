import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const negativeWords = ['terrible', 'awful', 'bad', 'worst', 'broken', 'scam', 'poor', 'trash', 'garbage', 'disappointing']

export async function POST(
  request: Request,
  props: { params: Promise<{ token: string }> }
) {
  try {
    const rateLimit = await rateLimitResponse(request, {
      prefix: 'review_submit',
      windowSeconds: 3600,
      maxRequests: 3,
    })
    if (!rateLimit.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { token } = await props.params
    const body = await request.json()
    const { rating, raw_customer_input, review_text, consent_display, customer_display_name, website } = body

    if (website) { // Honeypot
      return NextResponse.json({ success: true, message: 'Thank you for your review!' })
    }

    if (!rating || rating < 1 || rating > 5 || !review_text || review_text.length > 1000) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const { data: link } = await supabase.from('review_links').select('*').eq('token', token).maybeSingle()
    if (!link || link.used_at || new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 })
    }

    let status = rating >= 4 ? 'approved' : 'pending_review'
    
    // Sentiment consistency check
    if (rating >= 4 && raw_customer_input) {
      const lowerInput = raw_customer_input.toLowerCase()
      if (negativeWords.some(w => lowerInput.includes(w))) {
        status = 'pending_review'
      }
    }

    const avatarSeed = Math.random().toString(36).substring(2, 15)

    const { error: insertError } = await supabase.from('reviews').insert({
      order_id: link.order_id,
      order_type: link.order_type,
      rating,
      raw_customer_input,
      review_text,
      customer_display_name: consent_display ? customer_display_name : 'Verified Customer',
      customer_avatar_seed: avatarSeed,
      consent_display,
      status,
      featured: false,
      submitted_at: new Date().toISOString()
    })

    if (insertError) throw new Error(insertError.message)

    await supabase.from('review_links').update({ used_at: new Date().toISOString() }).eq('id', link.id)

    return NextResponse.json({ success: true, message: 'Thank you for your review!' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
  }
}
