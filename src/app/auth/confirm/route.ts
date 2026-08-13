import { createServerClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { normalizeNextPath } from '@/lib/auth/redirect'
import { upsertProfileForUser } from '@/lib/auth/profile'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/config'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null
  const nextPath = normalizeNextPath(
    requestUrl.searchParams.get('next'),
    '/auth/update-password'
  )

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL(`/login?error=missing_code`, requestUrl.origin))
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

    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    })

    if (error) {
      // The OTP is single-use and expires after 1 hour (enforced by GoTrue).
      // A failure here means the link was already used or is expired — point
      // recovery users back to the reset request flow.
      return NextResponse.redirect(
        new URL(
          type === 'recovery'
            ? '/login?error=session_required'
            : '/login?error=auth_callback_failed',
          requestUrl.origin
        )
      )
    }

    if (data.user) {
      try {
        await upsertProfileForUser(supabase, data.user)
      } catch {
        // Do not block the flow if profile sync fails; downstream code can recover.
      }
    }
  } catch {
    return NextResponse.redirect(new URL(`/login?error=auth_callback_failed`, requestUrl.origin))
  }

  return response
}
