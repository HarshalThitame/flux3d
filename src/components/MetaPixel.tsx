'use client'

import Script from 'next/script'
import { hasConsent } from '@/lib/consent'
import { useMounted } from '@/lib/use-mounted'

declare global {
  interface Window {
    fbq: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void
      queue: unknown[]
      push: (...args: unknown[]) => void
      loaded: boolean
      version: string
    }
    _fbq: unknown
  }
}

/**
 * Loads the Meta (Facebook) Pixel base snippet once per page.
 *
 * Uses Next.js Script with strategy="afterInteractive" so the pixel loads
 * after hydration without blocking the critical render path. The component
 * is rendered in the root layout so every page gets PageView tracking
 * automatically.
 *
 * The pixel only loads after the user has given marketing-consent
 * (India DPDP 2023). Without consent the pixel is never injected.
 *
 * Individual in-app events (AddToCart, Purchase, etc.) are fired via
 * trackMetaEvent() from @/lib/meta/event-utils, which calls window.fbq()
 * after this script has initialised it.
 */
export default function MetaPixel({ pixelId, nonce }: { pixelId: string; nonce?: string }) {
  // Consent is only readable after mount (localStorage is unavailable during
  // SSR and hydration), so gate rendering on a mounted flag to keep the
  // server and first client render identical (avoids React error #418).
  const mounted = useMounted()

  if (!mounted || !pixelId) return null
  if (!hasConsent('marketing')) return null

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  )
}
