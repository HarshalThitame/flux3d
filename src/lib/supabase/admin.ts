import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/supabase/config'

let cachedAdminClient: SupabaseClient | null = null

function fetchWithTimeout(url: RequestInfo | URL, options?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timeout))
}

export function createAdminClient(): SupabaseClient {
  if (cachedAdminClient) return cachedAdminClient
  cachedAdminClient = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: fetchWithTimeout,
    },
  })
  return cachedAdminClient
}
