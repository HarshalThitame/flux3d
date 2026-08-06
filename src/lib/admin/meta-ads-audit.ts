import { createAdminSupabaseClient } from '@/lib/admin/server'
import { logWarn } from '@/lib/logger'

export async function logMetaAdAudit(params: {
  campaignId: string
  action: 'create' | 'toggle' | 'edit_budget' | 'edit_name' | 'edit_targeting' | 'archive' | 'duplicate'
  performedBy: string
  oldValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  metaApiResponse?: Record<string, unknown>
  request?: Request
}) {
  try {
    const supabase = createAdminSupabaseClient()

    const ipAddress = params.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    const userAgent = params.request?.headers.get('user-agent') ?? null

    await supabase.from('meta_ad_campaign_audits').insert({
      campaign_id: params.campaignId,
      action: params.action,
      performed_by: params.performedBy,
      old_value: params.oldValue ?? null,
      new_value: params.newValue ?? null,
      meta_api_response: params.metaApiResponse ?? null,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
  } catch (err) {
    logWarn('Failed to write meta ad audit record', {
      module: 'meta-ads',
      error: err instanceof Error ? err : new Error(String(err)),
    })
  }
}
