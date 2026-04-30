'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const ANON_ID_KEY = 'flux3d_anon_id'

function getOrCreateAnonId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(ANON_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(ANON_ID_KEY, id)
  }
  return id
}

export default function VisitorTracker() {
  const pathname = usePathname()
  const sessionIdRef = useRef<string>('')

  useEffect(() => {
    // Skip admin pages
    if (pathname?.startsWith('/admin')) return

    const anonId = getOrCreateAnonId()
    const now = Date.now()

    // Start session if not exists
    if (!sessionIdRef.current) {
      sessionIdRef.current = crypto.randomUUID()
    }

    // Send page_view event
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anonId,
        sessionId: sessionIdRef.current,
        pageUrl: pathname,
        pageTitle: typeof document !== 'undefined' ? document.title : '',
        referrer: typeof document !== 'undefined' ? document.referrer : '',
        device: typeof navigator !== 'undefined' 
          ? (navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop') 
          : 'Unknown',
        event: 'page_view',
      }),
    }).catch(() => {}) // silent fail

    // Track session end on unmount/leave
    const startTime = now
    return () => {
      const duration = Date.now() - startTime
      if (duration > 5000) { // only track sessions > 5 seconds
        fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            event: 'session_end',
          }),
        }).catch(() => {})
      }
    }
  }, [pathname])

  return null
}
