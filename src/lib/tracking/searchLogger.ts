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

export async function logSearch(
  user_id: string | null,
  search_term: string | null,
  filters_applied: unknown = {},
  results_count = 0
) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('search_logs').insert({
      user_id,
      search_term: search_term?.slice(0, 256) ?? null,
      filters_applied: normalizeJson(filters_applied),
      results_count,
    })

    if (error) throw error
  } catch (error) {
    reportError(error, 'Failed to record search log', {
      module: 'tracking',
      level: 'warn',
      tags: { searchTerm: search_term?.slice(0, 100) ?? 'null' },
    })
  }
}
