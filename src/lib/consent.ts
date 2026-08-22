'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'

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
 *
 * Implemented with useSyncExternalStore so localStorage is read only after
 * hydration (the server snapshot is always `null`): reading it during SSR or
 * the first client render would produce differing markup and trigger React
 * hydration error #418.
 */
const consentListeners = new Set<() => void>()

function subscribeToConsent(listener: () => void): () => void {
  consentListeners.add(listener)
  return () => {
    consentListeners.delete(listener)
  }
}

function getConsentSnapshot(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(CONSENT_KEY)
  } catch {
    return null
  }
}

function getServerSnapshot(): null {
  return null
}

function notifyConsentChanged(): void {
  for (const listener of consentListeners) listener()
  window.dispatchEvent(new Event('flux3d:consent'))
}

export function useConsent() {
  const raw = useSyncExternalStore(subscribeToConsent, getConsentSnapshot, getServerSnapshot)

  const consent = useMemo<ConsentCategories | null>(() => {
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as Partial<ConsentCategories>
      return {
        essential: true,
        analytics: Boolean(parsed.analytics),
        marketing: Boolean(parsed.marketing),
      }
    } catch {
      return null
    }
  }, [raw])

  const acceptAll = useCallback(() => {
    storeConsent({ essential: true, analytics: true, marketing: true })
    notifyConsentChanged()
  }, [])

  const acceptEssential = useCallback(() => {
    storeConsent(DEFAULT_CONSENT)
    notifyConsentChanged()
  }, [])

  const updateCategories = useCallback((next: ConsentCategories) => {
    storeConsent({ essential: true, analytics: next.analytics, marketing: next.marketing })
    notifyConsentChanged()
  }, [])

  return { consent, acceptAll, acceptEssential, updateCategories }
}