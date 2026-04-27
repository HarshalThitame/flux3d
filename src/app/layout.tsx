import type { Metadata, Viewport } from 'next'
import { DM_Sans, Syne } from 'next/font/google'
import { organizationJsonLd, websiteJsonLd } from '@/lib/structured-data'
import { absoluteUrl, siteConfig } from '@/lib/site'
import './globals.css'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '700', '800']
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm',
  weight: ['300', '400', '500', '600', '700']
})

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
  themeColor: '#050810',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`${syne.variable} ${dmSans.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        {children}
      </body>
    </html>
  )
}
