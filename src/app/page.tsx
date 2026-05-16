import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'

export const revalidate = 86400

import Navbar from '@/components/Navbar'
import { localBusinessJsonLd, faqPageJsonLd } from '@/lib/structured-data'
import { absoluteUrl } from '@/lib/site'
import HeroSection from './landing/HeroSection'
import LandingPageClient from './landing/LandingPageClient'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title: `${settings.businessName} — Premium 3D Printing Services in India | Starting ₹99`,
    description:
      settings.businessDescription || 'Flux 3D offers professional FDM & resin 3D printing services across India. Industrial parts, architecture models, dental models, corporate gifts & more. Printed on Bambu Lab P2S. Fast delivery. Starting at ₹99.',
    keywords: [
      '3D printing India',
      '3D printing Mumbai',
      '3D printing services India',
      'FDM printing India',
      'resin printing India',
      'industrial 3D printing',
      'architecture models India',
      'dental 3D printing',
      'corporate gifting 3D print',
      'Bambu 3D printer India',
      'custom 3D prints India',
      '3D printing near me',
      '3D printing online India',
      'cheap 3D printing India',
      '3D printing for students India',
    ],
    alternates: {
      canonical: '/',
    },
    openGraph: {
      title: `${settings.businessName} — India's Premium 3D Printing Service | ₹99 Onwards`,
      description:
        settings.businessDescription || 'Professional 3D printing for industrial parts, architecture, students, medical, creators & corporate gifting. Bambu Lab P2S fleet. Pan-India delivery.',
      url: absoluteUrl('/'),
      type: 'website',
    },
    twitter: {
      title: `${settings.businessName} — India's Premium 3D Printing Service | ₹99 Onwards`,
      description:
        settings.businessDescription || 'Professional 3D printing for industrial parts, architecture, students, medical, creators & corporate gifting. Bambu Lab P2S fleet. Pan-India delivery.',
    },
  }
}

export default function Home() {
  return (
    <div className="public-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd) }}
      />
      <Navbar transparent />
      <main>
        <HeroSection />
        <LandingPageClient />
      </main>
    </div>
  )
}
