import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  props: { params: Promise<{ token: string }> }
) {
  try {
    const rateLimit = await rateLimitResponse(request, {
      prefix: 'review_link_get',
      windowSeconds: 60,
      maxRequests: 10,
    })
    if (!rateLimit.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { token } = await props.params
    const supabase = createAdminSupabaseClient()

    // We assume the review_links table has a token column.
    const { data: link, error } = await supabase
      .from('review_links')
      .select('*')
      .eq('token', token)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!link) return NextResponse.json({ error: 'Link not found' }, { status: 404 })

    if (link.used_at) return NextResponse.json({ error: 'Review already submitted', used: true }, { status: 400 })
    if (new Date(link.expires_at) < new Date()) return NextResponse.json({ error: 'Link expired' }, { status: 400 })

    if (!link.opened_at) {
      await supabase.from('review_links').update({ opened_at: new Date().toISOString() }).eq('id', link.id)
    }

    // Return minimal order context based on order_type and order_id
    // This is mocked since we don't have the exact schema for all order types
    let itemDescription = 'Your 3D printed product'
    let customerName = 'Customer'
    
    if (link.order_type === 'shop') {
      const { data: order } = await supabase.from('shelf_orders').select('items, user_id').eq('id', link.order_id).maybeSingle()
      if (order && order.user_id) {
         const { data: profile } = await supabase.from('profiles').select('name, full_name').eq('id', order.user_id).maybeSingle()
         customerName = profile?.name || profile?.full_name || 'Customer'
         // Mocking item name extraction
         itemDescription = '3D Printed Model from Shop'
      }
    } else {
       itemDescription = 'Custom 3D Printing Order'
    }

    return NextResponse.json({
      valid: true,
      orderContext: {
        itemDescription,
        orderDate: link.sent_at,
        customerName: customerName.split(' ')[0]
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
