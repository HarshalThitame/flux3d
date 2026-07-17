import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import ContactContent from './ContactContent'
import FooterSection from '@/app/landing/FooterSection'
import { buildPublicBusinessProfile, validatePublicBusinessProfile } from '@/lib/public-business'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  const profile = buildPublicBusinessProfile(settings)
  const missing = validatePublicBusinessProfile(profile)
  if (missing.length > 0) {
    throw new Error(`Missing required public business fields: ${missing.join(', ')}`)
  }
  return {
    title: 'Contact Us',
    description: `Contact ${profile.brandName} for custom 3D printing quotes, production support, and delivery questions. Based in ${profile.jurisdictionCity}, ${profile.jurisdictionState}.`,
    keywords: ['contact Flux3D', '3D printing contact India', 'Flux3D support email', 'custom manufacturing support'],
    alternates: { canonical: '/contact' },
    openGraph: {
      title: 'Contact Us',
      description: `Contact ${profile.brandName} for custom 3D printing quotes, production support, and delivery questions. Based in ${profile.jurisdictionCity}, ${profile.jurisdictionState}.`,
      url: 'https://flux3d.in/contact',
      type: 'website',
    },
    twitter: {
      title: 'Contact Us',
      description: `Contact ${profile.brandName} for custom 3D printing quotes, production support, and delivery questions. Based in ${profile.jurisdictionCity}, ${profile.jurisdictionState}.`,
    },
  }
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0F1B3D]">
      <ContactContent />
      <FooterSection />
    </div>
  )
}
