import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { DASHBOARD_RANGE_DAYS, getAdminDashboardData, type DashboardRangeDays } from '@/lib/admin/queries'
import { requireAdminRequest } from '@/lib/admin/request'

export async function GET(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const requestedDays = Number(searchParams.get('days') ?? 30)
    const days: DashboardRangeDays = DASHBOARD_RANGE_DAYS.includes(requestedDays as DashboardRangeDays)
      ? (requestedDays as DashboardRangeDays)
      : 30
    const data = await getAdminDashboardData(days)
    return NextResponse.json(data)
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
