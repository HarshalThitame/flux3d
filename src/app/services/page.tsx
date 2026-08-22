import { Metadata } from 'next'

import Navbar from '@/components/Navbar'
import ServicesClientBoundary from './ServicesClientBoundary'

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
    <div className="services-premium-shell min-h-screen overflow-hidden">
      <Navbar transparent />
      <ServicesClientBoundary />
    </div>
  )
}
