/**
 * Shared animation variants for Flux3D landing page.
 * 
 * WHY THIS FILE EXISTS:
 * Each section was declaring its own `initial/animate` objects inline,
 * causing React to recreate them every render and Framer Motion to 
 * re-register animation subscriptions on each re-render.
 * 
 * Using shared constants eliminates that overhead entirely.
 * 
 * USAGE:
 *   import { fadeUp, staggerContainer, cardItem } from '@/lib/animation-variants'
 *   
 *   <motion.div variants={staggerContainer} initial="hidden" animate={isInView ? "show" : "hidden"}>
 *     <motion.div variants={cardItem}>...</motion.div>
 *   </motion.div>
 */

import type { Variants } from 'framer-motion'

/** Single element fade up — for section headers */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
}

/** Faster fade up for smaller elements */
export const fadeUpFast: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
}

/** Fade in only — for text blocks and pills */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.5 },
  },
}

/** Slide in from right — for signal rows / list items */
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 16 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
}

/**
 * Stagger container — wraps a grid of cards.
 * Children use cardItem variant.
 */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0,
    },
  },
}

/**
 * Slightly slower stagger for large grids (7+ items)
 * so the last item doesn't feel too delayed.
 */
export const staggerContainerFast: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0,
    },
  },
}

/** Card grid item — used in Services, Materials, Trust, Testimonials */
export const cardItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
    },
  },
}

/** Lighter card item for dense grids (10+ items) */
export const cardItemLight: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: 'easeOut',
    },
  },
}

/**
 * useInViewProps — standard viewport config.
 * Use once:true everywhere — never re-animate on scroll back.
 */
export const viewportOnce = { once: true, margin: '-80px' } as const
export const viewportHeader = { once: true, margin: '-100px' } as const
