'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import RouteChunkLoader from '@/components/RouteChunkLoader'

const LandingPageClient = dynamic(() => import('./LandingPageClient'), {
  ssr: false,
  loading: () => <RouteChunkLoader className="bg-[#05060a] text-white" minHeight="520px" label="Loading page sections" />,
})

export default function LandingPageBoundary() {
  const [shouldLoad, setShouldLoad] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (shouldLoad) return

    const load = () => setShouldLoad(true)
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          load()
          observer.disconnect()
        }
      },
      { rootMargin: '280px 0px' }
    )

    const sentinel = sentinelRef.current
    if (sentinel) observer.observe(sentinel)

    window.addEventListener('keydown', load, { once: true })
    window.addEventListener('pointerdown', load, { once: true, passive: true })
    window.addEventListener('touchstart', load, { once: true, passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener('keydown', load)
      window.removeEventListener('pointerdown', load)
      window.removeEventListener('touchstart', load)
    }
  }, [shouldLoad])

  return (
    <div ref={sentinelRef} className="landing-deferred-shell bg-[#05060a]">
      {shouldLoad ? <LandingPageClient /> : <div aria-hidden="true" className="min-h-[520px]" />}
    </div>
  )
}
