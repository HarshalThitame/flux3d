'use client'

import { useEffect, useRef, useState } from 'react'
import type { AppUserProfile } from '@/lib/auth/server'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type UseProfileResult = {
  profile: AppUserProfile | null
  loading: boolean
}

export function useProfile(initialProfile: AppUserProfile | null = null): UseProfileResult {
  const initialProfileRef = useRef(initialProfile)
  const [profile, setProfile] = useState<AppUserProfile | null>(initialProfile)
  const [loading, setLoading] = useState(initialProfile === null)

  useEffect(() => {
    if (initialProfileRef.current) {
      return
    }

    let cancelled = false

    async function loadProfile() {
      try {
        const supabase = getSupabaseBrowserClient()
        const { data: authData, error: authError } = await supabase.auth.getUser()

        if (authError) {
          if (authError.code === 'refresh_token_not_found') {
            await supabase.auth.signOut({ scope: 'local' })
          }
          throw authError
        }

        const user = authData.user

        if (!user) {
          if (!cancelled) {
            setProfile(null)
            setLoading(false)
          }
          return
        }

        const { data: row, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, email, avatar_url, created_at, role')
          .eq('id', user.id)
          .maybeSingle()

        if (profileError) {
          throw profileError
        }

        if (!cancelled) {
          setProfile({
            id: user.id,
            email: row?.email ?? user.email ?? '',
            name:
              row?.name ??
              (typeof user.user_metadata.full_name === 'string'
                ? user.user_metadata.full_name
                : typeof user.user_metadata.name === 'string'
                  ? user.user_metadata.name
                  : user.email?.split('@')[0] ?? 'Flux3D User'),
            avatarUrl:
              row?.avatar_url ??
              (typeof user.user_metadata.avatar_url === 'string'
                ? user.user_metadata.avatar_url
                : typeof user.user_metadata.picture === 'string'
                  ? user.user_metadata.picture
                  : null),
            createdAt: row?.created_at ?? null,
            role: row?.role === 'admin' ? 'admin' : 'user',
          })
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setProfile(null)
          setLoading(false)
        }
      }
    }

    void loadProfile()

    return () => {
      cancelled = true
    }
  }, [])

  return { profile, loading }
}
