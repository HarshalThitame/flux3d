import type { Metadata, Viewport } from 'next'
import { cookies, headers } from 'next/headers'
import { connection } from 'next/server'
import { getSettings } from '@/lib/settings'
import { makeOrganizationJsonLd, makeWebsiteJsonLd } from '@/lib/structured-data'
import { absoluteUrl, siteUrl } from '@/lib/site'
import { CartProvider } from '@/lib/cart/context'
import { SettingsProvider } from '@/lib/settings-context'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { trackPageVisit } from '@/lib/tracking/pageVisit'
import VisitorTracker from '@/components/VisitorTracker'
import TrackingBootstrap from '@/components/TrackingBootstrap'
import SessionTracker from '@/components/SessionTracker'
import ErrorBoundary from '@/components/ErrorBoundary'
import './globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  const title = settings.metaTitle || 'Flux3D | Premium 3D Printing Services in India'
  const description = settings.businessDescription || "India's most trusted 3D printing service"
  const ogImage = settings.ogImageUrl || '/opengraph-image.png'

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: `%s | ${settings.businessName || 'Flux3D'}`,
    },
    description,
    applicationName: settings.businessName || 'Flux3D',
    keywords: settings.metaKeywords ? settings.metaKeywords.split(',').map(k => k.trim()) : undefined,
    alternates: {
      canonical: '/',
    },
other: {
      'facebook-domain-verification': '2so08kooblq8716z4823mqn6etbbg6',
    },
    openGraph: {
      type: 'website',
      url: siteUrl,
      siteName: settings.businessName || 'Flux3D',
      title,
      description,
      locale: 'en_IN',
      images: [
        {
          url: absoluteUrl(ogImage),
          alt: `${settings.businessName} logo`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [absoluteUrl(ogImage)],
    },
    icons: settings.faviconUrl && !settings.faviconUrl.endsWith('/favicon.ico') ? [{ rel: 'icon', url: settings.faviconUrl }] : undefined,
    category: 'technology',
    manifest: '/manifest.webmanifest',
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#FFFFFF',
}

function toJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

async function trackInitialPageVisit(params: {
  sessionId: string
  pageUrl: string
  referrerUrl: string | null
}) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase.auth.getUser()
    await trackPageVisit({
      user_id: data.user?.id ?? null,
      session_id: params.sessionId,
      page_url: params.pageUrl,
      page_name: null,
      referrer_url: params.referrerUrl,
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[tracking] Failed to enqueue initial page visit:', error)
    }
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await connection()
  const headerStore = await headers()
  const cookieStore = await cookies()
  const currentPath = headerStore.get('x-current-path') ?? '/'
  const currentUrl = headerStore.get('x-current-url') ?? currentPath
  const referrerUrl = headerStore.get('referer')
  const sessionId =
    cookieStore.get('flux3d_session_id')?.value ??
    cookieStore.get('flux3d_track_token')?.value ??
    headerStore.get('x-track-token') ??
    crypto.randomUUID()

  if (!currentPath.startsWith('/admin')) {
    void trackInitialPageVisit({
      sessionId,
      pageUrl: currentUrl,
      referrerUrl,
    })
  }

  const settings = await getSettings()
  const orgJsonLd = makeOrganizationJsonLd(settings)
  const webJsonLd = makeWebsiteJsonLd(settings)

  const cssVars = {
    '--primary': settings.primaryColor || '#7C5CFF',
    '--primary-dark': '#5A3CE6',
    '--primary-light': '#B7A7FF',
    '--secondary': settings.secondaryColor || '#A78BFA',
    '--bg-dark': '#0F1B3D',
    '--text-muted': '#505880',
  } as const

  return (
    <html lang="en" style={cssVars as React.CSSProperties}>
      <body suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(webJsonLd) }}
        />
        <CartProvider>
          <SettingsProvider initialSettings={settings}>
            <ErrorBoundary>
              <VisitorTracker />
              <SessionTracker />
              <TrackingBootstrap />
              {children}
            </ErrorBoundary>
          </SettingsProvider>
        </CartProvider>
      </body>
    </html>
  )
}
