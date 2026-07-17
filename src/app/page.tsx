import type { Metadata } from 'next'

export const dynamic = 'force-static'
export const revalidate = 86400

import { getSettings } from '@/lib/settings'
import { buildPublicBusinessProfile } from '@/lib/public-business'
import { faqPageJsonLd, makeLocalBusinessJsonLd } from '@/lib/structured-data'
import HeroSection from './landing/HeroSection'
import HomeNavbar from './landing/HomeNavbar'
import LandingPageBoundary from './landing/LandingPageBoundary'

export const metadata: Metadata = {
  title: {
    absolute: 'Flux3D — Custom 3D Printing and Manufacturing Services in India',
  },
  description:
    'Flux3D provides custom 3D printing, prototyping, model printing, ready-made products, and related manufacturing services in India.',
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

  return (
    <div className="public-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(faqPageJsonLd) }}
      />
      <HomeNavbar />
      <main>
        <HeroSection />
        <LandingPageBoundary />
      </main>
    </div>
  )
}
