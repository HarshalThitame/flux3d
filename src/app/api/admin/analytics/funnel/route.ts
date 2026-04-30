import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { requireAdminRequest } from '@/lib/admin/request'

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const supabase = createAdminSupabaseClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Funnel steps
    const { count: siteVisited } = await supabase
      .from('anonymous_visitors')
      .select('*', { count: 'exact', head: true })
      .gte('first_seen', today.toISOString())

    const { count: servicesViewed } = await supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .gte('entered_at', today.toISOString())
      .like('page_url', '%/services%')

    const { count: materialsViewed } = await supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .gte('entered_at', today.toISOString())
      .like('page_url', '%/materials%')

    const { count: quoteToolOpened } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', today.toISOString())
      .eq('quote_checked', true)

    const { count: fileUploaded } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', today.toISOString())
      .eq('file_uploaded', true)

    const { count: reachedPayment } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', today.toISOString())
      .eq('payment_reached', true)

    const { count: paymentCompleted } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', today.toISOString())
      .eq('order_placed', true)

    const { count: ordersToday } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

      // Biggest drop-off (compare consecutive steps)
      let biggestDrop = ''
      let maxDropPercent = 0
      const steps = [
        { name: 'Services Viewed', count: servicesViewed || 0 },
        { name: 'Materials Viewed', count: materialsViewed || 0 },
        { name: 'Quote Tool Opened', count: quoteToolOpened || 0 },
        { name: 'File Uploaded', count: fileUploaded || 0 },
        { name: 'Reached Payment', count: reachedPayment || 0 },
        { name: 'Payment Completed', count: paymentCompleted || 0 },
        { name: 'Orders Today', count: ordersToday || 0 },
      ]
      
      for (let i = 0; i < steps.length - 1; i++) {
        if (steps[i].count === 0) continue
        const dropPercent = ((steps[i].count - steps[i + 1].count) / steps[i].count) * 100
        if (dropPercent > maxDropPercent) {
          maxDropPercent = dropPercent
          biggestDrop = `${steps[i].name} → ${steps[i + 1].name}`
        }
      }
      
      const dropOff = biggestDrop || 'No significant drop-off'
      const dropOffAction = biggestDrop.includes('File Uploaded') 
        ? 'Improve quote tool UX · Add "Don\'t have a file? Describe it here" option'
        : 'Investigate and optimize this step'

    return NextResponse.json({
      funnel: {
        siteVisited: siteVisited || 0,
        servicesViewed: servicesViewed || 0,
        materialsViewed: materialsViewed || 0,
        quoteToolOpened: quoteToolOpened || 0,
        fileUploaded: fileUploaded || 0,
        reachedPayment: reachedPayment || 0,
        paymentCompleted: paymentCompleted || 0,
        ordersToday: ordersToday || 0,
        biggestDropOff: dropOff,
        dropOffAction,
      },
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
