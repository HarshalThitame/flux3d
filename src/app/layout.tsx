import type { Metadata, Viewport } from 'next'
import { DM_Sans, Inter, JetBrains_Mono } from 'next/font/google'
import { cookies, headers } from 'next/headers'
import { connection } from 'next/server'
import { Analytics } from '@vercel/analytics/next'
import { getSettings } from '@/lib/settings'
import { makeOrganizationJsonLd, makeWebsiteJsonLd } from '@/lib/structured-data'
import { CartProvider } from '@/lib/cart/context'
import { SettingsProvider } from '@/lib/settings-context'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { trackPageVisit } from '@/lib/tracking/pageVisit'
import VisitorTracker from '@/components/VisitorTracker'
import TrackingBootstrap from '@/components/TrackingBootstrap'
import SessionTracker from '@/components/SessionTracker'
import ErrorBoundary from '@/components/ErrorBoundary'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-inter-next',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-dm-next',
  display: 'swap',
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono-next',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://flux3d.in'),
  title: {
    default: 'Flux3D — Premium 3D Printing Services in India | Starting ₹99',
    template: '%s | Flux3D',
  },
  description:
    "India's most trusted 3D printing service. Custom FDM & resin printing for industrial parts, architecture models, student projects, medical models & corporate gifts. Powered by Bambu Lab P2S. Pan-India delivery. Starting ₹99.",
  keywords: [
    '3D printing India',
    '3D printing Pune',
    '3D printing Mumbai',
    'custom 3D printing service',
    'FDM printing India',
    'resin printing India',
    'rapid prototyping India',
    'Bambu Lab P2S',
    '3D printing near me',
    'cheap 3D printing India',
    '3D printing for students',
    'industrial 3D printing',
    'architecture models 3D print',
    'corporate gifting 3D print',
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
    title: 'Flux3D — Premium 3D Printing Services in India | Starting ₹99',
    description:
      'Custom 3D printing for businesses, students & creators. Industrial precision, fast turnaround, pan-India delivery. Starting ₹99.',
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
    title: 'Flux3D — Premium 3D Printing Services in India',
    description: 'Custom 3D printing starting ₹99. Pan-India delivery. Powered by Bambu Lab P2S.',
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

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${dmSans.variable} ${jetBrainsMono.variable}`}
    >
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
        <Analytics />
      </body>
    </html>
  )
}
