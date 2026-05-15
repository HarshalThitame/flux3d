import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { getBusinessSettings, upsertBusinessSettings, type BusinessSettings } from '@/lib/admin/business-settings'
import { invalidateSettingsCache } from '@/lib/settings'
import { logAdminAction } from '@/lib/admin/auditLog'

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
    const body = (await request.json()) as Partial<BusinessSettings>
    const oldSettings = await getBusinessSettings()
    const settings = await upsertBusinessSettings(body)
    invalidateSettingsCache()
    await logAdminAction({
      admin_id: auth.user.id,
      action: 'update_business_settings',
      target_type: 'setting',
      target_id: 'business_settings',
      old_value: oldSettings as Record<string, unknown>,
      new_value: settings as Record<string, unknown>,
    })
    return NextResponse.json({ settings })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
