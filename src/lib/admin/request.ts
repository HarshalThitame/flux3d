import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/config'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export async function requireAdminRequest() {
  const cookieStore = await cookies()

  // The proxy may have refreshed the token, but its cookie updates may not
  // propagate to the API route's request context. We MUST be able to refresh
  // the token ourselves — setAll must actually write cookies.
  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
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
            // Cookie write failed — continue anyway
          }
        },
      },
    }
  )

  // Try getSession() first — if the proxy already refreshed, this will work.
  const { data: sessionData } = await supabase.auth.getSession()
  let user = sessionData?.session?.user

  // If no session (expired or missing), refresh via getUser().
  // This is critical — without it, expired access tokens cause 401.
  if (!user) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user) {
        user = userData.user
      }
    } catch {
      // getUser() failed — token is invalid or missing
    }
  }

  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  // Use the admin client (service role key) for the profile query so
  // it bypasses RLS and does not need a valid JWT. This prevents the
  // check from failing when the access token has naturally expired.
  const adminSupabase = createAdminSupabaseClient()
  const { data: profile, error: profileError } = await adminSupabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return { response: NextResponse.json({ error: profileError.message }, { status: 500 }) }
  }

  if (!profile?.is_admin) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { supabase, user }
}
