import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { getAdminUsersData } from '@/lib/admin/queries'
import { requireAdminRequest } from '@/lib/admin/request'

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const data = await getAdminUsersData()
    return NextResponse.json({ users: data })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
