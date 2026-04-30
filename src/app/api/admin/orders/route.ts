import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { getAdminOrdersData, updateAdminOrderStatus } from '@/lib/admin/queries'
import { orderStatuses, type OrderStatus } from '@/lib/orders'
import { requireAdminRequest } from '@/lib/admin/request'

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const data = await getAdminOrdersData()
    return NextResponse.json({ orders: data })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = (await request.json()) as {
      groupId?: string
      status?: OrderStatus
    }

    if (!body.groupId) {
      return NextResponse.json({ error: 'Group id is required.' }, { status: 400 })
    }

    if (!body.status) {
      return NextResponse.json({ error: 'Status is required.' }, { status: 400 })
    }

    if (!orderStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
    }

    const order = await updateAdminOrderStatus(body.groupId, body.status)
    return NextResponse.json({ order })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
