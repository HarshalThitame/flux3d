import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { getBusinessSettings, upsertBusinessSettings } from '@/lib/admin/business-settings'
import { invalidateSettingsCache } from '@/lib/settings'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const settings = await getBusinessSettings()
    return NextResponse.json({ settings })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = (await request.json()) as Record<string, unknown>
    const settings = await upsertBusinessSettings(body as any)
    invalidateSettingsCache()
    return NextResponse.json({ settings })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
