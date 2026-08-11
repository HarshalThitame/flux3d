import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { rateLimitResponse } from '@/lib/rate-limit'
import { getAdminCustomersData, type AdminCustomersFilter } from '@/lib/admin/queries'
import { requireAdminPermission } from '@/lib/admin/permissions'
import { customerListParamsSchema, zodErrorResponse } from '@/lib/admin/schemas/customers'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await requireAdminPermission('customers.view')
  if ('response' in auth) return auth.response

  const rateLimit = await rateLimitResponse(request, {
    prefix: 'admin_customers_get',
    windowSeconds: 60,
    maxRequests: 120,
    userId: auth.user.id,
  })

  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const parsed = customerListParamsSchema.safeParse(Object.fromEntries(searchParams.entries()))

  if (!parsed.success) {
    return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 })
  }

  const params = parsed.data

  const filter: AdminCustomersFilter = {
    query: params.query || undefined,
    status: params.status,
    signupMethod: params.signupMethod,
    sortBy: params.sortBy ?? 'created_at',
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  }

  const page = params.page ?? 1
  const limit = params.limit ?? 50

  try {
    const result = await getAdminCustomersData(page, limit, filter)
    return NextResponse.json({ customers: result.customers, total: result.total, page, limit, filter })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}