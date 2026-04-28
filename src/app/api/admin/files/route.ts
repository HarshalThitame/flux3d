import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { getAdminFilesData } from '@/lib/admin/queries'
import { requireAdminRequest } from '@/lib/admin/request'

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const data = await getAdminFilesData()
    return NextResponse.json({ files: data })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
