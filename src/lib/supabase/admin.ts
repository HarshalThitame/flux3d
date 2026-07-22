import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/supabase/config'

let cachedAdminClient: SupabaseClient | null = null

export function createAdminClient(): SupabaseClient {
  if (cachedAdminClient) return cachedAdminClient
  cachedAdminClient = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  return cachedAdminClient
}
