'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { reportError } from '@/lib/error-handling'
import type { Json } from '../../../types/database'

function normalizeJson(value: unknown): Json {
  if (value === undefined || value === null) {
    return {}
  }

  try {
    return JSON.parse(JSON.stringify(value)) as Json
  } catch {
    return {}
  }
}

export async function trackFeatureUsage(
  user_id: string | null,
  feature_name: string,
  metadata: unknown = {}
) {
  try {
    if (!feature_name.trim()) return
    const supabase = createAdminClient()
    const { error } = await supabase.from('feature_usage').insert({
      user_id,
      feature_name: feature_name.slice(0, 128),
      metadata: normalizeJson(metadata),
    })

    if (error) throw error
  } catch (error) {
    reportError(error, 'Failed to record feature usage', {
      module: 'tracking',
      level: 'warn',
      tags: { feature: feature_name },
    })
  }
}
