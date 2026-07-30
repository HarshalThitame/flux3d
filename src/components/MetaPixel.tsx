'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    fbq?: (command: string, event: string, data?: Record<string, unknown>, options?: Record<string, unknown>) => void
    _fbq?: unknown
  }
}

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || ''

export default function MetaPixel() {
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    if (!PIXEL_ID) return

    const n = window as unknown as Record<string, unknown>
    if (n.fbq) return

    const fbq = (...args: unknown[]) => {
      const q = (fbq as unknown as { queue?: unknown[] }).queue ??= []
      q.push(args)
    }
    n.fbq = fbq as typeof window.fbq
    if (!n._fbq) n._fbq = fbq

    const script = document.createElement('script')
    script.async = true
    script.src = 'https://connect.facebook.net/en_US/fbevents.js'
    document.head.appendChild(script)

    fbq('init', PIXEL_ID)
    fbq('track', 'PageView')
  }, [])

  return (
    <noscript>
      <img
        height={1}
        width={1}
        style={{ display: 'none' }}
        alt=""
        src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
      />
    </noscript>
  )
}
