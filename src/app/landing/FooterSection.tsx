'use client'

import Link from 'next/link'
import { Mail, Phone, MapPin, Clock, Camera, Users, Globe, Send } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'

export default function FooterSection() {
  const { settings } = useBusinessSettings()

  const socialLinks = [
    { icon: Camera, href: settings.instagramUrl, label: 'Instagram' },
    { icon: Users, href: settings.youtubeUrl, label: 'YouTube' },
    { icon: Globe, href: settings.linkedinUrl, label: 'LinkedIn' },
    { icon: Send, href: settings.twitterUrl, label: 'Twitter' },
  ].filter(s => s.href)

  const addressParts = [
    settings.addressLine1,
    settings.addressLine2,
    settings.city && settings.state ? `${settings.city}, ${settings.state}` : '',
    settings.postalCode,
  ].filter(Boolean).join(' — ')

  const businessYear = new Date().getFullYear()

  return (
    <footer className="relative border-t border-[rgba(124, 92, 255,0.5)] bg-[#FFFFFF]">
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        {/* Top section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="font-[var(--font-syne)] text-2xl font-extrabold text-[#0F1B3D] mb-4">
              <span className="text-[#5B3FD6]">{settings.businessName}</span>
            </div>
            <p className="text-sm text-[#6F7192] leading-[1.7] max-w-[320px] mb-6">
              {settings.businessDescription || `Precision 3D printing for every need — industrial, architectural, medical, student, creator, and corporate. Made in India. Delivered across India.`}
            </p>

            {/* Social */}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3">
                {socialLinks.map((social, i) => (
                  <a
                    key={i}
                    href={social.href}
                    aria-label={social.label}
                    className="w-10 h-10 rounded-lg bg-[rgba(124, 92, 255,0.4)] border border-[rgba(124, 92, 255,0.5)] flex items-center justify-center text-[#6F7192] hover:text-[#5B3FD6] hover:border-[rgba(124, 92, 255,0.3)] transition-colors"
                  >
                    <social.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-semibold text-[#0F1B3D] uppercase tracking-wider mb-4">Services</h3>
            <ul className="space-y-2">
              {['Industrial Parts', 'Architecture Models', 'Student Projects', 'Online Products', 'Medical & Dental', 'Creator Props', 'Corporate Gifting'].map((item) => (
                <li key={item}>
                  <Link href="/services" className="text-sm text-[#6F7192] hover:text-[#5B3FD6] transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-[#0F1B3D] uppercase tracking-wider mb-4">Company</h3>
            <ul className="space-y-2">
                {[
                  { label: `About ${settings.businessName}`, href: '/about' },
                  { label: 'Our Technology', href: '/#technology' },
                  { label: 'Gallery', href: '/gallery' },
                  { label: 'Pricing', href: '/pricing' },
                  { label: 'Blog', href: '/blog' },
                  { label: 'Careers', href: '/contact' },
                ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm text-[#6F7192] hover:text-[#5B3FD6] transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-[#0F1B3D] uppercase tracking-wider mb-4">Contact</h3>
            <ul className="space-y-3">
              {(settings.addressLine1 || settings.city) && (
                <li className="flex items-start gap-2 text-sm text-[#6F7192]">
                  <MapPin className="w-4 h-4 mt-0.5 text-[#5B3FD6]" />
                  {addressParts || 'Mumbai, Maharashtra — 400053'}
                </li>
              )}
              {settings.primaryPhone && (
                <li className="flex items-center gap-2 text-sm text-[#6F7192]">
                  <Phone className="w-4 h-4 text-[#5B3FD6]" />
                  {settings.primaryPhone}
                </li>
              )}
              {settings.primaryEmail && (
                <li className="flex items-center gap-2 text-sm text-[#6F7192]">
                  <Mail className="w-4 h-4 text-[#5B3FD6]" />
                  {settings.primaryEmail}
                </li>
              )}
              {settings.businessHours && (
                <li className="flex items-center gap-2 text-sm text-[#6F7192]">
                  <Clock className="w-4 h-4 text-[#5B3FD6]" />
                  {settings.businessHours}
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Payment & Delivery */}
        <div className="border-t border-[rgba(124, 92, 255,0.5)] pt-8 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Payment */}
            <div>
              <p className="text-xs text-[#6F7192] mb-2">Payment Methods</p>
              <div className="flex flex-wrap gap-2">
                {['UPI', 'Razorpay', 'Google Pay', 'PhonePe', 'Visa', 'Mastercard'].map((method) => (
                  <span key={method} className="text-xs bg-[rgba(124, 92, 255,0.4)] border border-[rgba(124, 92, 255,0.5)] text-[#6F7192] px-2 py-1 rounded">
                    {method}
                  </span>
                ))}
              </div>
            </div>

            {/* Delivery */}
            <div>
              <p className="text-xs text-[#6F7192] mb-2">Delivery Partners</p>
              <div className="flex flex-wrap gap-2">
                {['Delhivery', 'Shiprocket', 'DTDC'].map((partner) => (
                  <span key={partner} className="text-xs bg-[rgba(124, 92, 255,0.4)] border border-[rgba(124, 92, 255,0.5)] text-[#6F7192] px-2 py-1 rounded">
                    {partner}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#6F7192]">
          <p>&copy; {businessYear} {settings.legalBusinessName || settings.businessName} &middot; All Rights Reserved</p>
          <div className="flex items-center gap-4">
             <Link href="/privacy-policy" className="hover:text-[#0F1B3D] transition-colors">Privacy Policy</Link>
             <Link href="/terms-of-service" className="hover:text-[#0F1B3D] transition-colors">Terms of Service</Link>
             <Link href="/refund-policy" className="hover:text-[#0F1B3D] transition-colors">Refund Policy</Link>
             <Link href="/shipping-policy" className="hover:text-[#0F1B3D] transition-colors">Shipping Policy</Link>
           </div>
        </div>

        {/* SEO footer text */}
        <p className="mt-8 text-[10px] text-[#4a5070] leading-[1.6] text-center">
           {settings.businessName} provides professional 3D printing services across India. Specializing in FDM and resin 3D printing for industrial, architectural, medical, student, and corporate clients. Starting at &brvbar;99.
        </p>
      </div>
    </footer>
  )
}
