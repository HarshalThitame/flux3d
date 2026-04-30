import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import { localBusinessJsonLd } from '@/lib/structured-data'
import { absoluteUrl } from '@/lib/site'
import HeroSection from './landing/HeroSection'
import ProblemSection from './landing/ProblemSection'
import MarqueeSection from './landing/MarqueeSection'
import ServicesSection from './landing/ServicesSection'
import MaterialsSection from './landing/MaterialsSection'
import TechnologySection from './landing/TechnologySection'
import HowItWorksSection from './landing/HowItWorksSection'
import PricingSection from './landing/PricingSection'
import TestimonialsSection from './landing/TestimonialsSection'
import TrustSection from './landing/TrustSection'
import FAQSection from './landing/FAQSection'
import FinalCTASection from './landing/FinalCTASection'
import FooterSection from './landing/FooterSection'

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
      <Navbar transparent />
      <main>
        <HeroSection />
        <ProblemSection />
        <MarqueeSection />
        <ServicesSection />
        <MaterialsSection />
        <TechnologySection />
        <HowItWorksSection />
        <PricingSection />
        <TestimonialsSection />
        <TrustSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <FooterSection />
    </div>
  )
}
