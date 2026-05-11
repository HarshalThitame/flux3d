import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { connection } from 'next/server'
import { getSettings } from '@/lib/settings'
import { makeOrganizationJsonLd, makeWebsiteJsonLd } from '@/lib/structured-data'
import { absoluteUrl, siteUrl } from '@/lib/site'
import { CartProvider } from '@/lib/cart/context'
import { SettingsProvider } from '@/lib/settings-context'
import VisitorTracker from '@/components/VisitorTracker'
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await connection()
  await headers()

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
            <VisitorTracker />
            {children}
          </SettingsProvider>
        </CartProvider>
      </body>
    </html>
  )
}
