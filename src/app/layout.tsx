import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { Playfair_Display, Space_Grotesk } from 'next/font/google'
import { getSettings } from '@/lib/settings'
import { FALLBACK_SETTINGS } from '@/lib/settings-fallback'
import { makeOrganizationJsonLd, makeWebsiteJsonLd } from '@/lib/structured-data'
import ErrorBoundary from '@/components/ErrorBoundary'
import DeferredTracking from '@/components/DeferredTracking'
import DeferredGoogleAnalytics from '@/components/DeferredGoogleAnalytics'
import MetaPixel from '@/components/MetaPixel'
import ToastContainer from '@/components/Toast'
import LoadingProvider from '@/components/providers/LoadingProvider'
import LiquidMorphLoader from '@/components/ui/LiquidMorphLoader'
import './globals.css'
import './shop-luxury.css'
import './landing-premium.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
})

// Space Grotesk — a premium, geometric sans-serif used for body and
// interface typography across the landing experience. Loaded as a
// single variable font so the full 100–900 weight range renders crisply
// (the existing headings rely on font-black / font-extrabold).
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
  display: 'swap',
  weight: 'variable',
})

const GOOGLE_ANALYTICS_ID = 'G-KCK2459TBQ'

const DNS_PREFETCH_ORIGINS = [
  '//www.googletagmanager.com',
  '//www.google-analytics.com',
  '//analytics.google.com',
  '//region1.google-analytics.com',
  '//vitals.vercel-insights.com',
  '//jqgaebdtuasenyojvbsi.supabase.co',
  '//lh3.googleusercontent.com',
  '//avatars.githubusercontent.com',
  '//wa.me',
  '//connect.facebook.net',
  '//graph.facebook.com',
  'https://connect.facebook.net',
]

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings().catch(() => null)
  const name = settings?.brandName || settings?.businessName || 'Flux3D'
  const description = settings?.businessDescription || 'Flux3D provides custom 3D printing, prototyping, model printing, ready-made products, and related manufacturing services in India.'
  const url = settings?.websiteUrl || 'https://flux3d.in'
  const ogImage = settings?.ogImageUrl || '/opengraph-image.png'
  const twitterImage = settings?.twitterImageUrl || '/twitter-image.png'
  const keywords = settings?.metaKeywords ? settings.metaKeywords.split(',').map(k => k.trim()) : FALLBACK_SETTINGS.metaKeywords.split(',').map(k => k.trim())
  const canonicalUrl = settings?.canonicalUrl || url
  const robotsIndex = settings?.robotsIndex ?? true

  return {
    metadataBase: new URL('https://flux3d.in'),
    title: {
      default: settings?.metaTitle || `${name} — Custom 3D Printing and Manufacturing Services in India`,
      template: `%s | ${name}`,
    },
  description,
  keywords,
  authors: [{ name, url }],
  creator: name,
  publisher: name,
  robots: {
    index: robotsIndex,
    follow: robotsIndex,
    googleBot: {
      index: robotsIndex,
      follow: robotsIndex,
      'max-image-preview': 'large',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url,
    siteName: name,
    title: settings?.metaTitle || `${name} — Custom 3D Printing and Manufacturing Services in India`,
    description,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: `${name} — Premium 3D Printing India`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: settings?.metaTitle || `${name} — Custom 3D Printing and Manufacturing Services in India`,
    description,
    images: [twitterImage],
  },
  alternates: {
    canonical: canonicalUrl,
  },
  manifest: '/manifest.json',
  icons: {
    icon: settings?.faviconUrl || '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  other: {
    'facebook-domain-verification': '2so08kooblq8716z4823mqn6etbbg6',
  },
  category: 'technology',
  }
}

export async function generateViewport(): Promise<Viewport> {
  const settings = await getSettings().catch(() => null)
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    themeColor: settings?.primaryColor || '#6d28d9',
  }
}

function toJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headerStore = await headers()
  const nonce = headerStore.get('x-nonce') ?? undefined

  const settings = await getSettings()
  const orgJsonLd = makeOrganizationJsonLd(settings)
  const webJsonLd = makeWebsiteJsonLd(settings)

  return (
      <html
        lang="en"
        data-scroll-behavior="smooth"
        className={`${playfair.variable} ${spaceGrotesk.variable}`}
      >
      <head>
        {DNS_PREFETCH_ORIGINS.map((href) => (
          <link key={`dns-prefetch-${href}`} rel="dns-prefetch" href={href} />
        ))}
        <style>{`
          :root {
            --brand-primary: ${settings.primaryColor || '#6d28d9'};
            --brand-secondary: ${settings.secondaryColor || '#a855f7'};
            --safe-area-top: env(safe-area-inset-top, 0px);
            --safe-area-bottom: env(safe-area-inset-bottom, 0px);
            --safe-area-left: env(safe-area-inset-left, 0px);
            --safe-area-right: env(safe-area-inset-right, 0px);
          }
        `}</style>
      </head>
      <body suppressHydrationWarning>
        <script
          nonce={nonce}
          suppressHydrationWarning
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(orgJsonLd) }}
        />
        <script
          nonce={nonce}
          suppressHydrationWarning
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(webJsonLd) }}
        />
        <ErrorBoundary>
          <MetaPixel />
        <DeferredTracking />
          <LoadingProvider>
            {children}
          </LoadingProvider>
        </ErrorBoundary>
        <LiquidMorphLoader />
        <ToastContainer />
        <DeferredGoogleAnalytics measurementId={GOOGLE_ANALYTICS_ID} />
      </body>
    </html>
  )
}
