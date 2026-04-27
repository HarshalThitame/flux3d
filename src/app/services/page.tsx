import { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import { servicesPageJsonLd } from '@/lib/structured-data'
import { absoluteUrl } from '@/lib/site'
import ServicesHero from './ServicesHero'
import ServicesList from './ServicesList'
import MaterialsTech from './MaterialsTech'
import ProcessSteps from './ProcessSteps'
import WhyChooseUs from './WhyChooseUs'
import PricingCTA from './PricingCTA'
import FAQSection from './FAQSection'

export const metadata: Metadata = {
  title: '3D Printing Services in Pune and Across India',
  description:
    'Professional 3D printing services for prototypes, automotive jigs, fixtures, and custom CAD design with delivery across India.',
  keywords: [
    '3D printing services Pune',
    'rapid prototyping Pune',
    '3D printing for automotive',
    'FDM printing Pune',
    'resin printing India',
    'custom 3D modeling',
  ],
  alternates: {
    canonical: '/services',
  },
  openGraph: {
    title: '3D Printing Services in Pune and Across India',
    description:
      'Professional 3D printing services for rapid prototyping, industrial parts, and custom CAD design.',
    type: 'website',
    url: absoluteUrl('/services'),
  },
  twitter: {
    title: '3D Printing Services in Pune and Across India',
    description:
      'Professional 3D printing services for rapid prototyping, industrial parts, and custom CAD design.',
  },
}

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(servicesPageJsonLd) }}
      />
      <Navbar transparent />
      <ServicesHero />
      <ServicesList />
      <MaterialsTech />
      <ProcessSteps />
      <WhyChooseUs />
      <PricingCTA />
      <FAQSection />
    </div>
  )
}
