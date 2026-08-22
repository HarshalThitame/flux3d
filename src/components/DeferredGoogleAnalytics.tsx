'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    __flux3dGaLoaded?: boolean
  }
}

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

export default function DeferredGoogleAnalytics({
  measurementId,
  nonce,
}: {
  measurementId: string
  nonce?: string
}) {
  useEffect(() => {
    if (!measurementId || window.__flux3dGaLoaded) return

    return onFirstIntent(() => {
      if (window.__flux3dGaLoaded) return

      window.__flux3dGaLoaded = true
      window.dataLayer = window.dataLayer ?? []
      window.gtag =
        window.gtag ??
        ((...args: unknown[]) => {
          window.dataLayer?.push(args)
        })

      window.gtag('js', new Date())
      window.gtag('config', measurementId)

      const script = document.createElement('script')
      script.async = true
      if (nonce) script.nonce = nonce
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
      document.head.appendChild(script)
    })
  }, [measurementId, nonce])

  return null
}
