import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/config'
import { createAdminSupabaseClient } from '@/lib/admin/server'

async function createAuthenticatedSupabaseClient() {
  const cookieStore = await cookies()

  let user = null

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
            // Server Components cannot always write cookies during render.
            // This path is triggered during getUser() token refresh.
          }
        },
      },
    }
  )

  // Try getSession() first — it reads cookies locally without HTTP request.
  // This avoids the token refresh race condition.
  const { data: sessionData } = await supabase.auth.getSession()
  if (sessionData?.session?.user) {
    user = sessionData.session.user
  }

  // Fall back to getUser() only if session is missing (not just expired)
  // getUser() triggers token refresh which rotates the refresh token.
  if (!user) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const { data } = await supabase.auth.getUser()
        user = data.user
        break
      } catch {
        if (attempt === 2) return { supabase, user: null }
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }
  }

  return { supabase, user }
}

export async function requireAdminRequest() {
  const { supabase, user } = await createAuthenticatedSupabaseClient()

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
