'use client'

import { memo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import Reveal from '@/components/Reveal'

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
  const ref = useRef<HTMLDivElement | null>(null)

  return (
    <Reveal delay={index * 30} className="border-b border-[var(--shop-border-light,#E7E5E0)] last:border-b-0">
      <div ref={ref}>
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between py-5 px-2 text-left group hover:bg-[var(--shop-gold-faint,#FAF6EB)] rounded-lg transition-colors"
        >
          <span className="font-[var(--shop-font-heading)] text-base font-semibold text-[var(--shop-text-primary,#1C1917)] group-hover:text-[var(--shop-gold,#C9A962)] transition-colors pr-4">
            {faq.q}
          </span>
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--shop-bg-muted,#F2F0EA)] flex items-center justify-center group-hover:bg-[var(--shop-gold-soft)] transition-colors">
            {isOpen ? (
              <ChevronUp className="w-5 h-5 text-[var(--shop-gold,#C9A962)]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[var(--shop-text-muted,#78716C)]" />
            )}
          </div>
        </button>

        <div
          className="overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out"
          style={{ maxHeight: isOpen ? '500px' : '0px', opacity: isOpen ? 1 : 0 }}
        >
          <p className="text-sm text-[var(--shop-text-secondary,#44403C)] leading-[1.7] pb-5 px-2">
            {faq.a}
          </p>
        </div>
      </div>
    </Reveal>
  )
}

function FAQSection() {
  const ref = useRef<HTMLElement>(null)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section ref={ref} className="relative py-12 px-6 md:py-16 lg:py-24 overflow-hidden">
      <div className="mx-auto relative z-10 max-w-[800px]">
        <Reveal>
          <div className="mb-8 md:mb-12 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--shop-gold,#C9A962)]">FAQ</p>
            <h2 className="font-[var(--shop-font-heading)] text-[clamp(2rem,4vw,3rem)] font-semibold text-[var(--shop-text-primary,#1C1917)]">
              Questions? We&apos;ve Got{' '}
              <span className="text-[var(--shop-gold,#C9A962)]">Clear Answers.</span>
            </h2>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="rounded-[var(--shop-radius-xl,32px)] border border-[var(--shop-border-light,#E7E5E0)] bg-[var(--shop-bg-elevated,#FFFFFF)] px-6 shadow-[var(--shop-shadow-sm)]">
            {faqs.map((faq, i) => (
              <FAQItem
                key={faq.q}
                faq={faq}
                index={i}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default memo(FAQSection)
