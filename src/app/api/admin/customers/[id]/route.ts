import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { requireAdminPermission } from '@/lib/admin/permissions'
import { logAdminAction } from '@/lib/admin/auditLog'
import { rateLimitResponse } from '@/lib/rate-limit'
import { setCustomerSuspended } from '@/lib/admin/queries'
import { customerPatchSchema, zodErrorResponse } from '@/lib/admin/schemas/customers'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminPermission('customers.view')
  if ('response' in auth) return auth.response

  const rateLimit = await rateLimitResponse(request, {
    prefix: 'admin_customer_profile_get',
    windowSeconds: 60,
    maxRequests: 120,
    userId: auth.user.id,
  })

  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 })
  }

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
      .maybeSingle()

    if (profileError) throw new Error(profileError.message)
    if (!profile) {
      return NextResponse.json({ error: 'Customer not found.' }, { status: 404 })
    }

    // Lightweight counts for the Overview quick stats
    const { count: sessionsCount, error: sessionsError } = await supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
    if (sessionsError) throw new Error(sessionsError.message)

    const { count: quotesCount, error: quotesError } = await supabase
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
    if (quotesError) throw new Error(quotesError.message)

    // Bounded page views (powers both the quick stat and the Pages Visited tab)
    const { data: pageViews, error: pageViewsError } = await supabase
      .from('page_views')
      .select(`
        *,
        sessions(session_id, started_at)
      `)
      .eq('sessions.user_id', userId)
      .order('entered_at', { ascending: false })
      .limit(200)
    if (pageViewsError) throw new Error(pageViewsError.message)

    // Scoped to the fields the profile page renders, bounded to avoid huge payloads.
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, material, parts, weight_grams, grand_total, final_price, total_price, status, delivery_date, rating, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500)
    if (ordersError) throw new Error(ordersError.message)

    // Get wishlist
    const { data: wishlist, error: wishlistError } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('user_id', userId)
      .order('added_at', { ascending: false })
    if (wishlistError) throw new Error(wishlistError.message)

    // Get files - filter by path that starts with user ID
    const { data: files, error: filesError } = await supabase
      .from('storage.objects')
      .select('name, metadata, created_at')
      .eq('bucket_id', 'quote-models')
      .like('name', `${userId}/%`)
      .order('created_at', { ascending: false })
      .limit(200)
    if (filesError) throw new Error(filesError.message)

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
      files: (files || []).map(f => {
        const metadata =
          f.metadata && typeof f.metadata === 'object' && !Array.isArray(f.metadata)
            ? (f.metadata as Record<string, unknown>)
            : null
        return {
          name: f.name,
          size: typeof metadata?.size === 'number' ? metadata.size : undefined,
          uploadedAt: f.created_at,
        }
      }),
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const parsed = customerPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 })
  }
  const payload = parsed.data

  // Financial/status overrides are admin-only; profile edits are order-manager level.
  const requiresSuspendPermission =
    payload.status !== undefined || payload.manualCoupon !== undefined || payload.manualCredit !== undefined
  const permission = requiresSuspendPermission ? 'customers.suspend' : 'customers.update'

  const auth = await requireAdminPermission(permission)
  if ('response' in auth) return auth.response

  const rateLimit = await rateLimitResponse(request, {
    prefix: 'admin_customer_profile_patch',
    windowSeconds: 60,
    maxRequests: 30,
    userId: auth.user.id,
  })

  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 })
  }

  try {
    const params = await context.params
    const userId = params.id
    const supabase = createAdminSupabaseClient()

    const { data: oldProfile } = await supabase
      .from('profiles')
      .select('notes, tags, manual_coupon, manual_credit, suspended_at')
      .eq('id', userId)
      .maybeSingle()

    // Translate status into profile + auth suspension.
    if (payload.status !== undefined) {
      await setCustomerSuspended(userId, payload.status === 'Suspended')
    }

    const writes: Record<string, unknown> = {}
    if (payload.notes !== undefined) writes.notes = payload.notes
    if (payload.tags !== undefined) writes.tags = payload.tags
    if (payload.manualCoupon !== undefined) writes.manual_coupon = payload.manualCoupon
    if (payload.manualCredit !== undefined) writes.manual_credit = payload.manualCredit

    if (Object.keys(writes).length > 0) {
      // Keep a history trail for customer notes.
      if (payload.notes !== undefined) {
        const { error: noteError } = await supabase
          .from('admin_customer_notes')
          .insert({
            user_id: userId,
            admin_id: auth.user.id,
            note: payload.notes,
          })
        if (noteError) throw new Error(noteError.message)
      }

      const { data: updated, error } = await supabase
        .from('profiles')
        .update(writes)
        .eq('id', userId)
        .select('id, notes, tags')
        .single()

      if (error) throw new Error(error.message)

      await logAdminAction({
        admin_id: auth.user.id,
        action: 'update_customer_profile',
        target_type: 'user',
        target_id: userId,
        old_value: oldProfile ?? null,
        new_value: payload,
      })

      return NextResponse.json({ profile: updated })
    }

    return NextResponse.json({ profile: null })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}