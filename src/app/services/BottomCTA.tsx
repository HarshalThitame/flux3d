'use client'

import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight, CheckCircle2, MessageCircle } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'

export default function BottomCTA() {
  const { settings } = useBusinessSettings()
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const whatsappNumber = (settings.whatsappNumber || '+919623023480').replace(/[^0-9]/g, '')

  return (
    <section ref={ref} className="px-4 pb-20 pt-16 md:px-8 lg:px-16">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55 }}
        className="mx-auto max-w-[980px] overflow-hidden rounded-lg border border-gray-200 bg-white p-7 text-center shadow-[0_28px_80px_rgba(17,24,39,0.14)] md:p-12"
      >
        <span className="mb-3 inline-flex items-center rounded-full bg-[#ede9fe] px-4 py-2 text-xs font-bold uppercase text-[#6d28d9]">
          Ready when you are
        </span>
        <h2 className="mx-auto max-w-2xl text-3xl font-extrabold text-[#111827] md:text-4xl">
          Send the file. Get the quote. Start the print.
        </h2>
        <p className="mx-auto mb-8 mt-4 max-w-[620px] text-sm leading-7 text-[#6F7192]">
          Whether it is one prototype or a repeatable batch, we will help you choose the right material, finish, and delivery path.
        </p>

        <div className="mb-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/instant-quote"
            className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#111827] px-8 text-sm font-bold text-white transition hover:bg-[#2f3341]"
          >
            Get Instant Quote
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href={`https://wa.me/${whatsappNumber}?text=Hi%20${encodeURIComponent(settings.businessName || 'Flux3D')}!%20I%20want%20to%20start%20a%203D%20printing%20project.`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#25D366]/25 bg-[#EAFBF2] px-8 text-sm font-bold text-[#138a42] transition hover:border-[#25D366]/40"
          >
            <MessageCircle className="h-4 w-4" />
            Chat on WhatsApp
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-[#6F7192]">
          {['No minimum order', 'Pan-India delivery', 'Material guidance', 'Quality checked'].map((item) => (
            <span key={item} className="inline-flex items-center gap-1 rounded-full bg-[#F7F8FB] px-3 py-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#6d28d9]" />
              {item}
            </span>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
