import { NextResponse } from 'next/server'
import { rateLimitResponse } from '@/lib/rate-limit'
import { setCustomerSuspended } from '@/lib/admin/queries'
import { requireAdminPermission } from '@/lib/admin/permissions'
import { logAdminAction } from '@/lib/admin/auditLog'
import { bulkCustomerActionSchema, zodErrorResponse } from '@/lib/admin/schemas/customers'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const auth = await requireAdminPermission('customers.suspend')
  if ('response' in auth) return auth.response

  const rateLimit = await rateLimitResponse(request, {
    prefix: 'admin_customers_bulk',
    windowSeconds: 60,
    maxRequests: 10,
    userId: auth.user.id,
  })

  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const parsed = bulkCustomerActionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 })
  }

  const { userIds, action } = parsed.data
  const updates: Array<{ userId: string; updated: boolean; error?: string }> = []
  let updatedCount = 0
  let failedCount = 0

  for (const userId of userIds) {
    try {
      const suspended = action === 'suspend'
      await setCustomerSuspended(userId, suspended)
      updates.push({ userId, updated: true })
      updatedCount++

      await logAdminAction({
        admin_id: auth.user.id,
        action: suspended ? 'suspend_customer' : 'reactivate_customer',
        target_type: 'user',
        target_id: userId,
        new_value: { suspended },
      })
    } catch (error) {
      updates.push({
        userId,
        updated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      failedCount++
    }
  }

  return NextResponse.json({ updates, updatedCount, failedCount })
}