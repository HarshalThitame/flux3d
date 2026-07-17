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
  const footerLinkClass = "text-sm text-slate-400 transition-colors hover:text-white"
  const footerHeadingClass = "mb-4 font-[var(--font-dm)] text-[13px] font-semibold uppercase tracking-normal text-white"
  const badgeClass = "rounded border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-slate-300"

  return (
    <footer className="footer">
      <div className="footer-watermark">FLUX3D</div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#6d28d9]/30" />

      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        className="relative z-10 mx-auto max-w-[1200px] px-6"
      >
        <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="footer-brand">
              <span>{settings.businessName}</span>
            </div>
            <p className="mb-6 max-w-[320px] text-sm leading-[1.7] text-slate-400">
              {settings.businessDescription || `Flux3D provides custom 3D printing, prototyping, model printing and related manufacturing services for individuals and businesses across India.`}
            </p>
            <p className="mb-6 max-w-[320px] text-xs leading-[1.7] text-slate-500">
              Brand: {settings.brandName || settings.businessName}. Legal operator: {settings.legalBusinessName || settings.businessName}. {settings.city ? `${settings.city}, ${settings.state}` : 'India'}.
            </p>

            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3">
                {socialLinks.map((social, i) => (
                  <a
                    key={i}
                    href={social.href}
                    aria-label={social.label}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-all duration-200 hover:border-white/25 hover:text-white hover:-translate-y-0.5 hover:scale-[1.03] active:scale-[0.97]"
                  >
                    <social.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className={footerHeadingClass}>Product</h3>
            <ul className="space-y-2">
              {[
                { label: 'Features', href: '/features' },
                { label: 'Pricing', href: '/pricing' },
                { label: 'Request a Quote', href: '/contact' },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className={footerLinkClass}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={footerHeadingClass}>Company</h3>
            <ul className="space-y-2">
              {[
                { label: 'About Us', href: '/about' },
                { label: 'Contact Us', href: '/contact' },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className={footerLinkClass}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={footerHeadingClass}>Legal</h3>
            <ul className="space-y-2">
              {[
                { label: 'Privacy Policy', href: '/privacy-policy' },
                { label: 'Refund & Cancellation Policy', href: '/refund-policy' },
                { label: 'Terms & Conditions', href: '/terms-and-conditions' },
                { label: 'Service Delivery Policy', href: '/service-delivery-policy' },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className={footerLinkClass}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={footerHeadingClass}>Contact</h3>
            <ul className="space-y-3">
              {(settings.addressLine1 || settings.city) && (
                <li className="flex items-start gap-2 text-sm text-slate-400">
                  <MapPin className="mt-0.5 h-4 w-4 text-cyan-300" />
                  {addressParts || 'Sawargaon Tal, Sangamner — Maharashtra — 422605'}
                </li>
              )}
              {supportPhone && (
                <li className="flex items-center gap-2 text-sm text-slate-400">
                  <Phone className="h-4 w-4 text-cyan-300" />
                  <a href={`tel:${supportPhone.replace(/[^0-9+]/g, '')}`}>{supportPhone}</a>
                </li>
              )}
              {supportEmail && (
                <li className="flex items-center gap-2 text-sm text-slate-400">
                  <Mail className="h-4 w-4 text-cyan-300" />
                  <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
                </li>
              )}
              {settings.businessHours && (
                <li className="flex items-center gap-2 text-sm text-slate-400">
                  <Clock className="h-4 w-4 text-cyan-300" />
                  {settings.businessHours}
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mb-8 border-t border-white/10 pt-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-normal text-slate-500">Payment Methods</p>
              <div className="flex flex-wrap gap-2">
                {['UPI', 'Cards', 'Net Banking', 'PayU'].map((method) => (
                  <span key={method} className={badgeClass}>{method}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-normal text-slate-500">Delivery Partners</p>
              <div className="flex flex-wrap gap-2">
                {['Courier partner', 'Dispatch tracking', 'Serviceable locations'].map((partner) => (
                  <span key={partner} className={badgeClass}>{partner}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom flex-col items-center gap-4 text-xs md:flex-row">
          <p>&copy; {businessYear} {settings.brandName || settings.businessName} · {settings.legalBusinessName || settings.businessName}.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/privacy-policy" className="transition-colors hover:text-white">Privacy Policy</Link>
            <Link href="/terms-and-conditions" className="transition-colors hover:text-white">Terms &amp; Conditions</Link>
            <Link href="/refund-policy" className="transition-colors hover:text-white">Refund &amp; Cancellation Policy</Link>
            <Link href="/service-delivery-policy" className="transition-colors hover:text-white">Service Delivery Policy</Link>
            <Link href="/security" className="transition-colors hover:text-white">Security</Link>
          </div>
        </div>

        <p className="mt-8 text-center text-[10px] leading-[1.6] text-slate-500">
          {settings.brandName || settings.businessName} provides custom 3D printing and manufacturing services. Ready-made products are shipped after order confirmation where applicable.
        </p>
      </motion.div>
    </footer>
  )
}
