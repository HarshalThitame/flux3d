import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { getSettings } from '@/lib/settings'
import { makeOrganizationJsonLd, makeWebsiteJsonLd } from '@/lib/structured-data'
import ErrorBoundary from '@/components/ErrorBoundary'
import DeferredTracking from '@/components/DeferredTracking'
import DeferredGoogleAnalytics from '@/components/DeferredGoogleAnalytics'
import './globals.css'

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
]

export const metadata: Metadata = {
  metadataBase: new URL('https://flux3d.in'),
  title: {
    default: 'Flux3D — Custom 3D Printing and Manufacturing Services in India',
    template: '%s | Flux3D',
  },
  description:
    'Flux3D provides custom 3D printing, prototyping, model printing, ready-made products, and related manufacturing services in India.',
  keywords: [
    '3D printing India',
    'custom 3D printing service',
    'custom manufacturing India',
    'rapid prototyping India',
    'model printing India',
    'ready-made 3D products',
    'online 3D printing India',
  ],
  authors: [{ name: 'Flux3D', url: 'https://flux3d.in' }],
  creator: 'Flux3D',
  publisher: 'Flux3D',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://flux3d.in',
    siteName: 'Flux3D',
    title: 'Flux3D — Custom 3D Printing and Manufacturing Services in India',
    description:
      'Flux3D provides custom 3D printing, prototyping, model printing, ready-made products, and related manufacturing services in India.',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Flux3D — Premium 3D Printing India',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Flux3D — Custom 3D Printing and Manufacturing Services in India',
    description: 'Flux3D provides custom 3D printing, prototyping, model printing, ready-made products, and related manufacturing services in India.',
    images: ['/twitter-image.png'],
  },
  alternates: {
    canonical: 'https://flux3d.in',
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  other: {
    'facebook-domain-verification': '2so08kooblq8716z4823mqn6etbbg6',
    'color-scheme': 'light dark',
  },
  category: 'technology',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#6d28d9',
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
    >
      <head>
        {DNS_PREFETCH_ORIGINS.map((href) => (
          <link key={`dns-prefetch-${href}`} rel="dns-prefetch" href={href} />
        ))}
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
          <DeferredTracking />
          {children}
        </ErrorBoundary>
        <DeferredGoogleAnalytics measurementId={GOOGLE_ANALYTICS_ID} />
      </body>
    </html>
  )
}
