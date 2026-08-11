import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { rateLimitResponse } from '@/lib/rate-limit'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response;

  const rateLimit = await rateLimitResponse(request, {
    prefix: 'admin_customer_carts_get',
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

    const { data: carts, error } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    return NextResponse.json({
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
      }))
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
