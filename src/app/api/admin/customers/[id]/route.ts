import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { requireAdminRequest } from '@/lib/admin/request'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response;

  try {
    const params = await context.params
    const userId = params.id
    const supabase = createAdminSupabaseClient()

    // Get user profile with all extended fields
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id, name, email, phone, whatsapp_number, profession, referred_by,
        preferred_device, preferred_browser, preferred_language,
        city, state, pincode, full_address, gst_number, company_name,
        total_spent, total_orders, avg_order_value, largest_order, smallest_order,
        first_order_date, last_order_date, order_frequency_days, lifetime_value_projection,
        total_site_visits, total_time_spent, avg_session_duration,
        favorite_page, most_quoted_material, cart_abandonments, cart_abandoned_value,
        files_uploaded, quote_to_order_conversion_rate, whatsapp_messages_sent,
        support_tickets_raised, referrals_made, engagement_score,
        tags, notes, joined_date, last_seen_at
      `)
      .eq('id', userId)
      .single()

    if (profileError) throw new Error(profileError.message)

    // Get sessions
    const { data: sessions } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(100)

    // Get page views
    const { data: pageViews } = await supabase
      .from('page_views')
      .select(`
        *,
        sessions(session_id, started_at)
      `)
      .eq('sessions.user_id', userId)
      .order('entered_at', { ascending: false })
      .limit(200)

    // Get quotes
    const { data: quotes } = await supabase
      .from('quotes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Get carts
    const { data: carts } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Get orders
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Get WhatsApp messages
    const { data: messages } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Get support tickets
    const { data: tickets } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Get wishlist
    const { data: wishlist } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('user_id', userId)
      .order('added_at', { ascending: false })

    // Get files
    const { data: files } = await supabase
      .from('storage.objects')
      .select('*')
      .eq('bucket_id', 'quote-models')
      .eq('owner', userId)

    return NextResponse.json({
      profile: profile ? {
        id: String(profile.id),
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        whatsappNumber: profile.whatsapp_number,
        profession: profile.profession,
        referredBy: profile.referred_by,
        preferredDevice: profile.preferred_device,
        preferredBrowser: profile.preferred_browser,
        preferredLanguage: profile.preferred_language,
        city: profile.city,
        state: profile.state,
        pincode: profile.pincode,
        fullAddress: profile.full_address,
        gstNumber: profile.gst_number,
        companyName: profile.company_name,
        totalSpent: profile.total_spent,
        totalOrders: profile.total_orders,
        avgOrderValue: profile.avg_order_value,
        largestOrder: profile.largest_order,
        smallestOrder: profile.smallest_order,
        firstOrderDate: profile.first_order_date,
        lastOrderDate: profile.last_order_date,
        orderFrequencyDays: profile.order_frequency_days,
        lifetimeValueProjection: profile.lifetime_value_projection,
        totalSiteVisits: profile.total_site_visits,
        totalTimeSpent: profile.total_time_spent,
        avgSessionDuration: profile.avg_session_duration,
        favoritePage: profile.favorite_page,
        mostQuotedMaterial: profile.most_quoted_material,
        cartAbandonments: profile.cart_abandonments,
        cartAbandonedValue: profile.cart_abandoned_value,
        filesUploaded: profile.files_uploaded,
        quoteToOrderConversionRate: profile.quote_to_order_conversion_rate,
        whatsappMessagesSent: profile.whatsapp_messages_sent,
        supportTicketsRaised: profile.support_tickets_raised,
        referralsMade: profile.referrals_made,
        engagementScore: profile.engagement_score,
        tags: profile.tags || [],
        notes: profile.notes,
        joinedDate: profile.joined_date,
        lastSeenAt: profile.last_seen_at,
      } : null,
      sessions: (sessions || []).map(s => ({
        id: String(s.id),
        sessionId: s.session_id,
        userId: s.user_id ? String(s.user_id) : null,
        startedAt: s.started_at,
        endedAt: s.ended_at,
        durationSeconds: s.duration_seconds,
        pageViewsCount: s.page_views_count,
        quoteChecked: s.quote_checked,
        fileUploaded: s.file_uploaded,
        orderPlaced: s.order_placed,
        paymentReached: s.payment_reached,
        exitedAtStep: s.exited_at_step,
        exitReason: s.exit_reason,
        device: s.device,
        location: s.location,
        ipAddress: s.ip_address,
        referrer: s.referrer,
      })),
      pageViews: (pageViews || []).map(p => ({
        id: String(p.id),
        sessionId: p.sessions?.session_id,
        pageUrl: p.page_url,
        pageTitle: p.page_title,
        enteredAt: p.entered_at,
        exitedAt: p.exited_at,
        timeSpentSeconds: p.time_spent_seconds,
        scrollDepthPercent: p.scroll_depth_percent,
        actionsTaken: p.actions_taken,
      })),
      quotes: (quotes || []).map(q => ({
        id: String(q.id),
        quoteId: q.quote_id,
        material: q.material,
        quantity: q.quantity,
        weightGrams: q.weight_grams,
        estimatedCost: q.estimated_cost,
        fileUploaded: q.file_uploaded,
        convertedToOrder: q.converted_to_order,
        orderId: q.converted_to_order_id ? String(q.converted_to_order_id) : null,
        timeSpentSeconds: q.time_spent_seconds,
        createdAt: q.created_at,
      })),
      carts: (carts || []).map(c => ({
        id: String(c.id),
        material: c.material,
        quantity: c.quantity,
        weightGrams: c.weight_grams,
        estimatedCost: c.estimated_cost,
        expressDelivery: c.express_delivery,
        giftPackaging: c.gift_packaging,
        status: c.status,
        abandonedAt: c.abandoned_at,
        abandonedReason: c.abandoned_reason,
        convertedToOrderId: c.converted_to_order_id ? String(c.converted_to_order_id) : null,
        createdAt: c.created_at,
      })),
      orders: (orders || []).map(o => ({
        id: String(o.id),
        orderNumber: o.order_number,
        material: o.material,
        parts: o.parts,
        weightGrams: o.weight_grams,
        amount: o.total_price,
        status: o.status,
        deliveryDate: o.delivery_date,
        rating: o.rating,
        createdAt: o.created_at,
      })),
      whatsappMessages: (messages || []).map(m => ({
        id: String(m.id),
        direction: m.direction,
        messageText: m.message_text,
        automated: m.automated,
        triggerEvent: m.trigger_event,
        responded: m.responded,
        responseTimeMinutes: m.response_time_minutes,
        createdAt: m.created_at,
      })),
      supportTickets: (tickets || []).map(t => ({
        id: String(t.id),
        ticketId: t.ticket_id,
        subject: t.subject,
        category: t.category,
        priority: t.priority,
        status: t.status,
        assignedTo: t.assigned_to ? String(t.assigned_to) : null,
        resolutionTimeMinutes: t.resolution_time_minutes,
        satisfactionRating: t.satisfaction_rating,
        createdAt: t.created_at,
      })),
      wishlist: (wishlist || []).map(w => ({
        id: String(w.id),
        productName: w.product_name,
        material: w.material,
        price: w.price,
        addedAt: w.added_at,
        notifiedAt: w.notified_at,
        ordered: w.ordered,
        orderId: w.order_id ? String(w.order_id) : null,
      })),
      files: (files || []).map(f => ({
        name: f.name,
        size: f.metadata?.size,
        uploadedAt: f.created_at,
      })),
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
