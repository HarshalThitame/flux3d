'use client'

import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { useRef } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'

/**
 * Magnetic hover effect — the wrapped element is pulled toward the
 * cursor with a springy, premium feel. Disabled automatically for
 * touch devices and `prefers-reduced-motion`.
 */
export default function MagneticButton({
  children,
  className = '',
  strength = 0.32,
}: {
  children: React.ReactNode
  className?: string
  strength?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 180, damping: 14, mass: 0.35 })
  const sy = useSpring(y, { stiffness: 180, damping: 14, mass: 0.35 })
  const reduceMotion = useReducedMotion()
  const isFinePointer = useMediaQuery('(pointer: fine)')

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (reduceMotion || !isFinePointer || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const relX = event.clientX - (rect.left + rect.width / 2)
    const relY = event.clientY - (rect.top + rect.height / 2)
    x.set(relX * strength)
    y.set(relY * strength)
  }

  function handlePointerLeave() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      style={{ x: sx, y: sy }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.div>
  )
}
