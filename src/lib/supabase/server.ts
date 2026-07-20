import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/config'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createSupabaseServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      auth: {
        autoRefreshToken: true,
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
            if (process.env.NODE_ENV === 'development') {
              console.warn('[supabase/server] Failed to set auth cookies — token refresh may not persist')
            }
          }
        },
      },
    }
  )
}

export const createServerClient = createServerSupabaseClient
