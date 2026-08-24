'use client'

import { usePathname } from 'next/navigation'

/**
 * Cinematic page transition: on every route change the incoming page
 * slides up from below with a soft fade. Implemented as a pure CSS
 * keyframe animation (keyed by pathname).
 *
 * IMPORTANT: do not add `will-change` (or a persistent `transform`) to
 * `.page-transition` — either would turn this element into the containing
 * block for all `position: fixed` descendants (mobile menu, floating
 * buttons), breaking their viewport anchoring while scrolled down.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname?.startsWith('/admin')) {
    return <>{children}</>
  }

  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  )
}
