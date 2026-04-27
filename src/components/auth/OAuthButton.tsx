'use client'

import { useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type OAuthButtonProps = {
  nextPath: string
}

export default function OAuthButton({ nextPath }: OAuthButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setLoading(true)

    const supabase = getSupabaseBrowserClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      nextPath
    )}`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      setLoading(false)
      window.alert(error.message)
    }
  }

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={loading}
      className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#050810]">
        G
      </span>
      {loading ? 'Redirecting to Google...' : 'Continue with Google'}
    </button>
  )
}
