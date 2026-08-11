import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { rateLimitResponse } from '@/lib/rate-limit'
import { getAdminCustomersStats } from '@/lib/admin/queries'
import { requireAdminPermission } from '@/lib/admin/permissions'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await requireAdminPermission('customers.view')
  if ('response' in auth) return auth.response

  const rateLimit = await rateLimitResponse(request, {
    prefix: 'admin_customers_stats',
    windowSeconds: 60,
    maxRequests: 60,
    userId: auth.user.id,
  })

  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 })
  }

  try {
    const stats = await getAdminCustomersStats()
    return NextResponse.json(stats)
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}