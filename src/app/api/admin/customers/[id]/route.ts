import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { logAdminAction } from '@/lib/admin/auditLog'

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
        city, state, pincode, full_address, company_name,
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

    // Lightweight counts for the Overview quick stats
    const { count: sessionsCount } = await supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    const { count: quotesCount } = await supabase
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Bounded page views (powers both the quick stat and the Pages Visited tab)
    const { data: pageViews } = await supabase
      .from('page_views')
      .select(`
        *,
        sessions(session_id, started_at)
      `)
      .eq('sessions.user_id', userId)
      .order('entered_at', { ascending: false })
      .limit(200)

    // Get orders
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Get wishlist
    const { data: wishlist } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('user_id', userId)
      .order('added_at', { ascending: false })

    // Get files - filter by path that starts with user ID
    const { data: files } = await supabase
      .from('storage.objects')
      .select('*')
      .eq('bucket_id', 'quote-models')
      .like('name', `${userId}/%`)

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
      quickStats: {
        sessions: sessionsCount ?? 0,
        pageViews: pageViews?.length ?? 0,
        quotes: quotesCount ?? 0,
        files: files?.length ?? 0,
      },
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
      orders: (orders || []).map(o => ({
        id: String(o.id),
        orderNumber: o.order_number,
        material: o.material,
        parts: o.parts,
        weightGrams: o.weight_grams,
        amount: o.grand_total ?? o.final_price ?? o.total_price,
        status: o.status,
        deliveryDate: o.delivery_date,
        rating: o.rating,
        createdAt: o.created_at,
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response;

  try {
    const params = await context.params
    const userId = params.id
    const supabase = createAdminSupabaseClient()

    const body = (await request.json().catch(() => ({}))) as {
      notes?: string
      tags?: string[]
    }

    const patch: { notes?: string; tags?: string[] } = {}
    if (typeof body.notes === 'string') patch.notes = body.notes
    if (Array.isArray(body.tags)) patch.tags = body.tags.filter((t) => typeof t === 'string')

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', userId)
      .select('id, notes, tags')
      .single()

    if (error) throw new Error(error.message)

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'update_customer_notes',
      target_type: 'user',
      target_id: userId,
      new_value: patch,
    })

    return NextResponse.json({ profile: updated })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
