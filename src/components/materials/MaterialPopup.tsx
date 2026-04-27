'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Gauge, Shield, Waves, CheckCircle2, CircleAlert } from 'lucide-react'
import { MaterialSpec } from '@/data/materials'

type PopupPosition = {
  left: number
  top: number
  width: number
}

type MaterialPopupProps = {
  material: MaterialSpec | null
  position: PopupPosition | null
  isMobile: boolean
  onClose: () => void
}

const propertyIcons = {
  strength: Shield,
  flexibility: Waves,
  tempResistance: Flame,
  difficulty: Gauge,
} as const

const propertyLabels: Record<keyof MaterialSpec['properties'], string> = {
  strength: 'Strength',
  flexibility: 'Flexibility',
  tempResistance: 'Heat',
  difficulty: 'Difficulty',
}

export default function MaterialPopup({
  material,
  position,
  isMobile,
  onClose,
}: MaterialPopupProps) {
  return (
    <AnimatePresence>
      {material && position ? (
        <motion.div
          key={material.id}
          initial={{ opacity: 0, scale: 0.96, y: isMobile ? 12 : 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: isMobile ? 12 : 4 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed z-[90]"
          style={{
            left: position.left,
            top: position.top,
            width: position.width,
          }}
        >
          <div className="relative overflow-hidden rounded-[24px] border border-white/12 bg-[rgba(9,14,28,0.88)] shadow-[0_24px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
            <div
              className="absolute inset-x-0 top-0 h-24 opacity-80"
              style={{
                background: material.gradient ?? material.color ?? '#FF5C1A',
                filter: 'blur(48px)',
              }}
            />
            <div className="relative flex max-h-[78vh] flex-col">
              <div className="flex items-start justify-between gap-4 border-b border-white/8 px-4 py-4 sm:px-5">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 text-lg shadow-[0_0_28px_rgba(255,255,255,0.08)]"
                    style={{ background: material.gradient ?? material.color ?? '#14192c' }}
                  >
                    <span>{material.icon}</span>
                  </div>
                  <div>
                    <div className="font-[var(--font-syne)] text-lg font-bold text-white">
                      {material.name}
                    </div>
                    <div className="mt-1 inline-flex rounded-full border border-[#FF5C1A]/20 bg-[#FF5C1A]/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.22em] text-[#ff9d72]">
                      {material.tag}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-[#aeb7d3] transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close material details"
                >
                  Close
                </button>
              </div>

              <div className="overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
                <p className="text-sm leading-6 text-[#b0b8d3]">{material.description}</p>

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  {(
                    Object.entries(material.properties) as Array<
                      [keyof MaterialSpec['properties'], string]
                    >
                  ).map(([key, value]) => {
                    const Icon = propertyIcons[key]

                    return (
                      <div
                        key={key}
                        className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"
                      >
                        <div className="mb-1.5 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#7a82a0]">
                          <Icon className="h-3.5 w-3.5 text-[#FF8A57]" />
                          {propertyLabels[key]}
                        </div>
                        <div className="text-sm font-medium text-white">{value}</div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-[#7a82a0]">
                      Best Use Cases
                    </div>
                    <ul className="space-y-2 text-sm text-[#d7dcef]">
                      {material.useCases.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#FF5C1A]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-[#7a82a0]">
                      Print Settings
                    </div>
                    <div className="space-y-2 text-sm text-[#d7dcef]">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[#8f98b7]">Nozzle</span>
                        <span>{material.settings?.nozzle ?? 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[#8f98b7]">Bed</span>
                        <span>{material.settings?.bed ?? 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[#8f98b7]">Speed</span>
                        <span>{material.settings?.speed ?? 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4">
                    <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Pros
                    </div>
                    <ul className="space-y-2 text-sm text-[#d7dcef]">
                      {material.pros.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4">
                    <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-amber-200">
                      <CircleAlert className="h-3.5 w-3.5" />
                      Cons
                    </div>
                    <ul className="space-y-2 text-sm text-[#d7dcef]">
                      {material.cons.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
