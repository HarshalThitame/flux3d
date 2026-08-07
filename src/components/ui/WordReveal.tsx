'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'

/**
 * Cinematic word-by-word text reveal. Each word rises and fades in
 * with a subtle blur (optional) using a premium ease. Gradient-clipped
 * text (e.g. the hero brand) should pass `blur={false}` so
 * `background-clip: text` renders correctly.
 */
export default function WordReveal({
  text,
  className = '',
  delay = 0,
  stagger = 0.045,
  blur = false,
  wordClassName = '',
}: {
  text: string
  className?: string
  delay?: number
  stagger?: number
  blur?: boolean
  wordClassName?: string
}) {
  const reduceMotion = useReducedMotion()
  const words = useMemo(() => text.split(' '), [text])

  if (reduceMotion) {
    return <span className={`${className} ${wordClassName}`}>{text}</span>
  }

  return (
    <span className={`inline-block ${className}`}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className={`inline-block will-change-transform ${wordClassName}`}
          initial={{ opacity: 0, y: 24, ...(blur ? { filter: 'blur(8px)' } : {}) }}
          animate={{ opacity: 1, y: 0, ...(blur ? { filter: 'blur(0px)' } : {}) }}
          transition={{ delay: delay + i * stagger, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          {word}
          {i < words.length - 1 ? '\u00A0' : ''}
        </motion.span>
      ))}
    </span>
  )
}
