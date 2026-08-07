'use client'

import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import NavbarClient from '@/components/NavbarClient'
import { Mail, Phone, MapPin, Clock3, MessageSquareText } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'
import ContactForm from './ContactForm'

export default function ContactContent() {
  const { settings } = useBusinessSettings()
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  const brandName = settings.brandName || settings.businessName || 'Flux3D'
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

  return (
    <>
      <NavbarClient user={null} />

      <main ref={ref} className="px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            className="mx-auto max-w-4xl text-center"
          >
            <p className="mb-5 text-sm font-semibold uppercase tracking-[3px] text-[#6d28d9]">Contact Us</p>
            <h1 className="font-[var(--font-syne)] text-[clamp(2rem,6vw,4rem)] font-extrabold leading-[1.1] text-[#070b1d]">
              Speak to {brandName} about a custom print, quote, or delivery question.
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#6F7192]">
              Use the contact form below to request a quotation or ask about an existing order. We review messages using the public support workflow and respond through the details you provide.
            </p>
          </motion.section>

          <section className="mt-12 grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              <div className="rounded-3xl border border-[#6d28d9]/10 bg-white p-6 shadow-sm">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#6d28d9]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#6d28d9]">
                  <MessageSquareText className="h-3.5 w-3.5" />
                  Support Details
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-5 w-5 text-[#6d28d9]" />
                    <div>
                      <p className="text-sm font-semibold text-[#070b1d]">Email</p>
                      <a href={`mailto:${supportEmail}`} className="text-sm text-[#6F7192] hover:text-[#6d28d9]">
                        {supportEmail}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-5 w-5 text-[#6d28d9]" />
                    <div>
                      <p className="text-sm font-semibold text-[#070b1d]">Phone</p>
                      <a href={`tel:${supportPhone.replace(/[^0-9+]/g, '')}`} className="text-sm text-[#6F7192] hover:text-[#6d28d9]">
                        {supportPhone}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 text-[#6d28d9]" />
                    <div>
                      <p className="text-sm font-semibold text-[#070b1d]">Address</p>
                      <p className="text-sm leading-7 text-[#6F7192]">{address || 'Not published'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock3 className="mt-0.5 h-5 w-5 text-[#6d28d9]" />
                    <div>
                      <p className="text-sm font-semibold text-[#070b1d]">Business Hours</p>
                      <p className="text-sm leading-7 text-[#6F7192]">
                        {[settings.workingDays, settings.businessHours || settings.workingHours].filter(Boolean).join(' · ') || 'We review messages during business hours when available and respond as soon as possible through the contact details you provide.'}
                      </p>
                    </div>
                  </div>
                  {settings.orderProcessingTime && (
                    <div className="flex items-start gap-3">
                      <Clock3 className="mt-0.5 h-5 w-5 text-[#6d28d9]" />
                      <div>
                        <p className="text-sm font-semibold text-[#070b1d]">Processing Time</p>
                        <p className="text-sm text-[#6F7192]">{settings.orderProcessingTime}</p>
                      </div>
                    </div>
                  )}
                  {settings.holidayMessage && (
                    <div className="flex items-start gap-3">
                      <Clock3 className="mt-0.5 h-5 w-5 text-[#6d28d9]" />
                      <div>
                        <p className="text-sm font-semibold text-[#070b1d]">Notice</p>
                        <p className="text-sm text-[#6F7192]">{settings.holidayMessage}</p>
                      </div>
                    </div>
                  )}
                  {settings.salesEmail && settings.salesEmail !== settings.supportEmail && (
                    <div className="flex items-start gap-3">
                      <Mail className="mt-0.5 h-5 w-5 text-[#6d28d9]" />
                      <div>
                        <p className="text-sm font-semibold text-[#070b1d]">Sales</p>
                        <a href={`mailto:${settings.salesEmail}`} className="text-sm text-[#6F7192] hover:text-[#6d28d9]">{settings.salesEmail}</a>
                      </div>
                    </div>
                  )}
                  {settings.billingEmail && settings.billingEmail !== settings.supportEmail && (
                    <div className="flex items-start gap-3">
                      <Mail className="mt-0.5 h-5 w-5 text-[#6d28d9]" />
                      <div>
                        <p className="text-sm font-semibold text-[#070b1d]">Billing</p>
                        <a href={`mailto:${settings.billingEmail}`} className="text-sm text-[#6F7192] hover:text-[#6d28d9]">{settings.billingEmail}</a>
                      </div>
                    </div>
                  )}
                  {settings.alternatePhone && settings.alternatePhone !== settings.primaryPhone && (
                    <div className="flex items-start gap-3">
                      <Phone className="mt-0.5 h-5 w-5 text-[#6d28d9]" />
                      <div>
                        <p className="text-sm font-semibold text-[#070b1d]">Alternate</p>
                        <a href={`tel:${settings.alternatePhone.replace(/[^0-9+]/g, '')}`} className="text-sm text-[#6F7192] hover:text-[#6d28d9]">{settings.alternatePhone}</a>
                      </div>
                    </div>
                  )}
                  {settings.tollFreeNumber && (
                    <div className="flex items-start gap-3">
                      <Phone className="mt-0.5 h-5 w-5 text-[#6d28d9]" />
                      <div>
                        <p className="text-sm font-semibold text-[#070b1d]">Toll-Free</p>
                        <a href={`tel:${settings.tollFreeNumber.replace(/[^0-9+]/g, '')}`} className="text-sm text-[#6F7192] hover:text-[#6d28d9]">{settings.tollFreeNumber}</a>
                      </div>
                    </div>
                  )}
                  {settings.emergencyContact && (
                    <div className="flex items-start gap-3">
                      <Phone className="mt-0.5 h-5 w-5 text-[#6d28d9]" />
                      <div>
                        <p className="text-sm font-semibold text-[#070b1d]">Emergency</p>
                        <a href={`tel:${settings.emergencyContact.replace(/[^0-9+]/g, '')}`} className="text-sm text-[#6F7192] hover:text-[#6d28d9]">{settings.emergencyContact}</a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-[#6d28d9]/10 bg-[#faf9f7] p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6d28d9]">For support</p>
                <p className="mt-3 text-sm leading-7 text-[#6F7192]">
                  Please include your order number, the product or file name, and any photos that help us understand the issue.
                  Do not send payment card details, UPI PINs, or passwords.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/privacy-policy" className="rounded-xl border border-[#6d28d9]/20 bg-white px-4 py-3 text-sm font-semibold text-[#070b1d]">
                    Privacy Policy
                  </Link>
                  <Link href="/pricing" className="rounded-xl bg-[#6d28d9] px-4 py-3 text-sm font-semibold text-white">
                    View Pricing
                  </Link>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 }}
            >
              <ContactForm />
            </motion.div>
          </section>
        </div>
      </main>
    </>
  )
}
