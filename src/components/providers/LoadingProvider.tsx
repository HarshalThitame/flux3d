'use client'

import { Suspense, useCallback, useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useLoadingStore } from '@/stores/loadingStore'

const GRACE_MS = 250
const MIN_DISPLAY_MS = 600
const MAX_DISPLAY_MS = 8000

function normalizePath(value: string) {
  return value.replace(window.location.origin, '').replace(/\/+$/, '') || '/'
}

function isInternalHref(href: string) {
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
    return false
  }
  if (href.startsWith('http://') || href.startsWith('https://')) {
    try {
      return new URL(href).origin === window.location.origin
    } catch {
      return false
    }
  }
  return true
}

export default function LoadingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const start = useLoadingStore((state) => state.start)
  const stop = useLoadingStore((state) => state.stop)

  const prevPath = useRef(pathname)
  const graceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const minTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadingActive = useRef(false)
  const shownAt = useRef(0)

  const clearGrace = useCallback(() => {
    if (graceTimer.current) {
      clearTimeout(graceTimer.current)
      graceTimer.current = null
    }
  }, [])

  const clearTimers = useCallback(() => {
    clearGrace()
    if (minTimer.current) {
      clearTimeout(minTimer.current)
      minTimer.current = null
    }
    if (maxTimer.current) {
      clearTimeout(maxTimer.current)
      maxTimer.current = null
    }
  }, [clearGrace])

  const hideLoader = useCallback(() => {
    if (loadingActive.current) {
      loadingActive.current = false
      stop()
    }
    clearTimers()
  }, [clearTimers, stop])

  const resolveNavigation = useCallback(() => {
    clearGrace()

    if (!loadingActive.current) {
      return
    }

    const elapsed = Date.now() - shownAt.current
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed)

    if (minTimer.current) {
      clearTimeout(minTimer.current)
    }
    if (maxTimer.current) {
      clearTimeout(maxTimer.current)
    }

    minTimer.current = setTimeout(hideLoader, remaining)
    maxTimer.current = setTimeout(hideLoader, Math.max(0, MAX_DISPLAY_MS - elapsed))
  }, [clearGrace, hideLoader])

  const beginGrace = useCallback(() => {
    clearGrace()

    graceTimer.current = setTimeout(() => {
      if (!loadingActive.current) {
        loadingActive.current = true
        shownAt.current = Date.now()
        start('Navigating…')
      }
    }, GRACE_MS)
  }, [clearGrace, start])

  // Detect slow navigation via internal link clicks (grace period)
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }
      const anchor = (event.target as HTMLElement).closest?.('a[href]') as HTMLAnchorElement | null
      if (!anchor) {
        return
      }
      const href = anchor.getAttribute('href') ?? ''
      if (!isInternalHref(href)) {
        return
      }
      if (normalizePath(href) === normalizePath(window.location.pathname)) {
        return
      }
      beginGrace()
    }

    document.addEventListener('click', handleClick, true)
    return () => {
      document.removeEventListener('click', handleClick, true)
      clearTimers()
    }
  }, [beginGrace, clearTimers])

  // Back / forward navigation always starts a grace period
  useEffect(() => {
    function handlePopstate() {
      beginGrace()
    }

    window.addEventListener('popstate', handlePopstate)
    return () => {
      window.removeEventListener('popstate', handlePopstate)
    }
  }, [beginGrace])

  // Resolve grace once the actual route (pathname or search) has changed
  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname
      resolveNavigation()
    }
  }, [pathname, resolveNavigation])

  return (
    <>
      <Suspense fallback={null}>
        <SearchParamsWatcher onRouteResolved={resolveNavigation} />
      </Suspense>
      {children}
    </>
  )
}

function SearchParamsWatcher({ onRouteResolved }: { onRouteResolved: () => void }) {
  const searchParams = useSearchParams()
  const prev = useRef(searchParams?.toString() ?? '')

  useEffect(() => {
    const current = searchParams?.toString() ?? ''
    if (prev.current !== current) {
      prev.current = current
      onRouteResolved()
    }
  }, [searchParams, onRouteResolved])

  return null
}
