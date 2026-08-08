'use client'

import { usePathname } from 'next/navigation'

/**
 * Cinematic page transition: on every route change the incoming page
 * slides up from below with a soft fade. Implemented as a pure CSS
 * keyframe animation (keyed by pathname) so no lingering transform is
 * left behind and `position: fixed` children are unaffected after the
 * entrance completes.
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
