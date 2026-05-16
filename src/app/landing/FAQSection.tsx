'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const faqs = [
  {
    q: 'What file formats do you accept?',
    a: 'We accept STL, STEP, OBJ, 3MF, DXF, and DWG files. For medical models, we also accept DICOM files and convert them to printable format. Don\'t have a file yet? Just describe your requirement and our design team will create the model for you from ₹499.'
  },
  {
    q: 'How long does it take to get my print?',
    a: 'Standard orders are delivered in 3–5 business days across India. Express orders placed before 10 AM are dispatched the same day within Mumbai and Pune, delivering in 24–48 hours. Bulk and custom industrial orders are quoted with a specific timeline.'
  },
  {
    q: 'What is your minimum order quantity?',
    a: 'There is no minimum order. You can order a single print for ₹99. We print one piece with the same care and quality as a batch of 500.'
  },
  {
    q: 'What materials do you stock?',
    a: 'We currently stock PLA+, PETG, ABS, ASA, TPU, Nylon PA12, Silk PLA, Multi-Color PLA, Standard Resin 4K, and ABS-Like Resin. We regularly add new materials — contact us if you need something specific.'
  },
  {
    q: 'How do I pay?',
    a: 'We accept all major payment methods — UPI (Google Pay, PhonePe, Paytm), Razorpay, debit/credit cards, net banking, and cash on delivery in select Mumbai and Pune pin codes.'
  },
  {
    q: 'Is my design file kept confidential?',
    a: 'Absolutely. We never share, sell, or use your design files for any purpose other than printing your order. For sensitive projects, we offer a formal NDA — just ask before sending your files.'
  },
  {
    q: 'Do you offer discounts for bulk orders?',
    a: 'Yes. Orders of 10+ units get 10% off. 50+ units get 20% off. 100+ units get 30% off. Corporate and industrial clients can contact us for custom volume pricing.'
  },
  {
    q: 'What if my print comes out wrong?',
    a: 'If the defect is on our side — we reprint it for free. We send a photo of every completed print before dispatch so you can flag any issue before it ships. Your satisfaction is non-negotiable.'
  },
  {
    q: 'Do you ship outside India?',
    a: 'Currently we ship across all of India. International shipping is available on request for specific orders — contact us to discuss.'
  }
]

function FAQItem({ faq, index, isOpen, onToggle }: { faq: typeof faqs[0]; index: number; isOpen: boolean; onToggle: () => void }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.05 }}
      className="border-b border-[rgba(124, 92, 255,0.5)] last:border-b-0"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 px-2 text-left group hover:bg-[rgba(124, 92, 255,0.2)] rounded-lg transition-colors"
      >
        <span className="text-base font-medium text-[#0F1B3D] group-hover:text-[#5B3FD6] transition-colors pr-4">
          {faq.q}
        </span>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[rgba(124, 92, 255,0.4)] flex items-center justify-center group-hover:bg-[rgba(124, 92, 255,0.1)] transition-colors">
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-[#5B3FD6]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#6F7192]" />
          )}
        </div>
      </button>

      <motion.div
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <p className="text-sm text-[#6F7192] leading-[1.7] pb-5 px-2">
          {faq.a}
        </p>
      </motion.div>
    </motion.div>
  )
}

export default function FAQSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section ref={ref} className="relative py-24 px-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(124, 92, 255,0.02)] to-transparent pointer-events-none" />

      <div className="max-w-[800px] mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-12"
        >
          <p className="text-sm font-medium text-[#5B3FD6] uppercase tracking-[3px] mb-4">FAQ</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,2.5rem)] font-extrabold text-[#0F1B3D] tracking-[-1px] leading-[1.1]">
            Questions? We&apos;ve Got{' '}
            <span className="text-[#6F7192]">Clear Answers.</span>
          </h2>
        </motion.div>

        {/* FAQ list */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.3 }}
          className="bg-[#FFFFFF] border border-[rgba(124, 92, 255,0.5)] rounded-2xl px-6"
        >
          {faqs.map((faq, i) => (
            <FAQItem
              key={i}
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
