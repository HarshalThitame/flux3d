import type { Metadata } from 'next'

export const revalidate = 86400

import Navbar from '@/components/Navbar'
import { faqPageJsonLd } from '@/lib/structured-data'
import HeroSection from './landing/HeroSection'
import LandingPageClient from './landing/LandingPageClient'

export const metadata: Metadata = {
  title: {
    absolute: 'Flux3D — Premium 3D Printing Services in India | Starting ₹99',
  },
  description:
    "India's most trusted 3D printing service. Custom FDM & resin printing for industrial parts, architecture models, student projects, medical models & corporate gifts. Powered by Bambu Lab P2S. Pan-India delivery. Starting ₹99.",
  alternates: {
    canonical: 'https://flux3d.in',
  },
}

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'LocalBusiness',
      '@id': 'https://flux3d.in/#business',
      name: 'Flux3D',
      description: "India's premium 3D printing service",
      url: 'https://flux3d.in',
      telephone: '+919623023480',
      email: 'flux3d.in@gmail.com',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Pune',
        addressRegion: 'Maharashtra',
        addressCountry: 'IN',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: '18.5204',
        longitude: '73.8567',
      },
      openingHours: 'Mo-Sa 09:00-19:00',
      priceRange: '₹₹',
      image: 'https://flux3d.in/opengraph-image.png',
      sameAs: [],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://flux3d.in/#website',
      url: 'https://flux3d.in',
      name: 'Flux3D',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://flux3d.in/gallery?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Service',
      name: 'Custom 3D Printing',
      provider: { '@id': 'https://flux3d.in/#business' },
      areaServed: 'IN',
      offers: {
        '@type': 'Offer',
        priceCurrency: 'INR',
        price: '99',
        description: 'Custom 3D printing starting at ₹99',
      },
    },
  ],
}

function toJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

export default function Home() {
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
      <Navbar transparent />
      <main>
        <HeroSection />
        <LandingPageClient />
      </main>
    </div>
  )
}
