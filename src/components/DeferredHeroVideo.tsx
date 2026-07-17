'use client'

import { useEffect, useState } from 'react'

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
  cancelIdleCallback?: (id: number) => void
}

function runWhenIdle(callback: () => void, timeout = 1800) {
  const idleWindow = window as IdleWindow

  if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
    const idleId = idleWindow.requestIdleCallback(callback, { timeout })
    return () => idleWindow.cancelIdleCallback?.(idleId)
  }

  const timeoutId = window.setTimeout(callback, Math.min(timeout, 900))
  return () => window.clearTimeout(timeoutId)
}

export default function DeferredHeroVideo({
  src,
  className,
  ariaLabel,
  minWidth = 1024,
}: {
  src: string
  className: string
  ariaLabel?: string
  minWidth?: number
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(`(min-width: ${minWidth}px) and (prefers-reduced-motion: no-preference)`)
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string }
    }).connection
    const constrainedConnection =
      connection?.saveData ||
      connection?.effectiveType === 'slow-2g' ||
      connection?.effectiveType === '2g'

    if (!media.matches || constrainedConnection) return

    return runWhenIdle(() => setMounted(true), 3200)
  }, [minWidth])

  if (!mounted) return null

  return (
    <video
      className={className}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
    />
  )
}
