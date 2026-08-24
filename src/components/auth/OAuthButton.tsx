'use client'

import { useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type OAuthButtonProps = {
  nextPath: string
  className?: string
}

export default function OAuthButton({
  nextPath,
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
      onClick={handleOAuthLogin}
      disabled={loading}
      className={`inline-flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 shadow-[var(--shadow-soft)] transition hover:border-[#6d28d9]/25 hover:bg-[#f5f3ff] hover:text-[#4c1d95] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#4285F4] shadow-sm">
        G
      </span>
      {loading ? 'Redirecting to Google...' : 'Continue with Google'}
    </button>
  )
}
