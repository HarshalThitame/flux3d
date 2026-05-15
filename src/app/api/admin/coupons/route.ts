import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminCoupon, getAdminCouponsData } from '@/lib/admin/queries'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { logAdminAction } from '@/lib/admin/auditLog'

export async function GET() {
  const auth = await requireAdminRequest()
  if (auth.response) return auth.response

  try {
    const { data, count } = await getAdminCouponsData()
    return NextResponse.json({ data, count })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest()
  if (auth.response) return auth.response

  try {
    const body = await request.json()
    const coupon = await createAdminCoupon(body)
    await logAdminAction({
      admin_id: auth.user.id,
      action: 'create_coupon',
      target_type: 'coupon',
      target_id: coupon.id,
      old_value: null,
      new_value: coupon,
    })
    return NextResponse.json({ data: coupon }, { status: 201 })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
