import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export async function requireAdminRequest() {
  const supabase = await createServerSupabaseClient()

  // getSession() reads cookies locally — no network call, no token refresh.
  // Never call getUser() — it triggers token refresh which rotates the
  // refresh token. If the browser doesn't receive the new Set-Cookie
  // headers (e.g. during RSC client-side navigation), the old refresh
  // token that the browser still holds will be rejected on the next
  // request, causing a 401 and an involuntary logout.
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  const sessionUser = sessionData?.session?.user

  if (sessionError) {
    return { response: NextResponse.json({ error: sessionError.message }, { status: 401 }) }
  }

  if (!sessionUser) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  // Use the admin client (service role key) for the profile query so
  // it bypasses RLS and does not need a valid JWT. This prevents the
  // check from failing when the access token has naturally expired.
  const adminSupabase = createAdminSupabaseClient()
  const { data: profile, error: profileError } = await adminSupabase
    .from('profiles')
    .select('is_admin')
    .eq('id', sessionUser.id)
    .maybeSingle()

  if (profileError) {
    return { response: NextResponse.json({ error: profileError.message }, { status: 500 }) }
  }

  if (!profile?.is_admin) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { supabase, user: sessionUser }
}
