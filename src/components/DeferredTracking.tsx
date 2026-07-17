'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const VisitorTracker = dynamic(() => import('@/components/VisitorTracker'), { ssr: false })
const SessionTracker = dynamic(() => import('@/components/SessionTracker'), { ssr: false })
const TrackingBootstrap = dynamic(() => import('@/components/TrackingBootstrap'), { ssr: false })

function onFirstIntent(callback: () => void) {
  let done = false
  const events = ['pointerdown', 'keydown', 'touchstart'] as const

  const run = () => {
    if (done) return
    done = true
    events.forEach((event) => window.removeEventListener(event, run))
    callback()
  }

  events.forEach((event) => window.addEventListener(event, run, { once: true, passive: true }))

  return () => {
    done = true
    events.forEach((event) => window.removeEventListener(event, run))
  }
}

export default function DeferredTracking() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (mounted) return
    return onFirstIntent(() => setMounted(true))
  }, [mounted])

  if (!mounted) return null

  return (
    <>
      <VisitorTracker />
      <SessionTracker />
      <TrackingBootstrap />
    </>
  )
}
