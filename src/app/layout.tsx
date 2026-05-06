import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { connection } from 'next/server'
import { organizationJsonLd, websiteJsonLd } from '@/lib/structured-data'
import { absoluteUrl, siteConfig } from '@/lib/site'
import { CartProvider } from '@/lib/cart/context'
import VisitorTracker from '@/components/VisitorTracker'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: siteConfig.keywords,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    locale: 'en_IN',
    images: [
      {
        url: absoluteUrl(siteConfig.ogImage),
        alt: `${siteConfig.name} logo`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
    images: [absoluteUrl(siteConfig.ogImage)],
  },
  category: 'technology',
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#050810',
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

  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(websiteJsonLd) }}
        />
        <CartProvider>
          <VisitorTracker />
          {children}
        </CartProvider>
      </body>
    </html>
  )
}
