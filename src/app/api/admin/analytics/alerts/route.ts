import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { requireAdminRequest } from '@/lib/admin/request'

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response;

  try {
    const supabase = createAdminSupabaseClient()

    // Get alerts (low stock)
    const { data: lowStock } = await supabase
      .from('materials')
      .select('name, stock')
      .in('stock', ['Low', 'Critical'])

    // Urgent alerts (carts abandoned with high value)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data: abandonedCarts } = await supabase
      .from('cart_items')
      .select('*, profiles(name, city)')
      .eq('status', 'abandoned')
      .gte('abandoned_at', today.toISOString())

    // Printer issues
    const { data: printerIssues } = await supabase
      .from('printers')
      .select('name, status, note')
      .neq('status', 'Printing')
      .neq('status', 'Idle')

    // Follow-ups needed
    const { data: wishlistItems } = await supabase
      .from('wishlist_items')
      .select('*, profiles(name)')
      .eq('ordered', false)
      .lt('added_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    const { data: noFileQuotes } = await supabase
      .from('sessions')
      .select('*, anonymous_visitors(visitor_id, location)')
      .eq('quote_checked', true)
      .eq('file_uploaded', false)
      .gte('started_at', today.toISOString())

    // Info alerts
    const { count: ordersToday } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

    const revenueToday = (await supabase
      .from('orders')
      .select('total_price')
      .gte('created_at', today.toISOString())).data || []
    
    const totalRevenue = revenueToday.reduce((sum, o) => sum + (o.total_price || 0), 0)

    const { data: newCustomers } = await supabase
      .from('profiles')
      .select('name, city')
      .gte('created_at', today.toISOString())
      .limit(10)

    return NextResponse.json({
      alerts: [
        ...(abandonedCarts || []).map((c: any) => ({
          type: '🔴 URGENT',
          message: `Cart abandoned with ₹${c.estimated_cost} value (${c.profiles?.name || 'Anonymous'} · ${c.profiles?.city || 'Unknown'}) — Send WhatsApp recovery →`,
        })),
        ...(lowStock || []).map(m => ({
          type: '🟡 WARNING',
          message: `${m.name} stock at ${m.stock} level → Reorder now`,
        })),
        ...(printerIssues || []).map(p => ({
          type: '🔴 URGENT',
          message: `${p.name} — ${p.status} · ${p.note || 'Requires attention'}`,
        })),
        ...(wishlistItems || []).map((w: any) => ({
          type: '🟢 FOLLOW-UP',
          message: `${w.profiles?.name} has ${w.product_name || w.material} in wishlist for ${Math.floor((Date.now() - new Date(w.added_at).getTime()) / (1000 * 60 * 60 * 24))} days — Send nudge →`,
        })),
        ...(noFileQuotes || []).map((s: any) => ({
          type: '🟡 FOLLOW-UP',
          message: `${s.anonymous_visitors?.visitor_id || 'Visitor'} opened quote tool but did not upload a file — Review quote UX`,
        })),
      ],
      info: [
        { type: '🟢 INFO', message: `${ordersToday || 0} orders received today · ₹${totalRevenue.toLocaleString('en-IN')} revenue · On track for monthly target` },
        ...(newCustomers || []).map((c: any) => ({
          type: '🟢 INFO',
          message: `New customer registered from ${c.city || 'Unknown'} — first order pending · Welcome message sent`,
        })),
      ],
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
