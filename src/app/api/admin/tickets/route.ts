import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { getAdminTicketsData } from '@/lib/admin/queries'
import { requireAdminRequest } from '@/lib/admin/request'

export async function GET(req: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined
    const source = searchParams.get('source') || undefined
    const sort = searchParams.get('sort') || 'last_message_at'

    const data = await getAdminTicketsData({ status, source, sort })
    return NextResponse.json({ tickets: data })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
