import { Metadata } from 'next'

export const dynamic = 'force-static'

import Navbar from '@/components/Navbar'
import ServicesHero from './ServicesHero'
import ServicesList from './ServicesList'
import WhyChooseUs from './WhyChooseUs'
import HowToOrder from './HowToOrder'
import BottomCTA from './BottomCTA'

export const metadata: Metadata = {
  title: '3D Printing Services — Industrial, Medical, Student & More | Flux 3D',
  description:
    'From industrial-grade spare parts to custom gifts — Flux 3D delivers precision prints for every need, across India. 7 specializations, Bambu Lab P2S fleet, Pan-India delivery.',
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
    title: '3D Printing Services — Industrial, Medical, Student & More | Flux 3D',
    description:
      'From industrial-grade spare parts to custom gifts — Flux 3D delivers precision prints for every need, across India.',
    type: 'website',
  },
}

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
      <Navbar transparent />
      <ServicesHero />
      <ServicesList />
      <WhyChooseUs />
      <HowToOrder />
      <BottomCTA />
    </div>
  )
}
