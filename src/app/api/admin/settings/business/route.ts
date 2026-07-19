import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import {
  getBusinessSettings,
  upsertBusinessSettings,
  maskBusinessSettingsSecrets,
  stripMaskedSecretUpdates,
  type BusinessSettings,
} from '@/lib/admin/business-settings'
import { logAdminAction } from '@/lib/admin/auditLog'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const settings = await getBusinessSettings()
    return NextResponse.json({
      settings: settings ? maskBusinessSettingsSecrets(settings) : settings,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = (await request.json()) as Partial<BusinessSettings>
    const safeUpdates = stripMaskedSecretUpdates(body)
    const oldSettings = await getBusinessSettings()
    const settings = await upsertBusinessSettings(safeUpdates)
    await logAdminAction({
      admin_id: auth.user.id,
      action: 'update_business_settings',
      target_type: 'setting',
      target_id: 'business_settings',
      old_value: oldSettings ? (maskBusinessSettingsSecrets(oldSettings) as Record<string, unknown>) : {},
      new_value: maskBusinessSettingsSecrets(settings) as Record<string, unknown>,
    })
    return NextResponse.json({
      settings: maskBusinessSettingsSecrets(settings),
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
