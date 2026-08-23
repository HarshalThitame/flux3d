import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { normalizeNextPath } from '@/lib/auth/redirect'
import { upsertProfileForUser } from '@/lib/auth/profile'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/config'
import { createAdminClient } from '@/lib/supabase/admin'
import { retireSyntheticWhatsappUser } from '@/lib/account-linking/merge'
import { claimGuestOrdersForUser } from '@/lib/shop/claim-guest-orders'

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

  // Google verified the email, so the Google account is the person's active
  // account — attribute the WhatsApp orders to it (not to the old account).
  const waPhone = waProfile.phone_canonical ?? waProfile.phone ?? waProfile.phone_number ?? ''
  const { data: mergeResult, error: mergeError } = await admin
    .rpc('account_linking_merge_to_user', {
      p_target_user_id: user.id,
      p_phone: waPhone,
    })
    .then((r) => ({ data: r.data, error: r.error }))

  if (mergeError) {
    console.error('[auto-link] merge failed:', mergeError.message)
  }

  const ordersAttributed = (mergeResult as { orders_attributed: number } | null)?.orders_attributed ?? 0
  if (ordersAttributed > 0) {
    console.log(`[auto-link] attributed ${ordersAttributed} orders to Google user ${user.id}`)
  }

  await admin.from('profiles').update({
    phone: waProfile.phone,
    phone_number: waProfile.phone_number,
    phone_verified: true,
    whatsapp_opt_in: true,
    whatsapp_opt_in_at: new Date().toISOString(),
    phone_canonical: waProfile.phone_canonical,
  }).eq('id', user.id)

  // The old account no longer claims the WhatsApp number, so the Google
  // account stays the sole owner of the phone (re-linking from the Google
  // account must not trip the "already linked to a different account" check).
  await admin.from('profiles').update({
    phone_verified: false,
    whatsapp_opt_in: false,
    whatsapp_opt_in_at: null,
    phone_canonical: null,
  }).eq('id', waProfile.id)

  // Retire any synthetic WhatsApp customer (wa+<phone>@flux3d.in) whose
  // orders were just attributed to the Google account.
  if (waPhone) {
    await retireSyntheticWhatsappUser(user.id, waPhone).catch((err) => {
      console.error('[auto-link] synthetic retirement failed:', err)
    })
  }
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

      // Claim any guest orders awaiting this account (silent email match at
      // checkout set claim_candidate_user_id). Authenticated now = inbox proven.
      try {
        const claimed = await claimGuestOrdersForUser(user.id)
        if (claimed > 0) {
          console.log(`[guest-claim] attached ${claimed} guest order(s) to user ${user.id}`)
        }
      } catch {
        // Do not block login if claiming fails; it can be retried lazily.
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
