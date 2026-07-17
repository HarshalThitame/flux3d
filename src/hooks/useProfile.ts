'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppUserProfile } from '@/lib/auth/server'
import type { ProfileRow } from '../../types/database'

export type ClientProfile = AppUserProfile & {
  fullName: string
  phoneNumber: string | null
  status: ProfileRow['status']
  emailVerified: boolean
  lastSignInAt: string | null
  referralCode: string | null
}

type UseProfileResult = {
  profile: ClientProfile | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

type UseProfileOptions = {
  enabled?: boolean
}

function mapProfile(userId: string, userEmail: string, metadata: Record<string, unknown>, row: Partial<ProfileRow> | null): ClientProfile {
  const fullName =
    row?.full_name ??
    (typeof metadata.full_name === 'string'
      ? metadata.full_name
      : typeof metadata.name === 'string'
        ? metadata.name
        : userEmail.split('@')[0] || 'Flux3D User')
  const avatarUrl =
    row?.avatar_url ??
    (typeof metadata.avatar_url === 'string'
      ? metadata.avatar_url
      : typeof metadata.picture === 'string'
        ? metadata.picture
        : null)

  return {
    id: userId,
    email: row?.email ?? userEmail,
    name: fullName,
    fullName,
    phoneNumber: row?.phone_number ?? null,
    avatarUrl,
    createdAt: row?.created_at ?? null,
    isAdmin: Boolean(row?.is_admin),
    status: row?.status ?? 'unverified',
    emailVerified: Boolean(row?.email_verified),
    lastSignInAt: row?.last_sign_in_at ?? null,
    referralCode: row?.referral_code ?? null,
  }
}

export function useProfile(
  initialProfile: AppUserProfile | null = null,
  options: UseProfileOptions = {}
): UseProfileResult {
  const enabled = options.enabled ?? true
  const initialProfileRef = useRef(initialProfile)
  const [profile, setProfile] = useState<ClientProfile | null>(
    initialProfile
      ? {
          ...initialProfile,
          fullName: initialProfile.name,
          phoneNumber: null,
          status: 'unverified',
          emailVerified: false,
          lastSignInAt: null,
          referralCode: null,
        }
      : null
  )
  const [loading, setLoading] = useState(initialProfile === null && enabled)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { getSupabaseBrowserClient } = await import('@/lib/supabase/client')
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
        setProfile(null)
        return
      }

      const emailVerified = Boolean(user.email_confirmed_at)
      const lastSignInAt = user.last_sign_in_at ?? null
      const { data: row, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone_number, avatar_url, status, email_verified, last_sign_in_at, is_admin, referral_code, created_at')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) throw profileError

      const needsSync =
        row &&
        (row.email_verified !== emailVerified ||
          (lastSignInAt && row.last_sign_in_at !== lastSignInAt))

      if (needsSync) {
        await supabase
          .from('profiles')
          .update({
            email_verified: emailVerified,
            last_sign_in_at: lastSignInAt,
            status: emailVerified && row.status === 'unverified' ? 'active' : row.status,
          })
          .eq('id', user.id)
      }

      setProfile(mapProfile(user.id, user.email ?? '', user.user_metadata, {
        ...(row ?? {}),
        email_verified: emailVerified,
        last_sign_in_at: lastSignInAt,
        status: emailVerified && row?.status === 'unverified' ? 'active' : row?.status,
      }))
    } catch (profileError) {
      setProfile(null)
      setError(profileError instanceof Error ? profileError.message : 'Failed to load profile.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialProfileRef.current) return
    if (!enabled) return
    const timeoutId = window.setTimeout(() => {
      void loadProfile()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [enabled, loadProfile])

  return { profile, loading, error, refetch: loadProfile }
}
