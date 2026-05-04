import type { Metadata } from 'next'
import ContactContent from './ContactContent'
import FooterSection from '@/app/landing/FooterSection'

export const metadata: Metadata = {
  title: 'Contact Flux 3D — Get in Touch | Pune, India',
  description: 'Contact Flux 3D for 3D printing inquiries, custom orders, and support. Based in Pune, serving all of India.',
  keywords: ['contact Flux 3D', '3D printing Pune contact', 'Flux 3D email', '3D printing support India'],
  alternates: { canonical: '/contact' },
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
      <ContactContent />
      <FooterSection />
    </div>
  )
}
