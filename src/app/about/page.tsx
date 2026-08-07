import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import { buildPublicBusinessProfile, validatePublicBusinessProfile } from '@/lib/public-business'

export const dynamic = 'force-static'

import Navbar from '@/components/Navbar'
import FooterSection from '@/app/landing/FooterSection'
import AboutContent from './AboutContent'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  const profile = buildPublicBusinessProfile(settings)
  const missing = validatePublicBusinessProfile(profile)
  if (missing.length > 0) {
    throw new Error(`Missing required public business fields: ${missing.join(', ')}`)
  }
  return {
    title: 'About Us',
    description: `${profile.brandName} is the public brand used by ${profile.legalName} for custom 3D printing and manufacturing services in India.`,
    keywords: ['Flux3D about', 'custom 3D printing India', 'custom manufacturing India', 'Flux3D legal name', '3D printing services'],
    alternates: { canonical: '/about' },
    openGraph: {
      title: 'About Us',
      description: `${profile.brandName} is the public brand used by ${profile.legalName} for custom 3D printing and manufacturing services in India.`,
      url: 'https://flux3d.in/about',
      type: 'website',
    },
    twitter: {
      title: 'About Us',
      description: `${profile.brandName} is the public brand used by ${profile.legalName} for custom 3D printing and manufacturing services in India.`,
    },
  }
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#070b1d]">
      <Navbar />
      <main>
        <AboutContent />
      </main>
      <FooterSection />
    </div>
  )
}
