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
    <section ref={ref} className="px-4 md:px-8 lg:px-16 py-20">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        className="max-w-[800px] mx-auto rounded-3xl border border-[#FF5C1A]/20 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(255,92,26,0.08)_0%,transparent_70%)] bg-[rgba(13,17,32,0.6)] p-8 md:p-12 text-center"
      >
        <h2 className="text-2xl md:text-3xl font-[var(--font-syne)] font-extrabold text-white mb-3">
          Ready to Choose<br />Your Material?
        </h2>
        <p className="text-[#7a82a0] text-sm mb-8 max-w-[500px] mx-auto">
          Upload your file and we'll recommend the perfect material and give you an instant quote. No account, no commitment — just a fast answer.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <Link
            href="/instant-quote"
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF5C1A] px-8 py-3.5 text-sm font-semibold text-white transition-all hover:shadow-[0_0_30px_rgba(255,92,26,0.3)]"
          >
            Upload Your File & Get a Quote
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href={`https://wa.me/${(settings.whatsappNumber || '+919623023480').replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(settings.businessName || 'Flux3D')}!%20I%20need%20help%20choosing%20a%20material%20for%20my%20project.`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 px-8 py-3.5 text-sm font-medium text-[#25D366] transition-all hover:bg-[#25D366]/20"
          >
            <MessageCircle className="w-4 h-4" />
            Ask on WhatsApp — 30 min reply
          </a>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          <Mail className="w-4 h-4 text-[#7a82a0]" />
          <a href={`mailto:${settings.primaryEmail || 'hello@flux3d.in'}`} className="text-sm text-[#7a82a0] hover:text-white transition-colors">
            {settings.primaryEmail || 'hello@flux3d.in'}
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-[#7a82a0]">
          {['Free Quote', 'Expert Recommendation', 'Pan-India Delivery', 'No Minimum Order'].map(item => (
            <span key={item} className="inline-flex items-center gap-1">
              <Check className="w-3 h-3 text-[#10B981]" />
              {item}
            </span>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
