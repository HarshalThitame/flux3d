import { notFound } from 'next/navigation'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import ReviewPageClient from './ReviewPageClient'

export default async function ReviewPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params
  
  const supabase = createAdminSupabaseClient()
  const { data: link } = await supabase.from('review_links').select('*').eq('token', token).maybeSingle()
  
  if (!link) {
    return <div className="p-8 text-center text-gray-500">This review link is invalid or does not exist.</div>
  }
  
  if (link.used_at) {
    return <div className="p-8 text-center text-gray-500">You have already submitted a review. Thank you!</div>
  }
  
  if (new Date(link.expires_at) < new Date()) {
    return <div className="p-8 text-center text-gray-500">This review link has expired.</div>
  }

  // Update opened_at if it's the first visit
  if (!link.opened_at) {
    await supabase.from('review_links').update({ opened_at: new Date().toISOString() }).eq('id', link.id)
  }

  // Fetch minimal context
  let itemDescription = 'Your 3D printed product'
  let customerName = 'Customer'
  
  if (link.order_type === 'shop') {
    const { data: order } = await supabase.from('shelf_orders').select('items, user_id').eq('id', link.order_id).maybeSingle()
    if (order && order.user_id) {
       const { data: profile } = await supabase.from('profiles').select('name, full_name').eq('id', order.user_id).maybeSingle()
       customerName = profile?.name || profile?.full_name || 'Customer'
       itemDescription = '3D Printed Model from Shop'
    }
  } else {
     itemDescription = 'Custom 3D Printing Order'
  }

  const orderContext = {
    itemDescription,
    customerName: customerName.split(' ')[0],
  }

  return <ReviewPageClient token={token} orderContext={orderContext} />
}
