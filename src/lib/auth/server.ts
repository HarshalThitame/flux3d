import { cache } from 'react'
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
}

export const getCurrentUserProfile = cache(async () => {
  if (!hasSupabaseConfig()) {
    return null
  }

  const supabase = await createServerSupabaseClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    return null
  }

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, email, avatar_url, created_at')
    .eq('id', user.id)
    .maybeSingle()

  return {
    user,
    profile: {
      id: user.id,
      email: profile?.email ?? user.email ?? '',
      name:
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
    } satisfies AppUserProfile,
  }
})

export async function requireUser(nextPath: string) {
  const auth = await getCurrentUserProfile()

  if (!auth) {
    redirect(`/login?next=${encodeURIComponent(normalizeNextPath(nextPath))}`)
  }

  return auth
}
