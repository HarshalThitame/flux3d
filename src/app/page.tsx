import type { Metadata } from 'next'

import { getSettings } from '@/lib/settings'
import { buildPublicBusinessProfile } from '@/lib/public-business'
import { faqPageJsonLd, makeLocalBusinessJsonLd } from '@/lib/structured-data'
import { getShopHomeData } from '@/lib/shop/public-data'
import { CSP_NONCE } from '@/lib/csp'
import './landing-luxury-unified.css'
import HeroSection from './landing/HeroSection'
import LandingPageBoundary from './landing/LandingPageBoundary'
import LandingShopSection from './landing/LandingShopSection'
import Navbar from '@/components/Navbar'

export const revalidate = 300

export const metadata: Metadata = {
  title: {
    absolute: 'Flux3D — 3D Shop and Custom 3D Printing Services in India',
  },
  description:
    'Shop ready-made 3D printed products with live 3D previews, or order custom 3D printing, prototyping, and manufacturing services in India.',
  alternates: {
    canonical: 'https://flux3d.in',
  },
}

function toJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

export default async function Home() {
  const settings = await getSettings()
  const profile = buildPublicBusinessProfile(settings)
  const shopData = await getShopHomeData()
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      makeLocalBusinessJsonLd(settings),
      {
        '@type': 'WebSite',
        '@id': 'https://flux3d.in/#website',
        url: 'https://flux3d.in',
        name: profile.brandName,
        description: profile.businessDescription,
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://flux3d.in/gallery?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Service',
        name: 'Custom 3D Printing',
        provider: { '@type': 'Organization', name: profile.legalName },
        areaServed: 'IN',
        serviceType: 'Custom 3D Printing',
      },
    ],
  }

  // The hero uses next/image with `priority`, which already emits an
  // optimized <link rel="preload"> in the head — no manual preload needed.
  return (
    <div className="public-shell">
      <script
        nonce={CSP_NONCE}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(structuredData) }}
      />
      <script
        nonce={CSP_NONCE}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(faqPageJsonLd) }}
      />
      <Navbar transparent />
      <main>
        <HeroSection shopData={shopData} />
        <LandingShopSection data={shopData} />
        <LandingPageBoundary />
      </main>
    </div>
  )
}
