'use client'

import { useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type OAuthProvider = 'google'

type OAuthButtonProps = {
  nextPath: string
  provider?: OAuthProvider
}

const providerConfig = {
  google: {
    label: 'Continue with Google',
    loadingLabel: 'Redirecting to Google...',
    icon: <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#050810]">G</span>,
  },
}

export default function OAuthButton({ nextPath, provider = 'google' }: OAuthButtonProps) {
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
      className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {config.icon}
      {loading ? config.loadingLabel : config.label}
    </button>
  )
}
