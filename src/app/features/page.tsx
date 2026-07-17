import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import ServicesClientBoundary from '../services/ServicesClientBoundary'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: '3D Printing Services',
  description: 'Explore Flux3D services, materials, quote flow, and delivery support for custom 3D printing across India.',
  alternates: {
    canonical: '/features',
  },
  openGraph: {
    title: '3D Printing Services',
    description: 'Explore Flux3D services, materials, quote flow, and delivery support for custom 3D printing across India.',
    url: 'https://flux3d.in/features',
    type: 'website',
  },
  twitter: {
    title: '3D Printing Services',
    description: 'Explore Flux3D services, materials, quote flow, and delivery support for custom 3D printing across India.',
  },
}

export default function FeaturesPage() {
  return (
    <div className="services-premium-shell min-h-screen overflow-hidden bg-[#05060A] text-white">
      <Navbar transparent />
      <ServicesClientBoundary />
    </div>
  )
}
