'use client'

import dynamic from 'next/dynamic'
import type { DepthBlurCarouselProps } from './DepthBlurCarousel'

const DepthBlurCarousel = dynamic(() => import('./DepthBlurCarousel'), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden="true"
      className="flex h-full w-full items-center justify-center bg-[var(--lux-bg-base,#f9f7f4)]"
    >
      <div className="h-48 w-64 animate-pulse rounded-2xl bg-black/[0.04]" />
    </div>
  ),
})

export default function DepthBlurCarouselBoundary(props: DepthBlurCarouselProps) {
  return <DepthBlurCarousel {...props} />
}
