'use client'

import { useSyncExternalStore } from 'react'
import { View } from 'lucide-react'

function detectArPlatform(): 'ios' | 'android' | null {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return null
}

const emptySubscribe = () => () => {}

type ARViewButtonProps = {
  usdzUrl: string
  glbUrl: string
  className?: string
}

/**
 * "View in your space" — iOS Quick Look (USDZ) or Android Scene Viewer (GLB).
 * Renders nothing on unsupported desktop platforms.
 */
export default function ARViewButton({ usdzUrl, glbUrl, className = '' }: ARViewButtonProps) {
  const platform = useSyncExternalStore(emptySubscribe, detectArPlatform, () => null)

  if (!platform) return null

  const baseClass =
    'flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[var(--shop-radius-lg)] border border-[var(--shop-border-gold)] bg-white px-4 py-3 text-sm font-semibold text-[var(--shop-text-primary)] transition hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)] active:scale-[0.99]'

  if (platform === 'ios') {
    return (
      <a rel="ar" href={usdzUrl} className={`${baseClass} ${className}`}>
        <View className="h-4 w-4" />
        View in your space
      </a>
    )
  }

  const sceneViewerUrl =
    `intent://arvr.google.com/scene-viewer/1.0` +
    `?file=${encodeURIComponent(glbUrl)}&mode=ar_preferred` +
    `#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(glbUrl)};end;`

  return (
    <a href={sceneViewerUrl} className={`${baseClass} ${className}`}>
      <View className="h-4 w-4" />
      View in your space
    </a>
  )
}
