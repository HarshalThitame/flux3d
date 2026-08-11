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
    prefix: 'admin_customer_quotes_get',
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

    const { data: quotes, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    return NextResponse.json({
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
      }))
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
