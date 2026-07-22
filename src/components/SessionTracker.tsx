'use client'

import { useEffect } from 'react'
import type { AuthChangeEvent, Session, Subscription } from '@supabase/supabase-js'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { endTrackedSession, initSessionTracker, updateTrackedSessionUser } from '@/lib/tracking/sessionTracker'

function runWhenIdle(callback: () => void, timeout = 2500) {
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
    cancelIdleCallback?: (id: number) => void
  }

  if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
    const idleId = idleWindow.requestIdleCallback(callback, { timeout })
    return () => idleWindow.cancelIdleCallback?.(idleId)
  }

  const timeoutId = window.setTimeout(callback, Math.min(timeout, 1200))
  return () => window.clearTimeout(timeoutId)
}

export default function SessionTracker() {
  useEffect(() => {
    let authSubscription: Subscription | undefined
    let sessionId = ''

    const cleanup = () => {
      if (!sessionId) return
      endTrackedSession(sessionId)
    }

    async function start() {
      if (!sessionId) return

      try {
        const supabase = getSupabaseBrowserClient()
        const { data: sessionData } = await supabase.auth.getSession()
        const sessionUser = sessionData?.session?.user
        if (sessionUser?.id) {
          updateTrackedSessionUser(sessionId, sessionUser.id)
        }
        const { data: authData } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
          updateTrackedSessionUser(sessionId, session?.user.id ?? null)
        })
        authSubscription = authData.subscription
      } catch {
        // Anonymous session tracking has already started; auth linking is best effort.
      }
    }

    const cancelIdle = runWhenIdle(() => {
      sessionId = initSessionTracker(null)
      void start()
    })

    return () => {
      cancelIdle()
      authSubscription?.unsubscribe()
      cleanup?.()
    }
  }, [])

  return null
}
