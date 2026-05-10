import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { getAdminRedemptionStats, getAdminRedemptionsData } from '@/lib/admin/queries'
import { getAdminApiErrorResponse } from '@/lib/admin/api'

export async function GET() {
  const auth = await requireAdminRequest()
  if (auth.response) return auth.response

  try {
    const stats = await getAdminRedemptionStats()
    const recent = await getAdminRedemptionsData(20)
    return NextResponse.json({ ...stats, recent })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
