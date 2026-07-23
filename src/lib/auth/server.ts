import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { hasSupabaseConfig } from '@/lib/supabase/config'
import { normalizeNextPath } from '@/lib/auth/redirect'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export type AppUserProfile = {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  createdAt: string | null
  isAdmin: boolean
}

export async function getCurrentUserProfile() {
  if (!hasSupabaseConfig()) {
    return null
  }

  const supabase = await createServerSupabaseClient()

  // Use getSession() first — it reads cookies locally without HTTP request.
  // This avoids the token refresh race condition and setAll cookie write failure
  // that occurs in Server Components when getUser() triggers a refresh.
  let user = null
  const { data: sessionData } = await supabase.auth.getSession()
  if (sessionData?.session?.user) {
    user = sessionData.session.user
  }

  // Fall back to getUser() only if session is missing (not just expired)
  if (!user) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const { data } = await supabase.auth.getUser()
        user = data.user
        break
      } catch {
        if (attempt === 2) return null
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }
  }

  if (!user) {
    return null
  }

  // Use admin client to bypass RLS — the profiles query must work even when the
  // user session's JWT is expired. `getSession()` above already validated the user
  // is authenticated, so it's safe to read their profile with elevated privileges.
  const adminSupabase = createAdminSupabaseClient()
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('id, name, full_name, email, avatar_url, created_at, is_admin')
    .eq('id', user.id)
    .maybeSingle()

  return {
    user,
    profile: {
      id: user.id,
      email: profile?.email ?? user.email ?? '',
      name:
        profile?.full_name ??
        profile?.name ??
        (typeof user.user_metadata.full_name === 'string'
          ? user.user_metadata.full_name
          : typeof user.user_metadata.name === 'string'
            ? user.user_metadata.name
            : user.email?.split('@')[0] ?? 'Flux3D User'),
      avatarUrl:
        profile?.avatar_url ??
        (typeof user.user_metadata.avatar_url === 'string'
          ? user.user_metadata.avatar_url
          : typeof user.user_metadata.picture === 'string'
          ? user.user_metadata.picture
          : null),
      createdAt: profile?.created_at ?? null,
      isAdmin: Boolean(profile?.is_admin),
    } satisfies AppUserProfile,
  }
}

export async function requireUser(nextPath: string) {
  const auth = await getCurrentUserProfile()

  if (!auth) {
    redirect(`/login?next=${encodeURIComponent(normalizeNextPath(nextPath))}`)
  }

  return auth
}
