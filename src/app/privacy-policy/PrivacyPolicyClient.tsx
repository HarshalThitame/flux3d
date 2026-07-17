'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Shield, Database, Lock, Eye, Globe } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'

const sections = [
  { id: 'information', title: '1. Information We Collect', icon: Database },
  { id: 'usage', title: '2. How We Use Information', icon: Eye },
  { id: 'sharing', title: '3. Information Sharing', icon: Globe },
  { id: 'cookies', title: '4. Cookies and Tracking', icon: Database },
  { id: 'security', title: '5. Data Security', icon: Lock },
  { id: 'rights', title: '6. Your Rights and Requests', icon: Shield },
  { id: 'retention', title: '7. Data Retention', icon: Database },
  { id: 'children', title: "8. Children's Data", icon: Shield },
  { id: 'updates', title: '9. Changes to this Policy', icon: Eye },
  { id: 'contact', title: '10. Contact Us', icon: Globe },
]

export default function PrivacyPolicyClient() {
  const { settings } = useBusinessSettings()
  const supportEmail = settings.supportEmail || settings.primaryEmail || 'flux3d.in@gmail.com'
  const supportPhone = settings.primaryPhone || '+919623023480'
  const address = [
    settings.addressLine1,
    settings.addressLine2,
    settings.city,
    settings.state,
    settings.postalCode,
    settings.country,
  ].filter(Boolean).join(', ')

  const effectiveDate = 'July 17, 2026'
  const updatedDate = 'July 17, 2026'

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0F1B3D]">
      <div className="sticky top-0 z-50 border-b border-[#6d28d9]/10 bg-[#FFFFFF]/50 backdrop-blur-sm">
        <div className="mx-auto max-w-[1200px] px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="font-[var(--font-syne)] text-2xl font-extrabold text-[#0F1B3D]">
              flux<span className="text-[#6d28d9]">3d</span>
            </Link>
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#6F7192] transition-colors hover:text-[#0F1B3D]">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-6 py-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[280px_1fr]">
          <motion.aside initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="hidden lg:block">
            <div className="sticky top-24">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#0F1B3D]">Contents</h3>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <a key={section.id} href={`#${section.id}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#6F7192] transition-colors hover:bg-white/[0.03] hover:text-[#0F1B3D]">
                    <section.icon className="h-3.5 w-3.5" />
                    <span className="line-clamp-1">{section.title}</span>
                  </a>
                ))}
              </nav>
            </div>
          </motion.aside>

          <motion.main initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[800px]">
            <div className="mb-12">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#6d28d9]/10 px-4 py-2 text-sm font-medium text-[#6d28d9]">
                <Shield className="h-4 w-4" />
                Privacy Document
              </div>
              <h1 className="mb-4 font-[var(--font-syne)] text-4xl font-extrabold text-[#0F1B3D] md:text-5xl">
                Privacy <span className="text-[#6d28d9]">Policy</span>
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-[#6F7192]">
                <span>Effective Date: {effectiveDate}</span>
                <span>·</span>
                <span>Last Updated: {updatedDate}</span>
              </div>
            </div>

            <div className="mb-12 rounded-2xl border border-[#6d28d9]/10 bg-white p-6">
              <p className="leading-relaxed text-[#6F7192]">
                Flux 3D respects your privacy. This policy explains how we collect, use, share and protect information when you use the public website, place an order, request a quote, or contact us.
              </p>
            </div>

            <div className="space-y-12">
              <section id="information">
                <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">1</span>
                  Information We Collect
                </h2>
                <div className="space-y-4 leading-relaxed text-[#6F7192]">
                  <p>Depending on how you use the site, we may collect account information, contact details, quote requests, order information, design files, shipping addresses, billing details, support messages, device information, cookies, and analytics data.</p>
                  <p>For orders, we may process business and organization details, product specifications, file uploads, delivery information, payment references, and order status information.</p>
                  <p>We do not ask customers to send complete card numbers, CVV, or UPI PINs through our forms.</p>
                </div>
              </section>

              <section id="usage">
                <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">2</span>
                  How We Use Information
                </h2>
                <div className="space-y-4 leading-relaxed text-[#6F7192]">
                  <p>We use information to provide and improve the website, produce quotations, manufacture and deliver orders, answer support requests, manage payments, detect fraud, maintain security, comply with law, and send service-related updates.</p>
                </div>
              </section>

              <section id="sharing">
                <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">3</span>
                  Information Sharing
                </h2>
                <div className="space-y-4 leading-relaxed text-[#6F7192]">
                  <p>We do not sell personal information. We may share information with service providers that help operate the website, payment gateway providers, shipping and courier partners, and professionals who help us comply with law or protect our rights.</p>
                  <p>When payment is handled through PayU or another gateway, payment processing is completed by that gateway and we do not directly store complete card numbers, CVV, or UPI PINs on our servers.</p>
                </div>
              </section>

              <section id="cookies">
                <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">4</span>
                  Cookies and Tracking
                </h2>
                <div className="space-y-4 leading-relaxed text-[#6F7192]">
                  <p>We use cookies, analytics and similar technologies to remember preferences, understand site usage, improve the website and protect against abuse. You can manage cookies in your browser settings, though some features may not work properly if cookies are disabled.</p>
                </div>
              </section>

              <section id="security">
                <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">5</span>
                  Data Security
                </h2>
                <div className="space-y-4 leading-relaxed text-[#6F7192]">
                  <p>We use access controls, authenticated server-side checks, and operational safeguards to protect information. No method of transmission or storage is perfectly secure, so we cannot guarantee absolute security.</p>
                </div>
              </section>

              <section id="rights">
                <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">6</span>
                  Your Rights and Requests
                </h2>
                <div className="space-y-4 leading-relaxed text-[#6F7192]">
                  <p>You can request access, correction, or deletion of your personal information where applicable. We may need to retain some records for tax, legal, accounting, security, or order-fulfilment reasons.</p>
                  <p>To make a request, contact <a className="text-[#6d28d9] hover:underline" href={`mailto:${supportEmail}`}>{supportEmail}</a> or call <a className="text-[#6d28d9] hover:underline" href={`tel:${supportPhone.replace(/[^0-9+]/g, '')}`}>{supportPhone}</a>.</p>
                </div>
              </section>

              <section id="retention">
                <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">7</span>
                  Data Retention
                </h2>
                <div className="space-y-4 leading-relaxed text-[#6F7192]">
                  <p>We keep information only for as long as needed to operate the service, fulfil orders, resolve disputes, comply with law, or maintain business records. Support and order records may be retained for a reasonable period after the transaction is completed.</p>
                </div>
              </section>

              <section id="children">
                <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">8</span>
                  Children&apos;s Data
                </h2>
                <div className="space-y-4 leading-relaxed text-[#6F7192]">
                  <p>The website is not intended for children to use independently. If you believe a child has provided personal information, contact us so we can review and, where appropriate, delete it.</p>
                </div>
              </section>

              <section id="updates">
                <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">9</span>
                  Changes to this Policy
                </h2>
                <div className="space-y-4 leading-relaxed text-[#6F7192]">
                  <p>We may update this policy when the website, payment flow, or service operations change. The latest version published on this website applies from the effective date shown above.</p>
                </div>
              </section>

              <section id="contact">
                <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">10</span>
                  Contact Us
                </h2>
                <div className="space-y-4 leading-relaxed text-[#6F7192]">
                  <p>For privacy questions or requests, contact <a className="text-[#6d28d9] hover:underline" href={`mailto:${supportEmail}`}>{supportEmail}</a> or use the public contact page.</p>
                  <p><strong className="text-[#0F1B3D]">Address:</strong> {address || 'Not published'}</p>
                  <p><strong className="text-[#0F1B3D]">Phone:</strong> <a className="text-[#6d28d9] hover:underline" href={`tel:${supportPhone.replace(/[^0-9+]/g, '')}`}>{supportPhone}</a></p>
                </div>
              </section>
            </div>
          </motion.main>
        </div>
      </div>
    </div>
  )
}
