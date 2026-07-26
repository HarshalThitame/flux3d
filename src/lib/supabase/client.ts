import { createBrowserClient } from '@supabase/ssr'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/config'

let browserClient: ReturnType<typeof createBrowserClient> | undefined

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey(), {
      auth: {
        autoRefreshToken: false,
        persistSession: true,
      },
    })
  }

  return browserClient
}
