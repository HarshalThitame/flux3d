'use client'

import { useEffect, useState } from 'react'
import { ReactLenis } from 'lenis/react'

/**
 * Premium momentum (inertia) scrolling for the whole application.
 * Respects `prefers-reduced-motion` and never renders a wrapper div,
 * so page layout and `position: fixed` elements are unaffected.
 */
export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')

    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  if (reducedMotion) {
    return <>{children}</>
  }

  return (
    <ReactLenis
      root
      options={{
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        autoRaf: true,
        anchors: true,
      }}
    >
      {children}
    </ReactLenis>
  )
}
