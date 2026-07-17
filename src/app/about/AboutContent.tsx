'use client'

import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Building2, FileText, MapPin, MessageSquareText, Printer, Truck, ShieldCheck, BadgeCheck } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'

const serviceAreas = [
  'Custom 3D printing',
  'Prototyping',
  'Model printing',
  'Ready-made products',
  'Related manufacturing services',
]

const operatingPoints = [
  {
    icon: Printer,
    title: 'Digital manufacturing',
    text: 'Customers submit a file or project requirement and receive a quotation before production starts.',
  },
  {
    icon: Truck,
    title: 'Shipping after production',
    text: 'Completed orders are packed and shipped to serviceable locations in India.',
  },
  {
    icon: ShieldCheck,
    title: 'Clear policies',
    text: 'The website publishes terms, refund and cancellation rules, shipping rules, and a privacy policy.',
  },
]

export default function AboutContent() {
  const { settings } = useBusinessSettings()
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const brandName = settings.brandName || settings.businessName || 'Flux3D'
  const legalName = settings.legalBusinessName || settings.businessName || brandName
  const address = [
    settings.addressLine1,
    settings.addressLine2,
    settings.city,
    settings.state,
    settings.postalCode,
    settings.country,
  ].filter(Boolean).join(', ')

  return (
    <div ref={ref} className="overflow-hidden">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        className="relative px-6 pb-16 pt-10 text-center"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,rgba(109,40,217,0.08)_0%,transparent_70%)]" />
        <div className="relative z-10 mx-auto max-w-4xl">
          <p className="mb-6 text-sm font-semibold uppercase tracking-[3px] text-[#6d28d9]">About {brandName}</p>
          <h1 className="font-[var(--font-syne)] text-[clamp(2rem,6vw,4rem)] font-extrabold leading-[1.1] tracking-[-1px] text-[#0F1B3D]">
            {brandName} is the brand through which {legalName} provides custom 3D printing and manufacturing services.
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-[1.8] text-[#6F7192]">
            We help customers turn files, sketches, prototypes and product ideas into printed parts and ready-made products.
            Orders are reviewed before production, pricing is confirmed before checkout, and delivery happens through the public service flow on this site.
          </p>
        </div>
      </motion.section>

      <section className="px-6 py-12">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {operatingPoints.map((point) => (
            <div key={point.title} className="rounded-2xl border border-[#6d28d9]/10 bg-white p-6 shadow-sm">
              <point.icon className="h-6 w-6 text-[#6d28d9]" />
              <h2 className="mt-4 text-lg font-bold text-[#0F1B3D]">{point.title}</h2>
              <p className="mt-2 text-sm leading-7 text-[#6F7192]">{point.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-[#6d28d9]/10 bg-white p-8 shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#6d28d9]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#6d28d9]">
              <Building2 className="h-3.5 w-3.5" />
              Business Identity
            </div>
            <div className="mt-5 space-y-4 text-sm leading-7 text-[#6F7192]">
              <p><strong className="text-[#0F1B3D]">Brand:</strong> {brandName}</p>
              <p><strong className="text-[#0F1B3D]">Legal operator:</strong> {legalName}</p>
              <p><strong className="text-[#0F1B3D]">Address:</strong> {address || 'Not published'}</p>
              <p><strong className="text-[#0F1B3D]">Support email:</strong> <a className="text-[#6d28d9] hover:underline" href={`mailto:${settings.supportEmail || settings.primaryEmail || 'flux3d.in@gmail.com'}`}>{settings.supportEmail || settings.primaryEmail || 'flux3d.in@gmail.com'}</a></p>
              <p><strong className="text-[#0F1B3D]">Support phone:</strong> <a className="text-[#6d28d9] hover:underline" href={`tel:${(settings.primaryPhone || '+919623023480').replace(/[^0-9+]/g, '')}`}>{settings.primaryPhone || '+919623023480'}</a></p>
            </div>
          </div>

          <div className="rounded-3xl border border-[#6d28d9]/10 bg-[#faf9f7] p-8 shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#6d28d9]">
              <FileText className="h-3.5 w-3.5" />
              What We Sell
            </div>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-[#6F7192]">
              {serviceAreas.map((service) => (
                <li key={service} className="flex items-start gap-2">
                  <BadgeCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{service}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm leading-7 text-[#6F7192]">
              The public website also publishes the Terms & Conditions, Privacy Policy, Refund & Cancellation Policy and Shipping & Delivery Policy so customers can review the service before ordering.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl bg-[#6d28d9] px-5 py-3 text-sm font-semibold text-white">
                <MessageSquareText className="h-4 w-4" />
                Contact Us
              </Link>
              <Link href="/pricing" className="inline-flex items-center gap-2 rounded-xl border border-[#6d28d9]/20 bg-white px-5 py-3 text-sm font-semibold text-[#0F1B3D]">
                <MapPin className="h-4 w-4 text-[#6d28d9]" />
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
