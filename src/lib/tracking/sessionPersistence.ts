import { createAdminClient } from '@/lib/supabase/admin'
import { reportError } from '@/lib/error-handling'
import type { DeviceType } from '../../../types/database'

export type StartSessionParams = {
  user_id?: string | null
  session_id: string
  ip_address?: string | null
  device_type?: DeviceType | null
  browser?: string | null
  os?: string | null
  country?: string | null
  city?: string | null
}

export async function persistSessionStart(params: StartSessionParams) {
  try {
    if (!params.session_id) return
    const supabase = createAdminClient()

    const { data: existing, error: existingError } = await supabase
      .from('user_sessions')
      .select('id, user_id, ip_address, device_type, browser, os, country, city')
      .eq('session_id', params.session_id)
      .maybeSingle()

    if (existingError) throw existingError

    if (existing) {
      const { error } = await supabase
        .from('user_sessions')
        .update({
          user_id: params.user_id ?? existing.user_id ?? null,
          ip_address: params.ip_address ?? existing.ip_address ?? null,
          device_type: params.device_type ?? existing.device_type ?? null,
          browser: params.browser ?? existing.browser ?? null,
          os: params.os ?? existing.os ?? null,
          country: params.country ?? existing.country ?? null,
          city: params.city ?? existing.city ?? null,
          ended_at: null,
          duration_seconds: null,
        })
        .eq('session_id', params.session_id)

      if (error) throw error
      return
    }

    const { error } = await supabase.from('user_sessions').insert({
      user_id: params.user_id ?? null,
      session_id: params.session_id,
      ip_address: params.ip_address ?? null,
      device_type: params.device_type ?? null,
      browser: params.browser ?? null,
      os: params.os ?? null,
      country: params.country ?? null,
      city: params.city ?? null,
      started_at: new Date().toISOString(),
    })

    if (error) throw error
  } catch (error) {
    reportError(error, 'Failed to start session', {
      module: 'tracking',
      level: 'warn',
      tags: { sessionId: params.session_id?.slice(0, 40) ?? 'unknown' },
    })
  }
}

export async function persistSessionEnd(sessionId: string) {
  try {
    if (!sessionId) return
    const supabase = createAdminClient()
    const { data, error: selectError } = await supabase
      .from('user_sessions')
      .select('started_at')
      .eq('session_id', sessionId)
      .maybeSingle()

    if (selectError) throw selectError

    const endedAt = new Date()
    const startedAt = data?.started_at ? new Date(data.started_at) : endedAt
    const durationSeconds = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000))

    const { error: updateError } = await supabase
      .from('user_sessions')
      .update({
        ended_at: endedAt.toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq('session_id', sessionId)

    if (updateError) throw updateError
  } catch (error) {
    reportError(error, 'Failed to end session', {
      module: 'tracking',
      level: 'warn',
      tags: { sessionId: sessionId?.slice(0, 40) ?? 'unknown' },
    })
  }
}
