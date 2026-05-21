'use client'

import { useState } from 'react'
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
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const whatsappNumber = (settings.whatsappNumber || '+919623023480').replace(/[^0-9]/g, '')

  return (
    <section className="px-4 py-16 md:px-8 lg:px-16">
      <div className="mx-auto max-w-[900px]">
        <div className="mb-8 text-center">
          <span className="text-xs font-bold uppercase text-[#6d28d9]">FAQ</span>
          <h2 className="mt-2 text-3xl font-extrabold text-[#111827] md:text-4xl">
            Questions before you print.
          </h2>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0_18px_50px_rgba(17,24,39,0.08)]">
          {faqs.map((faq, index) => {
            const open = openIndex === index

            return (
              <div key={faq.question} className="border-b border-gray-100 last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
                >
                  <span className="text-sm font-extrabold leading-6 text-[#111827]">{faq.question}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-[#6d28d9] transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                  <p className="px-5 pb-5 text-sm leading-7 text-[#6F7192]">{faq.answer}</p>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-6 text-center">
          <a
            href={`https://wa.me/${whatsappNumber}?text=Hi%20${encodeURIComponent(settings.businessName || 'Flux3D')}!%20I%20have%20a%20question%20about%203D%20printing%20services.`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#25D366]/25 bg-white px-5 text-sm font-bold text-[#138a42] shadow-sm transition hover:border-[#25D366]/40 hover:bg-[#EAFBF2]"
          >
            <MessageCircle className="h-4 w-4" />
            Ask on WhatsApp
          </a>
        </div>
      </div>
    </section>
  )
}
