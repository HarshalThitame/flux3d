import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function requireAdminRequest() {
  const supabase = await createServerSupabaseClient()

  // getSession() reads cookies locally — no network call, no token refresh.
  // Session refresh is handled by the proxy, which runs before Route Handlers.
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  const sessionUser = sessionData?.session?.user

  if (sessionError) {
    return { response: NextResponse.json({ error: sessionError.message }, { status: 401 }) }
  }

  if (sessionUser) {
    // Session exists locally — trust the signed session cookie for identity.
    // The Supabase SSR cookie is securely signed; an additional getUser()
    // network call is not required and would only trigger unnecessary token
    // refresh that can fail if the refresh token was already rotated.
    const { data: profile, error: profileError } = await supabase
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

  // No session at all — fall back to getUser() for the edge case where
  // the proxy hasn't run yet (e.g., first request after login redirect)
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    if (error.code === 'refresh_token_not_found') {
      return { response: NextResponse.json({ error: 'Session expired' }, { status: 401 }) }
    }
    return { response: NextResponse.json({ error: error.message }, { status: 401 }) }
  }

  const user = data.user
  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await supabase
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
