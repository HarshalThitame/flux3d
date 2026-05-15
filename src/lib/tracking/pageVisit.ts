'use server'

import { createAdminClient } from '@/lib/supabase/admin'

type TrackPageVisitParams = {
  user_id?: string | null
  session_id: string
  page_url: string
  page_name?: string | null
  referrer_url?: string | null
}

export async function trackPageVisit(params: TrackPageVisitParams) {
  try {
    if (!params.session_id || !params.page_url) return

    const supabase = createAdminClient()
    const { error } = await supabase.from('page_visits').insert({
      user_id: params.user_id ?? null,
      session_id: params.session_id.slice(0, 128),
      page_url: params.page_url.slice(0, 2048),
      page_name: params.page_name?.slice(0, 256) ?? null,
      referrer_url: params.referrer_url?.slice(0, 2048) ?? null,
    })

    if (error) throw error
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[tracking] Failed to record page visit:', error)
    }
  }
}
