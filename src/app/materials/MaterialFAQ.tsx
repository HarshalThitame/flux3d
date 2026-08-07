'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    q: 'Can I request a material not listed here?',
    a: 'Yes. If you need a specific filament or resin not in our standard lineup — carbon fiber, wood fill, metal fill, flexible resin, or others — contact us. We source on request for bulk orders or regular clients. Lead time is typically 3–5 days for sourcing.',
  },
  {
    q: 'Do you print with customer-supplied filament?',
    a: "Generally no — we use our own tested and dried filament stock to guarantee print quality. However, for specialty materials or color-matched corporate orders, we can accommodate customer-supplied material for bulk orders with a conversation first.",
  },
  {
    q: 'What is infill and how does it affect my print?',
    a: "Infill is the internal structure of your print — expressed as a percentage. 10% infill is mostly hollow (light, less material cost). 100% infill is completely solid (heavy, maximum strength). For most functional parts we recommend 20–40%. For structural or load-bearing parts, 50–100%. We'll recommend the right infill for your use case.",
  },
  {
    q: 'What layer height should I choose?',
    a: "Standard is 0.2mm — good quality, fast print. For display models and fine details, we use 0.1mm. For large structural parts where speed matters more than cosmetics, 0.3mm. For resin, we default to 0.05mm for maximum detail. We handle this recommendation for you — just tell us your priority.",
  },
  {
    q: 'Will my print change color or degrade over time?',
    a: 'PLA will yellow slightly with prolonged UV exposure — keep indoors. ABS degrades outdoors without UV protection. ASA and PETG are more stable. Resin will yellow under UV if uncoated. Silk PLA maintains its sheen indefinitely indoors. For outdoor parts, always choose ASA.',
  },
  {
    q: 'Can you color-match to my brand colors?',
    a: "We can get very close using our filament range. For exact Pantone matching, we recommend Multi-Color printing with custom filament sourcing (minimum order applies). For most corporate and branding work, our Silk PLA range in gold, silver, and black covers 80% of requirements.",
  },
  {
    q: 'Is there a minimum weight or size for orders?',
    a: 'No minimum weight. We print parts as small as 5–10g. For very small parts (under 5g), we may combine multiple pieces on one print plate — we\'ll communicate this and it doesn\'t affect cost.',
  },
  {
    q: 'Do you store my file for reorders?',
    a: 'Yes — with your consent, we store your STL file for 6 months so repeat orders are instant. Just message us your order ID and say "reorder" — done.',
  },
]

function FAQItem({ faq }: { faq: { q: string; a: string } }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="materials-faq-item border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="group flex w-full items-center justify-between py-5 text-left"
      >
        <span className="pr-4 text-sm font-extrabold leading-6 text-[#070b1d] transition-colors group-hover:text-[#6d28d9]">
          {faq.q}
        </span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-[#4B5563] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <p className="pb-5 text-sm leading-6 text-[#4B5563]">{faq.a}</p>
      )}
    </div>
  )
}

export default function MaterialFAQ() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <section ref={ref} className="materials-premium-section materials-faq-section relative overflow-hidden px-4 py-20 md:px-8 lg:px-16">
      <div className="materials-section-grid" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-[900px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-9 text-center"
        >
          <span className="mb-2 inline-block text-xs font-bold uppercase text-[#6d28d9]">
            Buying guidance
          </span>
          <h2 className="text-[clamp(2rem,6vw,3rem)] font-extrabold text-[#070b1d] md:text-4xl">
            Material questions, answered plainly.
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1 }}
          className="materials-faq-panel rounded-lg border border-gray-200 bg-white px-5 shadow-[0_18px_50px_rgba(17,24,39,0.08)] md:px-8"
        >
          {faqs.map((faq, i) => (
            <FAQItem key={i} faq={faq} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
