import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import {
  getAdminCouponById,
  updateAdminCoupon,
  deleteAdminCoupon,
} from '@/lib/admin/queries'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { logAdminAction } from '@/lib/admin/auditLog'

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
    const oldCoupon = await getAdminCouponById(id)
    const coupon = await updateAdminCoupon(id, body)
    await logAdminAction({
      admin_id: auth.user.id,
      action: 'update_coupon',
      target_type: 'coupon',
      target_id: id,
      old_value: oldCoupon as Record<string, unknown>,
      new_value: coupon as Record<string, unknown>,
    })
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
    const oldCoupon = await getAdminCouponById(id)
    await deleteAdminCoupon(id)
    await logAdminAction({
      admin_id: auth.user.id,
      action: 'delete_coupon',
      target_type: 'coupon',
      target_id: id,
      old_value: oldCoupon as Record<string, unknown>,
      new_value: null,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
