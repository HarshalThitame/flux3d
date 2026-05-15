import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import {
  getAdminOfferById,
  updateAdminOffer,
  deleteAdminOffer,
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
    const offer = await getAdminOfferById(id)
    return NextResponse.json({ data: offer })
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
    const oldOffer = await getAdminOfferById(id)
    const offer = await updateAdminOffer(id, body)
    await logAdminAction({
      admin_id: auth.user.id,
      action: 'update_offer',
      target_type: 'coupon',
      target_id: id,
      old_value: oldOffer as Record<string, unknown>,
      new_value: offer as Record<string, unknown>,
    })
    return NextResponse.json({ data: offer })
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
    const oldOffer = await getAdminOfferById(id)
    await deleteAdminOffer(id)
    await logAdminAction({
      admin_id: auth.user.id,
      action: 'delete_offer',
      target_type: 'coupon',
      target_id: id,
      old_value: oldOffer as Record<string, unknown>,
      new_value: null,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
