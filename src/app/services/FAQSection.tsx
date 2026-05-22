'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import { ChevronDown, MessageCircle } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'

const faqs = [
  {
    question: 'How do you price a 3D printing job?',
    answer: 'Pricing depends on material, weight, print time, finishing, complexity, and delivery requirements. Upload your file for an instant estimate, or message us if you need design review before quoting.',
  },
  {
    question: 'Can you help choose the right material?',
    answer: 'Yes. We recommend materials based on use case, strength, heat resistance, finish, flexibility, and budget. PLA+ is great for prototypes, PETG and ABS for functional parts, and resin for fine detail.',
  },
  {
    question: 'What files can I send?',
    answer: 'STL, 3MF, STEP, IGES, and OBJ are preferred. We can also review sketches, photos, or reference images when you need help turning an idea into a printable model.',
  },
  {
    question: 'Do you take bulk or business orders?',
    answer: 'Yes. We support small-batch production, corporate gifting, event giveaways, educational projects, and repeatable business orders with consistent material and finish settings.',
  },
  {
    question: 'What happens if a print fails quality check?',
    answer: 'If a print fails our internal check, we reprint before dispatch. Parts are reviewed for visible defects, support marks, fit-critical areas, and finish expectations.',
  },
]

export default function FAQSection() {
  const { settings } = useBusinessSettings()
  const ref = useRef<HTMLElement | null>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const whatsappNumber = (settings.whatsappNumber || '+919623023480').replace(/[^0-9]/g, '')

  return (
    <section ref={ref} className="services-premium-section services-faq-section bg-[#F4F6FA] px-4 py-24 md:px-8 lg:px-16">
      <div className="mx-auto max-w-[960px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mb-9 text-center"
        >
          <span className="text-xs font-bold uppercase text-[#6d28d9]">FAQ</span>
          <h2 className="mx-auto mt-3 max-w-2xl !text-4xl font-extrabold leading-tight !text-white md:!text-5xl">
            Questions before you print.
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.08, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="services-faq-panel overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.08)]"
        >
          {faqs.map((faq, index) => {
            const open = openIndex === index

            return (
              <div key={faq.question} className="border-b border-slate-100 last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : index)}
                  className="group flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-slate-50"
                  aria-expanded={open}
                >
                  <span className="text-sm font-extrabold leading-6 text-white group-hover:text-[#67e8f9]">{faq.question}</span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white">
                    <ChevronDown className={`h-4 w-4 text-[#6d28d9] transition-transform ${open ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm leading-7 text-[#667085]">{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          className="mt-6 text-center"
        >
          <a
            href={`https://wa.me/${whatsappNumber}?text=Hi%20${encodeURIComponent(settings.businessName || 'Flux3D')}!%20I%20have%20a%20question%20about%203D%20printing%20services.`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#25D366]/25 bg-white px-5 text-sm font-bold text-[#138a42] shadow-sm transition hover:border-[#25D366]/40 hover:bg-[#EAFBF2]"
          >
            <MessageCircle className="h-4 w-4" />
            Ask on WhatsApp
          </a>
        </motion.div>
      </div>
    </section>
  )
}
