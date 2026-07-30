'use client'

import { useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type OAuthProvider = 'google' | 'facebook'

type OAuthButtonProps = {
  nextPath: string
  provider?: OAuthProvider
  className?: string
}

const providerConfig: Record<OAuthProvider, { label: string; loadingLabel: string; icon: React.ReactNode }> = {
  google: {
    label: 'Continue with Google',
    loadingLabel: 'Redirecting to Google...',
    icon: (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#4285F4] shadow-sm">
        G
      </span>
    ),
  },
  facebook: {
    label: 'Continue with Facebook',
    loadingLabel: 'Redirecting to Facebook...',
    icon: (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1877F2] text-[11px] font-bold text-white shadow-sm">
        f
      </span>
    ),
  },
}

export default function OAuthButton({
  nextPath,
  provider = 'google',
  className = '',
}: OAuthButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleOAuthLogin = async () => {
    setLoading(true)

    const supabase = getSupabaseBrowserClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      nextPath
    )}`

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        ...(provider === 'google' && {
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }),
      },
    })

    if (error) {
      setLoading(false)
      window.alert(error.message)
    }
  }

  const config = providerConfig[provider]

  return (
    <button
      type="button"
      onClick={handleOAuthLogin}
      disabled={loading}
      className={`inline-flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-white/12 bg-white/[0.075] px-4 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-white/22 hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {config.icon}
      {loading ? config.loadingLabel : config.label}
    </button>
  )
}
