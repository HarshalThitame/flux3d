'use client'

import type { Ref } from 'react'
import dynamic from 'next/dynamic'
import type {
  LiquidGlassCarouselHandle,
  LiquidGlassCarouselProps,
} from './LiquidGlassCarousel'

const LiquidGlassCarousel = dynamic(() => import('./LiquidGlassCarousel'), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden="true"
      className="flex h-full w-full items-center justify-center bg-[var(--lux-bg-base,#f9f7f4)]"
    >
      <div className="h-40 w-[28rem] max-w-[70vw] animate-pulse rounded-2xl bg-black/[0.04]" />
    </div>
  ),
})

export type LiquidGlassCarouselBoundaryProps = LiquidGlassCarouselProps & {
  handleRef?: Ref<LiquidGlassCarouselHandle>
}

export default function LiquidGlassCarouselBoundary({
  handleRef,
  ...props
}: LiquidGlassCarouselBoundaryProps) {
  return <LiquidGlassCarousel {...props} ref={handleRef} />
}

export type { LiquidGlassCarouselHandle }
