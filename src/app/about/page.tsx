import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import FooterSection from '@/app/landing/FooterSection'
import AboutContent from './AboutContent'

export const metadata: Metadata = {
  title: 'About Flux 3D — India\'s Premier 3D Printing Studio | Pune Based',
  description: 'Learn about Flux 3D, Pune-based 3D printing studio using Bambu Lab printers for precision parts, prototypes, and products across India. Fast turnaround, transparent pricing.',
  keywords: ['3D printing Pune', 'Bambu Lab 3D printing India', 'additive manufacturing studio', 'Flux 3D about', 'precision 3D printing'],
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About Flux 3D — Where Ideas Become Reality',
    description: 'Pune-based additive manufacturing studio using Bambu Lab printers. Serving makers, engineers, startups across India with precision 3D printing.',
    url: '/about',
    type: 'website',
  },
  twitter: {
    title: 'About Flux 3D — India\'s Premier 3D Printing Studio',
    description: 'Precision additive manufacturing studio based in Pune. Bambu Lab-powered 3D printing for all industries across India.',
  },
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
      <Navbar />
      <main>
        <AboutContent />
      </main>
      <FooterSection />
    </div>
  )
}
