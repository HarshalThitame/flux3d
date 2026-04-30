'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { MessageCircle } from 'lucide-react'

const questions = [
  {
    label: 'What is your print primarily for?',
    options: ['Decorative / Display', 'Functional / Mechanical', 'Outdoor Use', 'Medical / Dental', 'Gift / Corporate', 'Student Project'],
  },
  {
    label: 'How important is surface finish?',
    options: ['Ultra fine detail (resin level)', 'Clean and smooth (standard)', 'Functional is fine, finish secondary'],
  },
  {
    label: "What's your budget per gram?",
    options: ['Under ₹10', '₹10–₹15', '₹15–₹20', '₹20+ — best quality'],
  },
]

export default function MaterialSelectorTool() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const [answers, setAnswers] = useState<Record<number, string>>({})

  const handleSelect = (qIdx: number, option: string) => {
    setAnswers(prev => ({ ...prev, [qIdx]: option }))
  }

  const allAnswered = questions.every((_, i) => answers[i])

  const getRecommendation = () => {
    const use = answers[0]
    const finish = answers[1]
    const budget = answers[2]

    if (use === 'Medical / Dental') return 'Dental Resin or Biocompatible Resin'
    if (use === 'Outdoor Use') return 'ASA'
    if (use === 'Gift / Corporate' && finish === 'Ultra fine detail (resin level)') return 'Silk PLA or Standard Resin'
    if (use === 'Gift / Corporate') return 'Silk PLA'
    if (use === 'Student Project') return 'PLA+'
    if (use === 'Functional / Mechanical' && finish === 'Ultra fine detail (resin level)') return 'ABS-Like Resin'
    if (use === 'Functional / Mechanical' && budget === '₹20+ — best quality') return 'Nylon PA12'
    if (use === 'Functional / Mechanical') return 'PETG'
    if (finish === 'Ultra fine detail (resin level)') return 'Standard Resin 4K'
    return 'PLA+'
  }

  return (
    <section ref={ref} className="px-4 md:px-8 lg:px-16 py-20">
      <div className="max-w-[800px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-10"
        >
          <span className="inline-block text-[#FF5C1A] text-xs font-semibold tracking-wider uppercase mb-2">
            Material Selector
          </span>
          <h2 className="text-2xl md:text-3xl font-[var(--font-syne)] font-extrabold text-white mb-2">
            Not Sure Which Material to Choose?
          </h2>
          <p className="text-[#7a82a0] text-sm">
            Answer 3 quick questions and we'll tell you exactly which material is right for your project.
          </p>
        </motion.div>

        <div className="space-y-6">
          {questions.map((q, qIdx) => (
            <motion.div
              key={qIdx}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: qIdx * 0.1 }}
              className="rounded-2xl border border-white/[0.06] bg-[rgba(13,17,32,0.4)] p-6"
            >
              <p className="text-white font-medium mb-4">
                <span className="text-[#FF5C1A] mr-2">Q{qIdx + 1}.</span>
                {q.label}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => handleSelect(qIdx, opt)}
                    className={`text-left px-4 py-2.5 rounded-xl text-sm transition-all ${
                      answers[qIdx] === opt
                        ? 'bg-[#FF5C1A]/15 text-[#FF5C1A] border border-[#FF5C1A]/30'
                        : 'bg-[rgba(255,255,255,0.02)] text-[#7a82a0] border border-white/[0.04] hover:border-white/[0.12] hover:text-white'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {allAnswered && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 rounded-2xl border border-[#FF5C1A]/20 bg-[rgba(255,92,26,0.05)] p-6 text-center"
          >
            <p className="text-sm text-[#7a82a0] mb-2">We recommend:</p>
            <p className="text-xl font-[var(--font-syne)] font-extrabold text-[#FF5C1A] mb-4">
              {getRecommendation()}
            </p>
            <a
              href="https://wa.me/919607570731?text=Hi%20Flux3D!%20I'd%20like%20a%20quote%20for%20a%20project."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 px-6 py-3 text-sm font-semibold text-[#25D366] transition-all hover:bg-[#25D366]/25"
            >
              <MessageCircle className="w-4 h-4" />
              Get Material Recommendation on WhatsApp
              <MessageCircle className="w-4 h-4" />
            </a>
          </motion.div>
        )}
      </div>
    </section>
  )
}
