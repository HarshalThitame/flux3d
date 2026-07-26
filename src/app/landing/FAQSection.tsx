'use client'

import { motion, useInView, useReducedMotion } from 'framer-motion'
import { memo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const faqs = [
  {
    q: 'How do I request a quote?',
    a: 'Share your design file or product requirement through the website or contact page. We review the material, colour, quantity, finish and delivery needs before confirming the price.',
  },
  {
    q: 'What products do you sell?',
    a: 'Flux 3D sells custom 3D printing services, model printing, prototyping, related manufacturing services, and ready-made products where they are listed.',
  },
  {
    q: 'What happens after I place an order?',
    a: 'Your order is reviewed, the final specifications are confirmed, payment is verified, and production begins only after approval or payment confirmation, depending on the order type.',
  },
  {
    q: 'What materials are available?',
    a: 'Available materials are listed on the materials and product pages when present. If your project needs a different material or finish, contact us for a review.',
  },
  {
    q: 'How do I pay?',
    a: 'Payments are shown in INR before checkout and processed through the configured payment gateway. Order confirmation only happens after server-side payment verification.',
  },
  {
    q: 'Is my design file kept confidential?',
    a: 'We use design files only for quoting, review and order production. Sensitive files are handled under the published privacy policy and only shared with the people needed to fulfill the order.',
  },
  {
    q: 'Do you offer bulk pricing?',
    a: 'Bulk and repeat orders can be quoted separately. Contact us with the quantity and specifications and we will review the request.',
  },
  {
    q: 'What if my print comes out wrong?',
    a: 'If the issue is caused by Flux 3D or by damage in transit, we review the case and may reprint, replace, repair, partially refund or fully refund according to the published policies.',
  },
  {
    q: 'Where do you deliver?',
    a: 'Delivery is available across serviceable locations in India. International shipping is not offered unless confirmed separately in writing.',
  },
]

function FAQItem({ faq, index, isOpen, onToggle }: { faq: typeof faqs[0]; index: number; isOpen: boolean; onToggle: () => void }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      ref={ref}
      initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={reduceMotion ? { duration: 0.2 } : { delay: index * 0.05 }}
      className="border-b border-[rgba(109, 40, 217,0.5)] last:border-b-0"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 px-2 text-left group hover:bg-[rgba(109, 40, 217,0.2)] rounded-lg transition-colors"
      >
        <span className="text-base font-medium text-[#0F1B3D] group-hover:text-[#6d28d9] transition-colors pr-4">
          {faq.q}
        </span>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[rgba(109, 40, 217,0.4)] flex items-center justify-center group-hover:bg-[rgba(109, 40, 217,0.1)] transition-colors">
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-[#6d28d9]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#6F7192]" />
          )}
        </div>
      </button>

      <div
        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out"
        style={{ maxHeight: isOpen ? '500px' : '0px', opacity: isOpen ? 1 : 0 }}
      >
        <p className="text-sm text-[#6F7192] leading-[1.7] pb-5 px-2">
          {faq.a}
        </p>
      </div>
    </motion.div>
  )
}

function FAQSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const reduceMotion = useReducedMotion()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section ref={ref} className="relative py-12 px-6 md:py-16 lg:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(109, 40, 217,0.02)] to-transparent pointer-events-none" />

      <div className="mx-auto relative z-10 max-w-[800px]">
        <motion.div
          initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={reduceMotion ? { duration: 0.3 } : undefined}
          className="mb-8 md:mb-12 text-center"
        >
          <p className="mb-4 text-sm font-medium uppercase tracking-normal text-[#6d28d9]">FAQ</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,2.5rem)] font-extrabold leading-[1.1] tracking-normal text-[#0F1B3D]">
            Questions? We&apos;ve Got{' '}
            <span className="text-[#6F7192]">Clear Answers.</span>
          </h2>
        </motion.div>

        <motion.div
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={reduceMotion ? { duration: 0.2 } : { delay: 0.3 }}
          className="rounded-2xl border border-[rgba(109, 40, 217,0.5)] bg-[#faf9f7] px-6"
        >
          {faqs.map((faq, i) => (
            <FAQItem
              key={faq.q}
              faq={faq}
              index={i}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default memo(FAQSection)
