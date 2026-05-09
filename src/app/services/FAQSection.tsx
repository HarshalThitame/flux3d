'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'

const faqs = [
  {
    question: 'How much does 3D printing cost in Pune?',
    answer: 'Our 3D printing services start at just ₹99 for small FDM prints. The final cost depends on material type, print size, infill density, and print time. PLA/PETG prints are most economical, while specialized materials like Carbon Fiber or multi-color prints cost more. Upload your STL file for an instant automated quote.'
  },
  {
    question: 'Which material is best for my project?',
    answer: 'It depends on your requirements: PLA+ is great for prototypes and display models (easy to print, eco-friendly). PETG offers strength and flexibility for functional parts. ABS/ASA provide high temperature resistance for automotive applications. TPU is ideal for flexible, rubber-like parts. Resin is perfect for high-detail miniatures and jewelry. Our team can help you choose the right material.'
  },
  {
    question: 'How fast is delivery in Pune and across India?',
    answer: 'For Pune customers, we offer 24-48 hour turnaround on most orders with express service available. Pan-India delivery typically takes 3-5 business days via Delhivery or DTDC. Rush orders can be dispatched within 24 hours for an additional fee.'
  },
  {
    question: 'What file formats do you accept?',
    answer: 'We accept STL, 3MF, STEP, IGES, and OBJ files for 3D printing. For CAD design services, we work with Fusion 360, SolidWorks, and Rhino files. If you only have a sketch or photo, our design team can create a 3D model from your reference.'
  },
  {
    question: 'Do you provide bulk ordering discounts?',
    answer: 'Yes! We offer volume pricing for bulk orders, startups, colleges, and events. Discounts increase with quantity. For enterprise clients, we provide dedicated account management and custom payment terms. Contact us for a customized quote.'
  },
  {
    question: 'Can you print multi-color parts?',
    answer: 'Yes, we use Bambu Lab AMS (Automatic Material System) for 4-color FDM printing. This is perfect for logos, figurines, and prototypes requiring color coding. Each additional color adds to the print time and cost.'
  },
  {
    question: 'What if my part fails quality check?',
    answer: 'Every print undergoes rigorous quality inspection. If a part doesn\'t meet our standards, we reprint it at no cost. We also provide photos before shipping so you can verify the quality. Customer satisfaction is our priority.'
  }
]

export default function FAQSection() {
  const { settings } = useBusinessSettings()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="py-24 px-6 border-t border-[rgba(255,255,255,0.07)]">
      <div className="max-w-[800px] mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-[#FF5C1A] uppercase tracking-[3px] mb-4">FAQ</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,2.5rem)] font-extrabold text-white tracking-[-1px] leading-[1.1]">
            Questions We Get <span className="text-[#7a82a0]">A Lot</span>
          </h2>
        </div>

        {/* FAQ items */}
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-[#0d1120] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-[#111827] transition-colors"
              >
                <span className="font-medium text-white pr-8">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-[#FF5C1A] flex-shrink-0 transition-transform ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === i && (
                <div className="px-6 pb-5 text-[#7a82a0] leading-[1.7]">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Still have questions */}
        <div className="text-center mt-12">
          <p className="text-[#7a82a0] mb-4">Still have questions?</p>
          <a href={`https://wa.me/${(settings.whatsappNumber || '+919623023480').replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-[#FF5C1A] font-medium hover:underline">
            Chat on WhatsApp now →
          </a>
        </div>
      </div>
    </section>
  )
}
