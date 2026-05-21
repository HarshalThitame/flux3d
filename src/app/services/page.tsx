import { Metadata } from 'next'

export const dynamic = 'force-static'

import Navbar from '@/components/Navbar'
import ServicesHero from './ServicesHero'
import ServicesList from './ServicesList'
import WhyChooseUs from './WhyChooseUs'
import HowToOrder from './HowToOrder'
import FAQSection from './FAQSection'
import BottomCTA from './BottomCTA'

export const metadata: Metadata = {
  title: {
    absolute: '3D Printing Services — FDM, Resin & Rapid Prototyping | Flux3D',
  },
  description:
    "Explore Flux3D's full range of 3D printing services. FDM printing, SLA resin printing, rapid prototyping, custom parts & corporate gifting. Pan-India delivery.",
  alternates: {
    canonical: '/services',
  },
}

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FB] text-[#111827]">
      <Navbar transparent />
      <ServicesHero />
      <ServicesList />
      <WhyChooseUs />
      <HowToOrder />
      <FAQSection />
      <BottomCTA />
    </div>
  )
}
