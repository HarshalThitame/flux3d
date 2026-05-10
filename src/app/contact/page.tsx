import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import ContactContent from './ContactContent'
import FooterSection from '@/app/landing/FooterSection'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title: `${settings.businessName} — Get in Touch`,
    description: settings.businessDescription || 'Contact Flux 3D for 3D printing inquiries, custom orders, and support. Based in Pune, serving all of India.',
    keywords: ['contact Flux 3D', '3D printing Pune contact', 'Flux 3D email', '3D printing support India'],
    alternates: { canonical: '/contact' },
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
