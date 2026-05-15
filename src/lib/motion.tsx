'use client'

import React from 'react'
import { forwardRef, useEffect, useMemo, useState } from 'react'

type MotionProps = Record<string, unknown> & {
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

const MOTION_PROP_KEYS = new Set([
  'animate',
  'initial',
  'exit',
  'transition',
  'variants',
  'whileHover',
  'whileInView',
  'viewport',
  'drag',
  'dragConstraints',
  'dragElastic',
  'layout',
  'layoutId',
  'onLayoutAnimationStart',
  'onLayoutAnimationComplete',
  'onAnimationStart',
  'onAnimationComplete',
])

function createMotionComponent<Tag extends keyof React.JSX.IntrinsicElements>(tag: Tag) {
  return forwardRef<HTMLElement, MotionProps>(function MotionComponent(props, ref) {
    const {
      children,
      className,
      style,
      ...rest
    } = props

    const filteredProps: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(rest)) {
      if (!MOTION_PROP_KEYS.has(key)) {
        filteredProps[key] = value
      }
    }

    return React.createElement(tag, {
      ref,
      className,
      style,
      ...filteredProps,
    }, children as React.ReactNode)
  })
}

export const motion = new Proxy({}, {
  get(_target, prop: string) {
    return createMotionComponent(prop as keyof React.JSX.IntrinsicElements)
  },
}) as Record<string, ReturnType<typeof createMotionComponent>>

export function AnimatePresence({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

type InViewOptions = IntersectionObserverInit & {
  once?: boolean
  margin?: string
}

export function useInView<T extends Element>(ref: React.RefObject<T | null>, options?: InViewOptions) {
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    if (isInView || !ref.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setIsInView(true)
        if (options?.once !== false) {
          observer.disconnect()
        }
      },
      {
        ...options,
        rootMargin: options?.margin ?? options?.rootMargin,
      }
    )

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [isInView, options, ref])

  return isInView
}

export function useScroll() {
  return { scrollYProgress: 0 as unknown as number }
}

export function useTransform<T>(value: T, _input: unknown[], output: [unknown, unknown]) {
  void value
  return output[0] as unknown as T
}

export function useAnimationControls() {
  return useMemo(() => ({}), [])
}
