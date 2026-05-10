import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import {
  getAdminOfferById,
  updateAdminOffer,
  deleteAdminOffer,
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
    const offer = await updateAdminOffer(id, body)
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
    await deleteAdminOffer(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
