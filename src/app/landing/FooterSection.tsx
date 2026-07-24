'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, Clock, Camera, Users, Globe, Send } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'
import { fadeUp, viewportOnce } from '@/lib/animation-variants'

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

  const supportEmail = settings.supportEmail || settings.primaryEmail || 'flux3d.in@gmail.com'
  const supportPhone = settings.primaryPhone || '+919623023480'

  const businessYear = new Date().getFullYear()

  return (
    <footer className="footer-v2">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(109,40,217,0.15)] to-transparent" />

      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        className="relative z-10 mx-auto max-w-[1200px] px-6"
      >
        <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="footer-v2-brand">
              <span>{settings.businessName}</span>
            </div>
            <p className="mb-6 max-w-[320px] text-sm leading-[1.7] text-[#6b7280]">
              {settings.businessDescription || `Flux3D provides custom 3D printing, prototyping, model printing and related manufacturing services for individuals and businesses across India.`}
            </p>
            <p className="mb-6 max-w-[320px] text-xs leading-[1.7] text-[#9ca3af]">
              Brand: {settings.brandName || settings.businessName}. Legal operator: {settings.legalBusinessName || settings.businessName}. {settings.city ? `${settings.city}, ${settings.state}` : 'India'}.
            </p>

            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3">
                {socialLinks.map((social, i) => (
                  <a
                    key={i}
                    href={social.href}
                    aria-label={social.label}
                    className="footer-v2-social"
                  >
                    <social.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#0a0a0a] mb-4">Product</h3>
            <ul className="space-y-2">
              {[
                { label: 'Features', href: '/features' },
                { label: 'Pricing', href: '/pricing' },
                { label: 'Request a Quote', href: '/contact' },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm text-[#6b7280] transition-colors hover:text-[#6d28d9]">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#0a0a0a] mb-4">Company</h3>
            <ul className="space-y-2">
              {[
                { label: 'About Us', href: '/about' },
                { label: 'Contact Us', href: '/contact' },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm text-[#6b7280] transition-colors hover:text-[#6d28d9]">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#0a0a0a] mb-4">Legal</h3>
            <ul className="space-y-2">
              {[
                { label: 'Privacy Policy', href: settings.privacyPolicyUrl || '/privacy-policy' },
                { label: 'Refund & Cancellation Policy', href: settings.refundPolicyUrl || '/refund-policy' },
                { label: 'Terms & Conditions', href: settings.termsUrl || '/terms-and-conditions' },
                { label: 'Service Delivery Policy', href: settings.shippingPolicyUrl || '/service-delivery-policy' },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm text-[#6b7280] transition-colors hover:text-[#6d28d9]">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#0a0a0a] mb-4">Contact</h3>
            <ul className="space-y-3">
              {(settings.addressLine1 || settings.city) && (
                <li className="flex items-start gap-2 text-sm text-[#6b7280]">
                  <MapPin className="mt-0.5 h-4 w-4 text-[#6d28d9] flex-shrink-0" />
                  {addressParts || 'Sawargaon Tal, Sangamner — Maharashtra — 422605'}
                </li>
              )}
              {supportPhone && (
                <li className="flex items-center gap-2 text-sm text-[#6b7280]">
                  <Phone className="h-4 w-4 text-[#6d28d9] flex-shrink-0" />
                  <a href={`tel:${supportPhone.replace(/[^0-9+]/g, '')}`}>{supportPhone}</a>
                </li>
              )}
              {supportEmail && (
                <li className="flex items-center gap-2 text-sm text-[#6b7280]">
                  <Mail className="h-4 w-4 text-[#6d28d9] flex-shrink-0" />
                  <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
                </li>
              )}
              {settings.businessHours && (
                <li className="flex items-center gap-2 text-sm text-[#6b7280]">
                  <Clock className="h-4 w-4 text-[#6d28d9] flex-shrink-0" />
                  {settings.businessHours}
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mb-8 border-t border-[rgba(109,40,217,0.06)] pt-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-[#9ca3af]">Payment Methods</p>
              <div className="flex flex-wrap gap-2">
                {['UPI', 'Cards', 'Net Banking', 'Razorpay'].map((method) => (
                  <span key={method} className="footer-v2-badge">{method}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-[#9ca3af]">Delivery Partners</p>
              <div className="flex flex-wrap gap-2">
                {['Courier partner', 'Dispatch tracking', 'Serviceable locations'].map((partner) => (
                  <span key={partner} className="footer-v2-badge">{partner}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="footer-v2-bottom">
          <p className="text-[#6b7280]">&copy; {businessYear} {settings.brandName || settings.businessName} · {settings.legalBusinessName || settings.businessName}.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href={settings.privacyPolicyUrl || '/privacy-policy'} className="text-[#6b7280] transition-colors hover:text-[#6d28d9]">Privacy Policy</Link>
            <Link href={settings.termsUrl || '/terms-and-conditions'} className="text-[#6b7280] transition-colors hover:text-[#6d28d9]">Terms &amp; Conditions</Link>
            <Link href={settings.refundPolicyUrl || '/refund-policy'} className="text-[#6b7280] transition-colors hover:text-[#6d28d9]">Refund &amp; Cancellation Policy</Link>
            <Link href={settings.shippingPolicyUrl || '/service-delivery-policy'} className="text-[#6b7280] transition-colors hover:text-[#6d28d9]">Service Delivery Policy</Link>
            <Link href="/security" className="text-[#6b7280] transition-colors hover:text-[#6d28d9]">Security</Link>
          </div>
        </div>

        <p className="mt-8 text-center text-[10px] leading-[1.6] text-[#9ca3af]">
          {settings.brandName || settings.businessName} provides custom 3D printing and manufacturing services. Ready-made products are shipped after order confirmation where applicable.
        </p>
      </motion.div>
    </footer>
  )
}
