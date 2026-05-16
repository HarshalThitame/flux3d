import { Metadata } from 'next'
import { getSettings } from '@/lib/settings'

export const dynamic = 'force-static'

import Navbar from '@/components/Navbar'
import ServicesHero from './ServicesHero'
import ServicesList from './ServicesList'
import WhyChooseUs from './WhyChooseUs'
import HowToOrder from './HowToOrder'
import BottomCTA from './BottomCTA'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title: `${settings.businessName} — 3D Printing Services — Industrial, Medical, Student & More`,
    description:
      settings.businessDescription || 'From industrial-grade spare parts to custom gifts — Flux 3D delivers precision prints for every need, across India. 7 specializations, Bambu Lab P2S fleet, Pan-India delivery.',
    keywords: [
      '3D printing services India',
      'industrial spare parts 3D printing',
      'architecture model printing',
      'student 3D printing',
      'medical 3D printing',
      'corporate gifting 3D',
      'custom 3D printed products',
      'creator props 3D printing',
    ],
    alternates: {
      canonical: '/services',
    },
    openGraph: {
      title: `${settings.businessName} — 3D Printing Services — Industrial, Medical, Student & More`,
      description:
        settings.businessDescription || 'From industrial-grade spare parts to custom gifts — Flux 3D delivers precision prints for every need, across India.',
      type: 'website',
    },
  }
}

export default function ServicesPage() {
  return (
    <div className="public-shell">
      <Navbar transparent />
      <ServicesHero />
      <div className="bg-[var(--bg-soft)]">
        <ServicesList />
      </div>
      <div className="bg-white">
        <WhyChooseUs />
      </div>
      <div className="bg-[var(--bg-soft)]">
        <HowToOrder />
      </div>
      <div className="bg-white">
        <BottomCTA />
      </div>
    </div>
  )
}
