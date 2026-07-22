import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { normalizeNextPath } from '@/lib/auth/redirect'
import { upsertProfileForUser } from '@/lib/auth/profile'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/config'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextPath = normalizeNextPath(requestUrl.searchParams.get('next'))

  if (!code) {
    return NextResponse.redirect(new URL(`/login?error=missing_code`, request.url))
  }

  const redirectUrl = new URL(nextPath, requestUrl.origin)
  const response = NextResponse.redirect(redirectUrl)

  try {
    const supabase = createServerClient(
      getSupabaseUrl(),
      getSupabasePublishableKey(),
      {
        cookieOptions: {
          path: '/',
          maxAge: 400 * 24 * 60 * 60,
          sameSite: 'lax',
        },
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      return NextResponse.redirect(new URL(`/login?error=auth_callback_failed`, requestUrl.origin))
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError && userError.code !== 'refresh_token_not_found') {
      return NextResponse.redirect(new URL(`/login?error=auth_callback_failed`, requestUrl.origin))
    }

    if (user) {
      try {
        await upsertProfileForUser(supabase, user)
      } catch {
        // Do not block login if profile sync fails; downstream code can recover.
      }
    }
  } catch {
    return NextResponse.redirect(new URL(`/login?error=auth_callback_failed`, requestUrl.origin))
  }

  return response
}
