'use client'

import Link from 'next/link'
import { Mail, Phone, MapPin, Clock, Camera, Users, Globe, Send } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'
import Reveal from '@/components/Reveal'

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
  const footerLinkClass = "text-sm text-[var(--shop-text-secondary,#44403C)] transition-colors hover:text-[var(--shop-gold,#C9A962)]"
  const footerHeadingClass = "mb-4 font-[var(--shop-font-heading)] text-xs font-bold uppercase tracking-[0.14em] text-[var(--shop-gold,#C9A962)]"
  const badgeClass = "rounded-lg border border-[var(--shop-border-light,#E7E5E0)] bg-[var(--shop-bg-elevated,#FFFFFF)] px-3 py-1 text-xs font-medium text-[var(--shop-text-muted,#78716C)] shadow-sm"

  return (
    <footer className="footer border-t border-[var(--shop-border-light,#E7E5E0)] bg-[var(--shop-bg-base,#FDFCF8)] py-12 md:py-16">
      <Reveal className="relative z-10 mx-auto max-w-[1200px] px-6">
        <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="footer-brand font-[var(--shop-font-heading)] text-2xl font-semibold text-[var(--shop-text-primary,#1C1917)] mb-3">
              <span>{settings.businessName}</span>
            </div>
            <p className="mb-6 max-w-[320px] text-sm leading-[1.7] text-[var(--shop-text-secondary,#44403C)]">
              {settings.businessDescription || `Flux3D provides custom 3D printing, prototyping, model printing and related manufacturing services for individuals and businesses across India.`}
            </p>
            <p className="mb-6 max-w-[320px] text-xs leading-[1.7] text-[var(--shop-text-muted,#78716C)]">
              Brand: {settings.brandName || settings.businessName}. Legal operator: {settings.legalBusinessName || settings.businessName}. {settings.city ? `${settings.city}, ${settings.state}` : 'India'}.
            </p>

            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3">
                {socialLinks.map((social, i) => (
                  <a
                    key={i}
                    href={social.href}
                    aria-label={social.label}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--shop-border-light,#E7E5E0)] bg-[var(--shop-bg-elevated,#FFFFFF)] text-[var(--shop-text-secondary,#44403C)] transition-all duration-200 hover:border-[var(--shop-gold,#C9A962)] hover:text-[var(--shop-gold,#C9A962)] hover:-translate-y-0.5 shadow-sm"
                  >
                    <social.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className={footerHeadingClass}>Product</h3>
            <ul className="space-y-2">
              {[
                { label: 'Services', href: '/services' },
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
                { label: 'Privacy Policy', href: settings.privacyPolicyUrl || '/privacy-policy' },
                { label: 'Refund & Cancellation Policy', href: settings.refundPolicyUrl || '/refund-policy' },
                { label: 'Terms & Conditions', href: settings.termsUrl || '/terms-and-conditions' },
                { label: 'Service Delivery Policy', href: settings.shippingPolicyUrl || '/service-delivery-policy' },
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
                <li className="flex items-start gap-2 text-sm text-[var(--shop-text-secondary,#44403C)]">
                  <MapPin className="mt-0.5 h-4 w-4 text-[var(--shop-gold,#C9A962)] shrink-0" />
                  {addressParts || 'Sawargaon Tal, Sangamner — Maharashtra — 422605'}
                </li>
              )}
              {supportPhone && (
                <li className="flex items-center gap-2 text-sm text-[var(--shop-text-secondary,#44403C)]">
                  <Phone className="h-4 w-4 text-[var(--shop-gold,#C9A962)] shrink-0" />
                  <a href={`tel:${supportPhone.replace(/[^0-9+]/g, '')}`}>{supportPhone}</a>
                </li>
              )}
              {supportEmail && (
                <li className="flex items-center gap-2 text-sm text-[var(--shop-text-secondary,#44403C)]">
                  <Mail className="h-4 w-4 text-[var(--shop-gold,#C9A962)] shrink-0" />
                  <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
                </li>
              )}
              {settings.businessHours && (
                <li className="flex items-center gap-2 text-sm text-[var(--shop-text-secondary,#44403C)]">
                  <Clock className="h-4 w-4 text-[var(--shop-gold,#C9A962)] shrink-0" />
                  {settings.businessHours}
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mb-8 border-t border-[var(--shop-border-light,#E7E5E0)] pt-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--shop-gold,#C9A962)]">Payment Methods</p>
              <div className="flex flex-wrap gap-2">
                {['UPI', 'Cards', 'Net Banking', 'Razorpay'].map((method) => (
                  <span key={method} className={badgeClass}>{method}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--shop-gold,#C9A962)]">Delivery Partners</p>
              <div className="flex flex-wrap gap-2">
                {['Courier partner', 'Dispatch tracking', 'Serviceable locations'].map((partner) => (
                  <span key={partner} className={badgeClass}>{partner}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom flex flex-col items-center justify-between gap-4 border-t border-[var(--shop-border-light,#E7E5E0)] pt-6 text-xs md:flex-row">
          <p className="text-[var(--shop-text-muted,#78716C)]">&copy; {businessYear} {settings.brandName || settings.businessName} · {settings.legalBusinessName || settings.businessName}.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href={settings.privacyPolicyUrl || '/privacy-policy'} className="text-[var(--shop-text-muted,#78716C)] transition-colors hover:text-[var(--shop-gold,#C9A962)]">Privacy Policy</Link>
            <Link href={settings.termsUrl || '/terms-and-conditions'} className="text-[var(--shop-text-muted,#78716C)] transition-colors hover:text-[var(--shop-gold,#C9A962)]">Terms &amp; Conditions</Link>
            <Link href={settings.refundPolicyUrl || '/refund-policy'} className="text-[var(--shop-text-muted,#78716C)] transition-colors hover:text-[var(--shop-gold,#C9A962)]">Refund &amp; Cancellation Policy</Link>
            <Link href={settings.shippingPolicyUrl || '/service-delivery-policy'} className="text-[var(--shop-text-muted,#78716C)] transition-colors hover:text-[var(--shop-gold,#C9A962)]">Service Delivery Policy</Link>
            <Link href="/security" className="text-[var(--shop-text-muted,#78716C)] transition-colors hover:text-[var(--shop-gold,#C9A962)]">Security</Link>
          </div>
        </div>

        <p className="mt-8 text-center text-[10px] leading-[1.6] text-[var(--shop-text-subtle,#A8A29E)]">
          {settings.brandName || settings.businessName} provides custom 3D printing and manufacturing services. Ready-made products are shipped after order confirmation where applicable.
        </p>
      </Reveal>
    </footer>
  )
}
