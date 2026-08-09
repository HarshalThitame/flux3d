'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const ANON_ID_KEY = 'flux3d_anon_id'
const TRACK_TOKEN_COOKIE = 'flux3d_track_token'

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

function getOrCreateAnonId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(ANON_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(ANON_ID_KEY, id)
  }
  return id
}

function getCookieValue(name: string) {
  if (typeof document === 'undefined') return ''

  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return match?.[1] ?? ''
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`
}

function getOrCreateTrackToken(): string {
  let token = getCookieValue(TRACK_TOKEN_COOKIE)
  if (!token) {
    token = crypto.randomUUID()
    setCookie(TRACK_TOKEN_COOKIE, token)
  }
  return token
}

export default function VisitorTracker() {
  const pathname = usePathname()
  const sessionIdRef = useRef<string>('')

  useEffect(() => {
    // Skip admin pages
    if (pathname?.startsWith('/admin')) return

    let trackToken = ''
    let startTime = 0
    let started = false

    const cancelIdle = runWhenIdle(() => {
      const anonId = getOrCreateAnonId()
      trackToken = getOrCreateTrackToken()
      startTime = Date.now()
      started = true

      // Start session if not exists
      if (!sessionIdRef.current) {
        sessionIdRef.current = crypto.randomUUID()
      }

      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (trackToken) {
        requestHeaders['x-track-token'] = trackToken
      }

      // Send page_view event
      fetch('/api/track', {
        method: 'POST',
        headers: requestHeaders,
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
    })

    // Track session end on unmount/leave
    return () => {
      cancelIdle()
      if (!started) return
      const duration = Date.now() - startTime
      if (duration > 5000) { // only track sessions > 5 seconds
        fetch('/api/track', {
          method: 'POST',
          headers: trackToken
            ? { 'Content-Type': 'application/json', 'x-track-token': trackToken }
            : { 'Content-Type': 'application/json' },
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
