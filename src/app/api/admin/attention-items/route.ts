import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { getAdminAttentionSummary } from '@/lib/admin/queries'
import { requireAdminRequest } from '@/lib/admin/request'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const summary = await getAdminAttentionSummary()
    return NextResponse.json(summary)
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}