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

export default function TrackingBootstrap() {
  const pathname = usePathname()
  const firstPath = useRef(true)

  useEffect(() => {
    if (!pathname) return
    const isFirstPath = firstPath.current
    firstPath.current = false
    if (pathname.startsWith('/admin')) return
    if (isFirstPath) return

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
  }, [pathname])

  return null
}
