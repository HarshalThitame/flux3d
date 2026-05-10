import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import {
  getAdminCouponById,
  updateAdminCoupon,
  deleteAdminCoupon,
} from '@/lib/admin/queries'
import { getAdminApiErrorResponse } from '@/lib/admin/api'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRequest()
  if (auth.response) return auth.response

  try {
    const { id } = await params
    const coupon = await getAdminCouponById(id)
    return NextResponse.json({ data: coupon })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRequest()
  if (auth.response) return auth.response

  try {
    const { id } = await params
    const body = await request.json()
    const coupon = await updateAdminCoupon(id, body)
    return NextResponse.json({ data: coupon })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRequest()
  if (auth.response) return auth.response

  try {
    const { id } = await params
    await deleteAdminCoupon(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
