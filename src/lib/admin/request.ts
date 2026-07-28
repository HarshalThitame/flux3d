import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export async function requireAdminRequest() {
  // Reuse the shared server client so cookieOptions (path, maxAge, sameSite,
  // httpOnly) stay in sync with the proxy. Mismatched options cause mobile
  // browsers to drop refreshed tokens, leading to 401 / forced logout.
  const supabase = await createServerSupabaseClient()

  // Use getUser() to authenticate by contacting the Supabase Auth server.
  // This validates the JWT and refreshes the token if needed.
  let user = null
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (userData?.user) {
      user = userData.user
    }
  } catch {
    // getUser() failed — token is invalid or missing
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
