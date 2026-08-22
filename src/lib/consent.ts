'use client'

import { useCallback, useEffect, useState } from 'react'

export type ConsentCategories = {
  essential: boolean
  analytics: boolean
  marketing: boolean
}

const CONSENT_KEY = 'flux3d_cookie_consent_v1'
const DEFAULT_CONSENT: ConsentCategories = {
  essential: true,
  analytics: false,
  marketing: false,
}

export function getStoredConsent(): ConsentCategories | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ConsentCategories>
    return {
      essential: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
    }
  } catch {
    return null
  }
}

export function storeConsent(categories: ConsentCategories) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(categories))
  } catch {
    // localStorage unavailable (private mode) — consent just won't persist.
  }
}

export function hasStoredConsent(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(CONSENT_KEY) !== null
  } catch {
    return false
  }
}

export function hasConsent(category: 'analytics' | 'marketing'): boolean {
  const consent = getStoredConsent()
  if (!consent) return false
  return category === 'analytics' ? consent.analytics : consent.marketing
}

/**
 * React hook that reflects the current consent state and fires a
 * window event so analytics/pixel components re-evaluate on change.
 */
export function useConsent() {
  const [consent, setConsent] = useState<ConsentCategories | null>(() => getStoredConsent())

  useEffect(() => {
    const handler = () => {
      setConsent(getStoredConsent())
    }
    window.addEventListener('flux3d:consent', handler)
    return () => window.removeEventListener('flux3d:consent', handler)
  }, [])

  const acceptAll = useCallback(() => {
    storeConsent({ essential: true, analytics: true, marketing: true })
    setConsent({ essential: true, analytics: true, marketing: true })
    window.dispatchEvent(new Event('flux3d:consent'))
  }, [])

  const acceptEssential = useCallback(() => {
    storeConsent(DEFAULT_CONSENT)
    setConsent(DEFAULT_CONSENT)
    window.dispatchEvent(new Event('flux3d:consent'))
  }, [])

  const updateCategories = useCallback((next: ConsentCategories) => {
    storeConsent({ essential: true, analytics: next.analytics, marketing: next.marketing })
    setConsent({ essential: true, analytics: next.analytics, marketing: next.marketing })
    window.dispatchEvent(new Event('flux3d:consent'))
  }, [])

  return { consent, acceptAll, acceptEssential, updateCategories }
}