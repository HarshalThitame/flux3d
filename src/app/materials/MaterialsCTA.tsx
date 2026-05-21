'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, MessageCircle, Mail, Check } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'

export default function MaterialsCTA() {
  const { settings } = useBusinessSettings()
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <section ref={ref} className="px-4 pb-20 pt-16 md:px-8 lg:px-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        className="mx-auto max-w-[940px] overflow-hidden rounded-[2rem] border border-gray-200 bg-white p-7 text-center shadow-[0_28px_80px_rgba(17,24,39,0.14)] md:p-12"
      >
        <span className="mb-3 inline-flex items-center rounded-full bg-[#ede9fe] px-4 py-2 text-xs font-bold uppercase text-[#6d28d9]">
          From material to quote
        </span>
        <h2 className="mx-auto max-w-2xl text-3xl font-extrabold text-[#111827] md:text-4xl">
          Upload once. Get a material recommendation and a production-ready quote.
        </h2>
        <p className="mx-auto mb-8 mt-4 max-w-[560px] text-sm leading-7 text-[#6F7192]">
          Upload your file and we&apos;ll recommend the perfect material and give you an instant quote. No account, no commitment — just a fast answer.
        </p>

        <div className="mb-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/instant-quote"
            className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#111827] px-8 text-sm font-bold text-white transition hover:bg-[#2f3341]"
          >
            Upload Your File & Get a Quote
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href={`https://wa.me/${(settings.whatsappNumber || '+919623023480').replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(settings.businessName || 'Flux3D')}!%20I%20need%20help%20choosing%20a%20material%20for%20my%20project.`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#25D366]/25 bg-[#EAFBF2] px-8 text-sm font-bold text-[#138a42] transition hover:border-[#25D366]/40"
          >
            <MessageCircle className="w-4 h-4" />
            Ask on WhatsApp — 30 min reply
          </a>
        </div>

        <div className="mb-6 flex items-center justify-center gap-2">
          <Mail className="w-4 h-4 text-[#6F7192]" />
          <a href={`mailto:${settings.primaryEmail || 'hello@flux3d.in'}`} className="text-sm text-[#6F7192] hover:text-[#0F1B3D] transition-colors">
            {settings.primaryEmail || 'hello@flux3d.in'}
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-[#6F7192]">
          {['Free Quote', 'Expert Recommendation', 'Pan-India Delivery', 'No Minimum Order'].map(item => (
            <span key={item} className="inline-flex items-center gap-1 rounded-full bg-[#F7F8FB] px-3 py-1.5">
              <Check className="h-3 w-3 text-[#6d28d9]" />
              {item}
            </span>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
