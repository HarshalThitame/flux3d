import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { hasSupabaseConfig } from '@/lib/supabase/config'
import { normalizeNextPath } from '@/lib/auth/redirect'

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
  let user = null
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

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
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
