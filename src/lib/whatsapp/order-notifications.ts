import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function enqueueOrderNotification(
  orderId: string,
  newStatus: string
): Promise<void> {
  const supabase = createAdminSupabaseClient()

  // 1. Get the notification template for this status
  const { data: notificationDef, error: defError } = await supabase
    .from('order_status_notifications')
    .select('*')
    .eq('order_status', newStatus)
    .eq('is_active', true)
    .maybeSingle()

  if (defError) {
    console.error(`[whatsapp-notify] Error fetching notification config for ${newStatus}:`, defError)
    return
  }

  // If no active template mapped for this status, do nothing (safe default)
  if (!notificationDef) return

  // 2. Resolve the order and customer information
  // Fetching main order row to get user contact info.
  // We assume orders table has phone, full_name, etc.
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, group_id, order_number, phone, full_name, total_price, user_id, updated_at')
    .eq('id', orderId)
    .maybeSingle()

  if (orderError || !order) {
    console.error(`[whatsapp-notify] Error fetching order ${orderId}:`, orderError)
    return
  }

  if (!order.phone) {
    console.log(`[whatsapp-notify] Skip sending for order ${orderId} - no phone number`)
    return
  }

  // 3. Opt-out respect
  // If user_id exists, check if they are opted out
  if (order.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('whatsapp_opted_out')
      .eq('id', order.user_id)
      .maybeSingle()
    
    // Fallback property access in case column exists or doesn't
    const isOptedOut = profile && (profile as any).whatsapp_opted_out === true
    if (isOptedOut) {
       console.log(`[whatsapp-notify] Skip sending for order ${orderId} - user opted out`)
       return
    }
  }

  // 4. Component 5: Idempotency & Cooldown Guard
  // Check notification_jobs for this exact order_id + order_status combination
  // If one exists and is pending or sent, skip.
  // Also respect the cooldown across failures.
  const cooldownWindow = new Date(Date.now() - notificationDef.cooldown_minutes * 60000).toISOString()
  
  const { data: existingJobs, error: jobsError } = await supabase
    .from('whatsapp_notification_jobs')
    .select('*')
    .eq('order_id', orderId)
    .eq('order_status', newStatus)
    .gte('created_at', cooldownWindow)

  if (jobsError) {
    console.error(`[whatsapp-notify] Error checking job idempotency for ${orderId}:`, jobsError)
    return
  }

  if (existingJobs && existingJobs.length > 0) {
    const hasSuccessfulOrPending = existingJobs.some(job => job.status === 'sent' || job.status === 'pending')
    if (hasSuccessfulOrPending) {
      console.log(`[whatsapp-notify] Idempotency guard: notification already sent or pending for order ${orderId} status ${newStatus}`)
      return
    }
    // If it's a recent failure, the cooldown guard still prevents it because it's in existingJobs.
    console.log(`[whatsapp-notify] Cooldown guard: notification attempted recently for order ${orderId} status ${newStatus}`)
    return
  }

  // 5. Enqueue the send job
  const payload = {
    template_name: notificationDef.template_name,
    template_language: notificationDef.template_language,
    phone: order.phone,
    customer_name: order.full_name || 'Customer',
    order_number: order.order_number || order.group_id?.slice(0, 8) || orderId,
    amount: order.total_price || 0,
    eta: '' // Extendable
  }

  const { error: insertError } = await supabase
    .from('whatsapp_notification_jobs')
    .insert({
      order_id: orderId,
      order_status: newStatus,
      payload,
      status: 'pending'
    })

  if (insertError) {
    console.error(`[whatsapp-notify] Failed to enqueue job for order ${orderId}:`, insertError)
  }
}
