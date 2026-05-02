import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/config'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
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
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Server Components cannot always write cookies during render.
          }
        },
      },
    }
  )
}
