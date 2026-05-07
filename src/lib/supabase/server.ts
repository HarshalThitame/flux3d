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
            // Server Components cannot always write cookies during render.
          }
        },
      },
    }
  )
}
