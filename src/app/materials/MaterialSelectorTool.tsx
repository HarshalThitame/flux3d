'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  IndianRupee,
  MoveHorizontal,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Thermometer,
} from 'lucide-react'
import {
  MATERIAL_QUIZ_QUESTIONS,
  recommendMaterial,
  type MaterialQuizAnswers,
  type MaterialRecommendationInfo,
} from '@/lib/materialRecommender'

function hasCompleteAnswers(answers: Partial<MaterialQuizAnswers>): answers is MaterialQuizAnswers {
  return MATERIAL_QUIZ_QUESTIONS.every((question) => Boolean(answers[question.key]))
}

function PropertyBadge({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="materials-property-badge rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase text-gray-500">
        <Icon className="h-3.5 w-3.5 text-[#6d28d9]" />
        {label}
      </div>
      <div className="text-sm font-extrabold text-[#111827]">{value}</div>
    </div>
  )
}

function buildBadges(material: MaterialRecommendationInfo) {
  return [
    { label: 'Heat resistance', value: material.heatResistance, icon: Thermometer },
    { label: 'Strength', value: material.strength, icon: ShieldCheck },
    { label: 'Surface finish', value: material.surfaceFinish, icon: Sparkles },
    { label: 'Flexibility', value: material.flexibility, icon: MoveHorizontal },
    { label: 'Price per gram', value: material.priceRange, icon: IndianRupee },
  ]
}

export default function MaterialSelectorTool() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const advanceTimerRef = useRef<number | null>(null)
  const [answers, setAnswers] = useState<Partial<MaterialQuizAnswers>>({})
  const [activeQuestion, setActiveQuestion] = useState(0)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current)
      }
    }
  }, [])

  const handleSelect = (option: string) => {
    const question = MATERIAL_QUIZ_QUESTIONS[activeQuestion]
    if (!question) return

    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current)
    }

    setAnswers((prev) => ({ ...prev, [question.key]: option }))

    advanceTimerRef.current = window.setTimeout(() => {
      if (activeQuestion < MATERIAL_QUIZ_QUESTIONS.length - 1) {
        setActiveQuestion((current) => current + 1)
        return
      }

      setCompleted(true)
    }, 300)
  }

  const handleRetake = () => {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current)
    }
    setAnswers({})
    setActiveQuestion(0)
    setCompleted(false)
  }

  const currentQuestion = MATERIAL_QUIZ_QUESTIONS[activeQuestion]
  const recommendation = useMemo(
    () => completed && hasCompleteAnswers(answers) ? recommendMaterial(answers) : null,
    [answers, completed]
  )
  const progressIndex = Math.min(activeQuestion + 1, MATERIAL_QUIZ_QUESTIONS.length)
  const progressPercent = (progressIndex / MATERIAL_QUIZ_QUESTIONS.length) * 100

  return (
    <section ref={ref} className="materials-premium-section materials-selector-section relative overflow-hidden px-4 py-20 md:px-8 lg:px-16">
      <div className="materials-section-grid" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-[980px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-9 text-center"
        >
          <span className="mb-2 inline-block text-xs font-bold uppercase text-[#6d28d9]">
            Material Selector
          </span>
          <h2 className="mx-auto max-w-2xl text-3xl font-extrabold text-[#111827] md:text-4xl">
            Let the part decide the material.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#6F7192]">
            Answer 4 quick questions and get a recommendation based on use case, finish, heat, flexibility, and cost.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="materials-quiz-panel overflow-hidden rounded-lg border border-gray-200 bg-white p-5 shadow-[0_24px_70px_rgba(17,24,39,0.10)] md:p-7"
        >
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase text-gray-500">
              <span>Q{progressIndex}/{MATERIAL_QUIZ_QUESTIONS.length}</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#6d28d9] to-[#a855f7] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!completed && currentQuestion && (
              <motion.div
                key={currentQuestion.key}
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 }}
                transition={{ duration: 0.22 }}
              >
                <p className="mb-5 text-lg font-extrabold leading-7 text-[#111827]">
                  <span className="mr-2 text-[#6d28d9]">Q{activeQuestion + 1}.</span>
                  {currentQuestion.label}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {currentQuestion.options.map((option) => {
                    const selected = answers[currentQuestion.key] === option

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleSelect(option)}
                        className={`min-h-14 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition-all ${
                          selected
                            ? 'border-[#6d28d9] bg-[#f5f3ff] text-[#5B3FD6] shadow-sm'
                            : 'border-gray-200 bg-[#FAFBFD] text-[#4B5563] hover:border-[#6d28d9]/40 hover:bg-white hover:text-[#111827]'
                        }`}
                      >
                        <span className="flex items-start gap-2">
                          {selected && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#6d28d9]" />}
                          <span>{option}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {recommendation && (
              <motion.div
                key="material-result"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 18 }}
                transition={{ duration: 0.24 }}
                className="space-y-5"
              >
                <div className="materials-result-card rounded-lg border border-[#6d28d9]/20 bg-[#F7F8FB] p-5 md:p-6">
                  <p className="mb-2 text-xs font-bold uppercase text-[#6d28d9]">
                    Primary Recommendation
                  </p>
                  <h3 className="text-3xl font-extrabold text-[#111827]">
                    {recommendation.primary.material.displayName}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#4B5563]">
                    <span className="font-bold text-[#111827]">Recommended because:</span>{' '}
                    {recommendation.primary.reason}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#6F7192]">
                    {recommendation.primary.material.summary}
                  </p>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {buildBadges(recommendation.primary.material).map((badge) => (
                      <PropertyBadge
                        key={badge.label}
                        icon={badge.icon}
                        label={badge.label}
                        value={badge.value}
                      />
                    ))}
                  </div>

                  <div className="mt-5">
                    <Link
                      href={`/instant-quote?material=${encodeURIComponent(recommendation.primary.material.materialId)}`}
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#6d28d9] px-5 text-sm font-bold text-white transition hover:bg-[#4c1d95] sm:w-auto"
                    >
                      Use This Material
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                {recommendation.secondary && (
                  <div className="materials-result-card rounded-lg border border-gray-200 bg-[#FAFBFD] p-4">
                    <p className="text-sm text-[#4B5563]">
                      <span className="font-semibold text-[#0F1B3D]">
                        Also consider: {recommendation.secondary.material.displayName}
                      </span>{' '}
                      — {recommendation.secondary.tradeoff}.
                    </p>
                  </div>
                )}

                {(recommendation.warnings.length > 0 || recommendation.primary.notes.length > 0) && (
                  <div className="materials-note-panel space-y-2 rounded-lg border border-[#ded7ff] bg-[#f3f0ff] p-4">
                    {[...recommendation.primary.notes, ...recommendation.warnings].map((note) => (
                      <div key={note} className="flex gap-2 text-sm leading-6 text-[#4c1d95]">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{note}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleRetake}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-5 text-sm font-bold text-[#4B5563] transition hover:bg-gray-50 hover:text-[#111827] sm:w-auto"
                >
                  <RotateCcw className="h-4 w-4" />
                  Retake Quiz
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  )
}
