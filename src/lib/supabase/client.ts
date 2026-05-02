import { createBrowserClient } from '@supabase/ssr'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/config'

let browserClient: ReturnType<typeof createBrowserClient> | undefined

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey(), {
      auth: {
        logger: {
          error: (message: string, ...args: unknown[]) => {
            if (
              typeof message === 'string' &&
              (message.includes('refresh_token_not_found') ||
                message.includes('Invalid Refresh Token'))
            ) {
              return
            }
            console.error(message, ...args)
          },
          warn: (message: string, ...args: unknown[]) => {
            if (
              typeof message === 'string' &&
              (message.includes('refresh_token_not_found') ||
                message.includes('Invalid Refresh Token'))
            ) {
              return
            }
            console.warn(message, ...args)
          },
          info: console.info,
          debug: console.debug,
        },
      },
    })
  }

  return browserClient
}
