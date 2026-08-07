'use client'

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'

const MAX_VELOCITY = 1600
const MAX_SKEW_DEG = 0.6

/**
 * Subtle scroll-velocity skew: the wrapped content tilts a fraction of
 * a degree in the direction of scrolling, making the page feel alive
 * without being distracting. Skews reset to zero at rest and are fully
 * disabled for `prefers-reduced-motion`.
 */
export default function ScrollVelocitySkew({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion()
  const velocity = useMotionValue(0)
  const smoothVelocity = useSpring(velocity, { stiffness: 90, damping: 24, mass: 0.4 })
  const skew = useTransform(smoothVelocity, (v) => {
    const clamped = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, v))
    return (clamped / MAX_VELOCITY) * MAX_SKEW_DEG
  })

  useEffect(() => {
    if (reduceMotion) return

    let lastY = typeof window !== 'undefined' ? window.scrollY : 0
    let frame = 0

    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        const currentY = window.scrollY
        const delta = currentY - lastY
        lastY = currentY
        velocity.set(delta)
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [reduceMotion, velocity])

  if (reduceMotion) {
    return <>{children}</>
  }

  return (
    <motion.div style={{ skewY: skew, transformOrigin: 'center top' }}>
      {children}
    </motion.div>
  )
}
