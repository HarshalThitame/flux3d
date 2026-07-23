import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/config'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export async function requireAdminRequest() {
  const cookieStore = await cookies()

  // The proxy (src/proxy.ts) runs before this route handler and calls
  // getUser() which refreshes the token and sets fresh cookies.
  // We only need getSession() here — it reads the already-refreshed
  // session without triggering another token refresh.
  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // No-op: the proxy has already handled token refresh and cookie
          // writing. We only need to read the session here.
        },
      },
    }
  )

  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData?.session?.user

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
