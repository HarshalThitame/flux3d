import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { rateLimitResponse } from '@/lib/rate-limit'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  props: { params: Promise<{ token: string }> }
) {
  try {
    const rateLimit = await rateLimitResponse(request, {
      prefix: 'review_draft',
      windowSeconds: 3600,
      maxRequests: 5,
    })
    if (!rateLimit.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { token } = await props.params
    const body = await request.json()
    const { rating, raw_input, item_description = '3D printed product' } = body

    if (!raw_input || raw_input.trim().length === 0) {
      return NextResponse.json({ error: 'Input cannot be empty' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const { data: link } = await supabase.from('review_links').select('id, used_at, expires_at').eq('token', token).maybeSingle()
    if (!link || link.used_at || new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: "You are writing a customer review for a 3D printed product. Write 2-3 sentences in a natural, genuine customer voice. Match the sentiment to the rating (1=very negative, 5=very positive). Reference the product description provided. Do NOT fabricate specific details the customer didn't mention. Do NOT use marketing language."
        },
        {
          role: 'user',
          content: `Rating: ${rating}/5\nProduct: ${item_description}\nCustomer's notes: ${raw_input}`
        }
      ],
      max_tokens: 150,
      temperature: 0.7
    })

    return NextResponse.json({ draft: response.choices[0].message.content?.trim() })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate draft' }, { status: 500 })
  }
}
