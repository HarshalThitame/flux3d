'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export default function AdminLogoutPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        const { error: signOutError } = await supabase.auth.signOut()

        if (signOutError) {
          console.error('[Auth] Failed to sign out', signOutError)
          setError(signOutError.message)
          return
        }

        window.location.replace('/login?next=/admin')
      } catch (err) {
        console.error('[Auth] Unexpected logout error', err)
        setError(err instanceof Error ? err.message : 'Failed to log out.')
      }
    })()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      {error ? (
        <p className="text-sm text-rose-600">Sign-out failed: {error}</p>
      ) : (
        <p className="text-sm text-[#6F7192]">Signing out…</p>
      )}
    </div>
  )
}
