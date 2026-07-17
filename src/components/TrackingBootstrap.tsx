'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { getOrCreateSessionId } from '@/lib/tracking/sessionTracker'
import { trackPageVisit } from '@/lib/tracking/pageVisit'

type AuthUserResult = {
  data?: {
    user?: {
      id?: string
    } | null
  }
}

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

export default function TrackingBootstrap() {
  const pathname = usePathname()
  const firstPath = useRef(true)

  useEffect(() => {
    if (!pathname) return
    const isFirstPath = firstPath.current
    firstPath.current = false
    if (pathname.startsWith('/admin')) return
    if (isFirstPath) return

    const cancelIdle = runWhenIdle(() => {
      try {
        const sessionId = getOrCreateSessionId()
        const supabase = getSupabaseBrowserClient()
        const pageUrl = typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}`
          : pathname
        const pageName = typeof document !== 'undefined' ? document.title : null
        const referrerUrl = typeof document !== 'undefined' ? document.referrer : null

        void supabase.auth.getUser()
          .then((result: AuthUserResult) => trackPageVisit({
            user_id: result.data?.user?.id ?? null,
            session_id: sessionId,
            page_url: pageUrl,
            page_name: pageName,
            referrer_url: referrerUrl,
          }))
          .catch(() => trackPageVisit({
            user_id: null,
            session_id: sessionId,
            page_url: pageUrl,
            page_name: pageName,
            referrer_url: referrerUrl,
          }))
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[tracking] Failed to enqueue client page visit:', error)
        }
      }
    })

    return cancelIdle
  }, [pathname])

  return null
}
