import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { getAdminOrdersData, updateAdminOrderStatus } from '@/lib/admin/queries'
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
      orderId?: string
      status?: 'pending' | 'reviewed' | 'approved' | 'printing' | 'completed' | 'rejected'
    }

    if (!body.orderId) {
      return NextResponse.json({ error: 'Order id is required.' }, { status: 400 })
    }

    if (!body.status) {
      return NextResponse.json({ error: 'Status is required.' }, { status: 400 })
    }

    const order = await updateAdminOrderStatus(body.orderId, body.status)
    return NextResponse.json({ order })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
