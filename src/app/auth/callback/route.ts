import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { normalizeNextPath } from '@/lib/auth/redirect'
import { upsertProfileForUser } from '@/lib/auth/profile'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/config'
import { createAdminClient } from '@/lib/supabase/admin'

function isGoogleSignIn(user: { identities?: Array<{ provider?: string }> }): boolean {
  return user.identities?.some((id) => id.provider === 'google') ?? false
}

async function autoLinkGoogleToWhatsApp(supabase: ReturnType<typeof createServerClient>, user: { id: string; email?: string | null }) {
  if (!user.email) return

  const { data: waProfile } = await supabase
    .from('profiles')
    .select('id, phone, phone_number, phone_verified, whatsapp_opt_in, phone_canonical')
    .eq('email', user.email)
    .eq('phone_verified', true)
    .eq('whatsapp_opt_in', true)
    .neq('id', user.id)
    .maybeSingle()

  if (!waProfile) return

  const admin = createAdminClient()

  const { data: mergeResult, error: mergeError } = await admin
    .rpc('account_linking_merge_to_user', {
      p_target_user_id: waProfile.id,
      p_phone: waProfile.phone_canonical ?? waProfile.phone ?? waProfile.phone_number ?? '',
    })
    .then((r) => ({ data: r.data, error: r.error }))

  if (mergeError) {
    console.error('[auto-link] merge failed:', mergeError.message)
  }

  const ordersAttributed = (mergeResult as { orders_attributed: number } | null)?.orders_attributed ?? 0
  if (ordersAttributed > 0) {
    console.log(`[auto-link] attributed ${ordersAttributed} orders from Google user ${user.id} to WhatsApp-linked user ${waProfile.id}`)
  }

  await admin.from('profiles').update({
    phone: waProfile.phone,
    phone_number: waProfile.phone_number,
    phone_verified: true,
    whatsapp_opt_in: true,
    whatsapp_opt_in_at: new Date().toISOString(),
    phone_canonical: waProfile.phone_canonical,
  }).eq('id', user.id)
}

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

      if (isGoogleSignIn(user)) {
        try {
          await autoLinkGoogleToWhatsApp(supabase, user)
        } catch {
          // Do not block login if auto-link fails
        }
      }
    }
  } catch {
    return NextResponse.redirect(new URL(`/login?error=auth_callback_failed`, requestUrl.origin))
  }

  return response
}
