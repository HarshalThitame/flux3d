import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { rateLimitResponse } from '@/lib/rate-limit'
import { reportError } from '@/lib/error-handling'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/me/export
 *
 * Exports all personal data held about the authenticated user (DPDP Act
 * 2023 right to data portability). Returns a JSON payload containing the
 * profile, addresses, orders (custom + shop), payment attempts, and
 * tracking data. PII is returned only to the account owner.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = authData.user.id

    const limit = await rateLimitResponse(request, {
      prefix: 'me_export',
      windowSeconds: 3600,
      maxRequests: 3,
      userId,
    })
    if (!limit.success) {
      return NextResponse.json({ error: 'Too many export requests. Try again later.' }, { status: 429 })
    }

    const admin = createAdminSupabaseClient()

    const [profile, addresses, orders, shopOrders, paymentAttempts] = await Promise.all([
      admin.from('profiles').select('*').eq('id', userId).maybeSingle(),
      admin.from('addresses').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
      admin.from('orders').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      admin.from('shelf_orders').select('*').eq('user_id', userId).order('placed_at', { ascending: false }),
      admin.from('payment_attempts').select('*').eq('customer_id', userId).order('created_at', { ascending: false }),
    ])

    const data = {
      exportedAt: new Date().toISOString(),
      userId,
      email: authData.user.email,
      profile: profile.data ?? null,
      addresses: addresses.data ?? [],
      orders: orders.data ?? [],
      shopOrders: shopOrders.data ?? [],
      paymentAttempts: paymentAttempts.data ?? [],
    }

    return NextResponse.json({
      success: true,
      exportedAt: data.exportedAt,
      data,
    })
  } catch (error) {
    reportError(error, 'Data export failed', { module: 'account', tags: { flow: 'me_export' } })
    return NextResponse.json({ error: 'Export failed. Please try again.' }, { status: 500 })
  }
}