'use client'

import { useEffect } from 'react'
import type { AuthChangeEvent, Session, Subscription } from '@supabase/supabase-js'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { endTrackedSession, initSessionTracker, updateTrackedSessionUser } from '@/lib/tracking/sessionTracker'

export default function SessionTracker() {
  useEffect(() => {
    let authSubscription: Subscription | undefined
    const sessionId = initSessionTracker(null)

    const cleanup = () => {
      if (!sessionId) return
      endTrackedSession(sessionId)
    }

    async function start() {
      if (!sessionId) return

      try {
        const supabase = getSupabaseBrowserClient()
        const { data: userData } = await supabase.auth.getUser()
        if (userData.user?.id) {
          updateTrackedSessionUser(sessionId, userData.user.id)
        }
        const { data: authData } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
          updateTrackedSessionUser(sessionId, session?.user.id ?? null)
        })
        authSubscription = authData.subscription
      } catch {
        // Anonymous session tracking has already started; auth linking is best effort.
      }
    }

    void start()

    return () => {
      authSubscription?.unsubscribe()
      cleanup?.()
    }
  }, [])

  return null
}
