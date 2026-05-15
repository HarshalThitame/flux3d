'use client'

import type { DeviceType } from '../../../types/database'

const SESSION_KEY = 'flux3d_session_id'
const COOKIE_NAME = 'flux3d_session_id'

function createSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

function detectDevice(userAgent: string): DeviceType {
  if (/tablet|ipad/i.test(userAgent)) return 'tablet'
  if (/mobile|iphone|android/i.test(userAgent)) return 'mobile'
  return 'desktop'
}

function detectBrowser(userAgent: string) {
  if (/edg/i.test(userAgent)) return 'Edge'
  if (/chrome|crios/i.test(userAgent)) return 'Chrome'
  if (/firefox|fxios/i.test(userAgent)) return 'Firefox'
  if (/safari/i.test(userAgent)) return 'Safari'
  return 'Unknown'
}

function detectOs(userAgent: string) {
  if (/windows/i.test(userAgent)) return 'Windows'
  if (/mac os|macintosh/i.test(userAgent)) return 'macOS'
  if (/iphone|ipad|ios/i.test(userAgent)) return 'iOS'
  if (/android/i.test(userAgent)) return 'Android'
  if (/linux/i.test(userAgent)) return 'Linux'
  return 'Unknown'
}

function postSessionEvent(url: string, payload: unknown, keepalive = false) {
  const body = JSON.stringify(payload)

  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive,
  }).catch((error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[tracking] Failed to submit session event:', error)
    }
  })
}

export function getOrCreateSessionId() {
  let sessionId = ''

  try {
    sessionId = sessionStorage.getItem(SESSION_KEY) ?? ''
    if (!sessionId) {
      sessionId = createSessionId()
      sessionStorage.setItem(SESSION_KEY, sessionId)
    }
  } catch {
    sessionId = createSessionId()
  }

  try {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(sessionId)}; Path=/; Max-Age=86400; SameSite=Lax`
  } catch {
    // Cookie sync is best-effort; sessionStorage remains the source for this tab.
  }

  return sessionId
}

export function initSessionTracker(userId?: string | null) {
  if (typeof window === 'undefined') return ''

  const sessionId = getOrCreateSessionId()
  const userAgent = navigator.userAgent

  postSessionEvent('/api/tracking/sessions/start', {
    user_id: userId ?? null,
    session_id: sessionId,
    device_type: detectDevice(userAgent),
    browser: detectBrowser(userAgent),
    os: detectOs(userAgent),
  })

  const handleBeforeUnload = () => {
    endTrackedSession(sessionId)
  }

  window.addEventListener('beforeunload', handleBeforeUnload, { once: true })
  return sessionId
}

export function updateTrackedSessionUser(sessionId: string, userId: string | null) {
  if (typeof window === 'undefined' || !sessionId) return

  postSessionEvent('/api/tracking/sessions/start', {
    user_id: userId,
    session_id: sessionId,
  })
}

export function endTrackedSession(sessionId: string) {
  if (typeof window === 'undefined' || !sessionId) return

  const body = JSON.stringify({ session_id: sessionId })
  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const sent = navigator.sendBeacon('/api/tracking/sessions/end', new Blob([body], { type: 'application/json' }))
    if (sent) return
  }

  postSessionEvent('/api/tracking/sessions/end', { session_id: sessionId }, true)
}
