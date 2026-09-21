import { NextResponse } from 'next/server'
import { createAdminSupabaseClient, isCurrentUserAdmin } from '@/lib/admin/server'
import crypto from 'crypto'
import { reportError } from '@/lib/error-handling'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  props: { params: Promise<{ orderId: string }> }
) {
  try {
    const isAdmin = await isCurrentUserAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId } = await props.params
    const body = await request.json()
    const { order_type, channel_sent } = body

    if (!order_type || !['shop', 'custom', 'custom_order'].includes(order_type)) {
      return NextResponse.json({ error: 'Invalid order_type' }, { status: 400 })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 days

    const supabase = createAdminSupabaseClient()
    const { error } = await supabase.from('review_links').insert({
      order_id: orderId,
      order_type,
      token,
      expires_at: expiresAt.toISOString(),
      channel_sent: channel_sent || null,
      sent_at: new Date().toISOString()
    })

    if (error) {
      throw new Error(error.message)
    }

    const reviewUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/review/${token}`

    return NextResponse.json({ url: reviewUrl })
  } catch (error) {
    reportError(error, 'Failed to generate review link')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
