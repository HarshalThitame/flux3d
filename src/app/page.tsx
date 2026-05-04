import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import { localBusinessJsonLd, faqPageJsonLd } from '@/lib/structured-data'
import { absoluteUrl } from '@/lib/site'
import HeroSection from './landing/HeroSection'
import LandingPageClient from './landing/LandingPageClient'

export const metadata: Metadata = {
  title: 'Flux 3D — Premium 3D Printing Services in India | Starting ₹99',
  description:
    'Flux 3D offers professional FDM & resin 3D printing services across India. Industrial parts, architecture models, dental models, corporate gifts & more. Printed on Bambu Lab P2S. Fast delivery, GST invoices. Starting at ₹99.',
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
    title: 'Flux 3D — India\'s Premium 3D Printing Service | ₹99 Onwards',
    description:
      'Professional 3D printing for industrial parts, architecture, students, medical, creators & corporate gifting. Bambu Lab P2S fleet. Pan-India delivery. GST invoices.',
    url: absoluteUrl('/'),
    type: 'website',
  },
  twitter: {
    title: 'Flux 3D — India\'s Premium 3D Printing Service | ₹99 Onwards',
    description:
      'Professional 3D printing for industrial parts, architecture, students, medical, creators & corporate gifting. Bambu Lab P2S fleet. Pan-India delivery.',
  },
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
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
