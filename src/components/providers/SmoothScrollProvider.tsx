'use client'

import { ComponentType, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

type ReactLenisProps = {
  root?: boolean
  options?: Record<string, unknown>
  children: React.ReactNode
}

const MARKETING_ROUTES = new Set([
  'services',
  'materials',
  'about',
  'contact',
  'features',
  'pricing',
  'gallery',
  'blog',
  'instagram-ad',
])

function isMarketingRoute(pathname: string | null | undefined) {
  if (!pathname || pathname === '/') return true
  const segment = pathname.split('/').filter(Boolean)[0] ?? ''
  return MARKETING_ROUTES.has(segment)
}

/**
 * Premium momentum (inertia) scrolling for the landing/marketing experience.
 * Respects `prefers-reduced-motion` and never renders a wrapper div, so page
 * layout and `position: fixed` elements are unaffected.
 *
 * Lenis is lazy-loaded and only mounted on marketing routes. Shop, checkout,
 * orders, admin, and other functional routes use native scrolling, which
 * keeps the Lenis bundle and its always-on animation loop off those pages.
 */
export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  const [ReactLenis, setReactLenis] = useState<ComponentType<ReactLenisProps> | null>(null)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')

    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const enabled = !reducedMotion && !pathname?.startsWith('/admin') && isMarketingRoute(pathname)

  useEffect(() => {
    if (!enabled || ReactLenis) return
    let cancelled = false
    import('lenis/react').then(({ ReactLenis: LenisComponent }) => {
      if (!cancelled) setReactLenis(() => LenisComponent)
    })
    return () => {
      cancelled = true
    }
  }, [enabled, ReactLenis])

  if (!enabled || !ReactLenis) {
    return <>{children}</>
  }

  return (
    <ReactLenis
      root
      options={{
        duration: 1.15,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        autoRaf: true,
        anchors: true,
      }}
    >
      {children}
    </ReactLenis>
  )
}
