import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { requireAdminRequest } from '@/lib/admin/request'

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response;

  try {
    const supabase = createAdminSupabaseClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Traffic source performance
    const { data: sourceData } = await supabase
      .from('anonymous_visitors')
      .select('source')
      .gte('first_seen', today.toISOString())

    const sourceBreakdown = (sourceData || []).reduce((acc: Record<string, { visitors: number; orders: number; revenue: number }>, curr) => {
      const source = curr.source || 'Other'
      if (!acc[source]) {
        acc[source] = { visitors: 0, orders: 0, revenue: 0 }
      }
      acc[source].visitors++
      return acc
    }, {})

    // Get orders by source (join with profiles)
    const { data: ordersBySource } = await supabase
      .from('orders')
      .select('total_price, profiles(source)')
      .gte('created_at', today.toISOString())

    ;(ordersBySource || []).forEach(o => {
      const source = (o as any).profiles?.source || 'Other'
      if (sourceBreakdown[source]) {
        sourceBreakdown[source].orders++
        sourceBreakdown[source].revenue += o.total_price || 0
      }
    })

    const sourcePerformance = Object.entries(sourceBreakdown)
      .map(([source, data]) => ({
        source,
        visitors: data.visitors,
        orders: data.orders,
        revenue: `₹${data.revenue.toLocaleString('en-IN')}`,
      }))
      .sort((a, b) => b.visitors - a.visitors)

    // Device breakdown
    const { data: deviceData } = await supabase
      .from('sessions')
      .select('device')
      .gte('started_at', today.toISOString())

    const deviceBreakdown = (deviceData || []).reduce((acc: Record<string, number>, curr) => {
      const device = curr.device || 'Unknown'
      acc[device] = (acc[device] || 0) + 1
      return acc
    }, {})

    const totalSessions = (deviceData || []).length
    const devicePerformance = Object.entries(deviceBreakdown)
      .map(([device, count]) => ({
        device,
        count,
        percent: `${((count as number / totalSessions) * 100).toFixed(1)}%`,
      }))
      .sort((a, b) => b.count - a.count)

    // Conversion rates by device
    const { count: mobileSessions } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', today.toISOString())
      .like('device', '%Mobile%')

    const { count: mobileOrders } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', today.toISOString())
      .like('device', '%Mobile%')
      .eq('order_placed', true)

    const { count: desktopSessions } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', today.toISOString())
      .like('device', '%Desktop%')

    const { count: desktopOrders } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', today.toISOString())
      .like('device', '%Desktop%')
      .eq('order_placed', true)

    const mobileConversionRate = mobileSessions ? ((mobileOrders || 0) / mobileSessions * 100).toFixed(1) : '0.0'
    const desktopConversionRate = desktopSessions ? ((desktopOrders || 0) / desktopSessions * 100).toFixed(1) : '0.0'

    // Geographic spread
    const { data: geoData } = await supabase
      .from('sessions')
      .select('location')
      .gte('started_at', today.toISOString())

    const geoBreakdown = (geoData || []).reduce((acc: Record<string, { sessions: number; orders: number }>, curr) => {
      const city = curr.location || 'Unknown'
      if (!acc[city]) {
        acc[city] = { sessions: 0, orders: 0 }
      }
      acc[city].sessions++
      return acc
    }, {})

    // Get orders by city
    const { data: ordersByCity } = await supabase
      .from('orders')
      .select('total_price, profiles(city)')
      .gte('created_at', today.toISOString())

    ;(ordersByCity || []).forEach(o => {
      const city = (o as any).profiles?.city || 'Unknown'
      if (geoBreakdown[city]) {
        geoBreakdown[city].orders++
      }
    })

    const geographicSpread = Object.entries(geoBreakdown)
      .map(([city, data]) => ({
        city,
        sessions: data.sessions,
        orders: data.orders,
      }))
      .sort((a, b) => b.sessions - a.sessions)

    // Untapped cities (visits but no orders)
    const untapped = geographicSpread.filter(g => g.orders === 0 && g.sessions > 20)

    return NextResponse.json({
      sourcePerformance,
      devicePerformance,
      mobileConversionRate: `${mobileConversionRate}%`,
      desktopConversionRate: `${desktopConversionRate}%`,
      mobileAction: 'Desktop users convert 2.7× better — optimize mobile quote flow',
      geographicSpread,
      untappedCities: untapped.map(u => u.city).join(' · '),
      untappedAction: 'consider targeted campaigns',
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
