'use client'

import { useEffect, useState } from 'react'
import { useLoadingStore } from '@/stores/loadingStore'

const EXIT_MS = 360

const TWINKLES = [
  { top: '18%', left: '22%', delay: '0s' },
  { top: '24%', left: '76%', delay: '0.9s' },
  { top: '66%', left: '12%', delay: '1.6s' },
  { top: '72%', left: '82%', delay: '0.4s' },
  { top: '42%', left: '90%', delay: '2.1s' },
  { top: '12%', left: '55%', delay: '1.2s' },
]

export default function LiquidMorphLoader() {
  const isLoading = useLoadingStore((state) => state.isLoading)
  const message = useLoadingStore((state) => state.message)

  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isLoading) {
      setVisible(true)
      setExiting(false)
    } else if (visible) {
      setExiting(true)
      const t = setTimeout(() => setVisible(false), EXIT_MS)
      return () => clearTimeout(t)
    }
  }, [isLoading, visible])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!visible) {
    return null
  }

  return (
    <div
      className={`liquid-morph-overlay ${exiting ? 'liquid-morph-overlay-exit' : 'liquid-morph-overlay-enter'}`}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={message ?? 'Loading'}
    >
      <div className="liquid-morph-vignette" />

      {TWINKLES.map((t, idx) => (
        <span
          key={idx}
          className="liquid-morph-twinkle"
          style={{ top: t.top, left: t.left, animationDelay: t.delay }}
        />
      ))}

      <div className="relative flex flex-col items-center">
        <div className="liquid-morph-blob-wrap">
          <div className="liquid-morph-ring-reverse" />
          <div className="liquid-morph-ring" />
          <div className="liquid-morph-particle" style={{ animationDelay: '0.2s' }} />
          <div className="liquid-morph-particle" style={{ animationDelay: '2s' }} />
          <div className="liquid-morph-particle-reverse" style={{ animationDelay: '1.1s' }} />

          <div className="absolute inset-0">
            <div className="liquid-morph-blob-main" />
            <div className="liquid-morph-blob-inner" />
            <div className="liquid-morph-blob-core" />
          </div>
        </div>

        <div className="liquid-morph-wordmark liquid-morph-text-1 mt-12 text-center text-4xl font-bold tracking-[0.22em] sm:text-5xl">
          FLUX3D
        </div>

        <div className="liquid-morph-text-2 mt-4 flex items-center gap-3 px-6">
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#d4af37]/70" />
          <p className="text-center text-xs font-semibold tracking-[0.3em] text-[#4c1d95]/85 uppercase sm:text-sm">
            {message ?? 'Preparing your experience…'}
          </p>
        </div>

        <div className="liquid-morph-text-3 mt-8 h-[2px] w-40 overflow-hidden rounded-full bg-[#4c1d95]/10">
          <div className="loading-progress h-full w-full origin-left rounded-full bg-gradient-to-r from-[#5b21b6] via-[#a855f7] to-[#d4af37]" />
        </div>
      </div>
    </div>
  )
}