import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminOffer, getAdminOffersData } from '@/lib/admin/queries'
import { getAdminApiErrorResponse } from '@/lib/admin/api'

export async function GET() {
  const auth = await requireAdminRequest()
  if (auth.response) return auth.response

  try {
    const { data, count } = await getAdminOffersData()
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
    const offer = await createAdminOffer(body)
    return NextResponse.json({ data: offer }, { status: 201 })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
