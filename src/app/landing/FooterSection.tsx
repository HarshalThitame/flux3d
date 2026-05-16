'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
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
  const footerLinkClass = "text-sm text-slate-400 transition-colors hover:text-white"
  const footerHeadingClass = "mb-4 font-[var(--font-dm)] text-[13px] font-semibold uppercase tracking-[0.08em] text-white"
  const badgeClass = "rounded border border-white/10 bg-white/5 px-2 py-1 font-[var(--font-mono)] text-xs text-slate-300"

  return (
    <footer className="footer">
      <div className="footer-watermark">FLUX3D</div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(109,40,217,0.22),transparent_70%)]" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mx-auto max-w-[1200px] px-6"
      >
        {/* Top section */}
        <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="footer-brand">
              <span>{settings.businessName}</span>
            </div>
            <p className="mb-6 max-w-[320px] text-sm leading-[1.7] text-slate-400">
              {settings.businessDescription || `Precision 3D printing for every need — industrial, architectural, medical, student, creator, and corporate. Made in India. Delivered across India.`}
            </p>

            {/* Social */}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3">
                {socialLinks.map((social, i) => (
                  <motion.a
                    key={i}
                    href={social.href}
                    aria-label={social.label}
                    whileHover={{ y: -2, scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-colors hover:border-white/25 hover:text-white"
                  >
                    <social.icon className="w-5 h-5" />
                  </motion.a>
                ))}
              </div>
            )}
          </div>

          {/* Services */}
          <div>
            <h3 className={footerHeadingClass}>Services</h3>
            <ul className="space-y-2">
              {['Industrial Parts', 'Architecture Models', 'Student Projects', 'Online Products', 'Medical & Dental', 'Creator Props', 'Corporate Gifting'].map((item) => (
                <li key={item}>
                  <Link href="/services" className={footerLinkClass}>
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className={footerHeadingClass}>Company</h3>
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
                  <Link href={item.href} className={footerLinkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className={footerHeadingClass}>Contact</h3>
            <ul className="space-y-3">
              {(settings.addressLine1 || settings.city) && (
                <li className="flex items-start gap-2 text-sm text-slate-400">
                  <MapPin className="mt-0.5 h-4 w-4 text-cyan-300" />
                  {addressParts || 'Mumbai, Maharashtra — 400053'}
                </li>
              )}
              {settings.primaryPhone && (
                <li className="flex items-center gap-2 text-sm text-slate-400">
                  <Phone className="h-4 w-4 text-cyan-300" />
                  {settings.primaryPhone}
                </li>
              )}
              {settings.primaryEmail && (
                <li className="flex items-center gap-2 text-sm text-slate-400">
                  <Mail className="h-4 w-4 text-cyan-300" />
                  {settings.primaryEmail}
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

        {/* Payment & Delivery */}
        <div className="mb-8 border-t border-white/10 pt-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            {/* Payment */}
            <div>
              <p className="mb-2 font-[var(--font-mono)] text-xs uppercase tracking-[0.12em] text-slate-500">Payment Methods</p>
              <div className="flex flex-wrap gap-2">
                {['UPI', 'Razorpay', 'Google Pay', 'PhonePe', 'Visa', 'Mastercard'].map((method) => (
                  <span key={method} className={badgeClass}>
                    {method}
                  </span>
                ))}
              </div>
            </div>

            {/* Delivery */}
            <div>
              <p className="mb-2 font-[var(--font-mono)] text-xs uppercase tracking-[0.12em] text-slate-500">Delivery Partners</p>
              <div className="flex flex-wrap gap-2">
                {['Delhivery', 'Shiprocket', 'DTDC'].map((partner) => (
                  <span key={partner} className={badgeClass}>
                    {partner}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="footer-bottom flex-col items-center gap-4 text-xs md:flex-row">
          <p>&copy; {businessYear} {settings.legalBusinessName || settings.businessName} &middot; All Rights Reserved</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
             <Link href="/privacy-policy" className="transition-colors hover:text-white">Privacy Policy</Link>
             <Link href="/terms-of-service" className="transition-colors hover:text-white">Terms of Service</Link>
             <Link href="/refund-policy" className="transition-colors hover:text-white">Refund Policy</Link>
             <Link href="/shipping-policy" className="transition-colors hover:text-white">Shipping Policy</Link>
           </div>
        </div>

        {/* SEO footer text */}
        <p className="mt-8 text-center text-[10px] leading-[1.6] text-slate-500">
           {settings.businessName} provides professional 3D printing services across India. Specializing in FDM and resin 3D printing for industrial, architectural, medical, student, and corporate clients. Starting at ₹99.
        </p>
      </motion.div>
    </footer>
  )
}
