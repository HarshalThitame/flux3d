import { createBrowserClient } from '@supabase/ssr'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/config'

let browserClient: ReturnType<typeof createBrowserClient> | undefined

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey(), {
      auth: {
        // Enabled so the browser can recover an expired access token on its
        // own when the proxy misses a refresh (common on mobile/PWA).
        autoRefreshToken: true,
        persistSession: true,
      },
    })
  }

  return browserClient
}
