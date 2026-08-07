'use client'

import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion'
import { useLoadingStore } from '@/stores/loadingStore'

const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.35, ease: 'easeIn' } },
}

const blobVariants: Variants = {
  hidden: { scale: 0.82, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 120, damping: 18, mass: 0.9 },
  },
  exit: {
    scale: 1.08,
    opacity: 0,
    transition: { duration: 0.3, ease: 'easeIn' },
  },
}

const textVariants: Variants = {
  hidden: { opacity: 0, y: 18, filter: 'blur(6px)' },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { delay: 0.12 + i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  }),
  exit: { opacity: 0, y: -12, transition: { duration: 0.25 } },
}

const TWINKLES = [
  { top: '18%', left: '22%', delay: '0s' },
  { top: '24%', left: '76%', delay: '0.9s' },
  { top: '66%', left: '12%', delay: '1.6s' },
  { top: '72%', left: '82%', delay: '0.4s' },
  { top: '42%', left: '90%', delay: '2.1s' },
  { top: '12%', left: '55%', delay: '1.2s' },
]

export default function LiquidMorphLoader() {
  const isLoading = useLoadingStore((state) => state.isLoading)
  const message = useLoadingStore((state) => state.message)
  const reduceMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="liquid-morph-loader"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[9990] flex items-center justify-center overflow-hidden bg-[#f9f7f4]/88 backdrop-blur-xl"
          role="status"
          aria-busy="true"
          aria-live="polite"
          aria-label={message ?? 'Loading'}
        >
          <div className="liquid-morph-vignette" />

          {TWINKLES.map((t, idx) => (
            <span
              key={idx}
              className="liquid-morph-twinkle"
              style={{ top: t.top, left: t.left, animationDelay: t.delay }}
            />
          ))}

          <div className="relative flex flex-col items-center">
            <motion.div
              variants={reduceMotion ? undefined : blobVariants}
              initial={reduceMotion ? undefined : 'hidden'}
              animate={reduceMotion ? undefined : 'visible'}
              exit={reduceMotion ? undefined : 'exit'}
              className="relative flex h-56 w-56 items-center justify-center sm:h-64 sm:w-64"
            >
              <div className="liquid-morph-ring-reverse" />
              <div className="liquid-morph-ring" />
              <div className="liquid-morph-particle" style={{ animationDelay: '0.2s' }} />
              <div className="liquid-morph-particle" style={{ animationDelay: '2s' }} />
              <div className="liquid-morph-particle-reverse" style={{ animationDelay: '1.1s' }} />

              <div className="absolute inset-0">
                <div className="liquid-morph-blob-main" />
                <div className="liquid-morph-blob-inner" />
                <div className="liquid-morph-blob-core" />
              </div>
            </motion.div>

            <motion.div
              variants={textVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              custom={0}
              className="liquid-morph-wordmark mt-12 text-center text-4xl font-bold tracking-[0.22em] sm:text-5xl"
            >
              FLUX3D
            </motion.div>

            <motion.div
              variants={textVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              custom={1}
              className="mt-4 flex items-center gap-3 px-6"
            >
              <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#d4af37]/70" />
              <p className="text-center text-xs font-semibold tracking-[0.3em] text-[#4c1d95]/85 uppercase sm:text-sm">
                {message ?? 'Preparing your experience…'}
              </p>
              <span className="h-px w-10 bg-gradient-to-l from-transparent to-[#d4af37]/70" />
            </motion.div>

            <motion.div
              variants={textVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              custom={2}
              className="mt-8 h-[2px] w-40 overflow-hidden rounded-full bg-[#4c1d95]/10"
            >
              <div className="loading-progress h-full w-full origin-left rounded-full bg-gradient-to-r from-[#5b21b6] via-[#a855f7] to-[#d4af37]" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
