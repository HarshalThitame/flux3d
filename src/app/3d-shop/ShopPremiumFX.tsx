'use client'

import { useEffect, useRef } from 'react'
import { createRafThrottledCallback } from '@/lib/raf-throttle'

export default function ShopPremiumFX() {
  const meterRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    let pointerFrame = 0
    let pointerX = 0

    const updatePointer = (event: PointerEvent) => {
      if (!window.matchMedia('(pointer: fine)').matches) return
      pointerX = event.clientX
      if (pointerFrame) return
      pointerFrame = window.requestAnimationFrame(() => {
        pointerFrame = 0
        document.documentElement.style.setProperty('--shop-pointer-x', `${pointerX}px`)
      })
    }

    const updateProgress = () => {
      const page = document.documentElement
      const maxScroll = Math.max(page.scrollHeight - window.innerHeight, 1)
      const progress = Math.min(Math.max(window.scrollY / maxScroll, 0), 1)
      if (meterRef.current) meterRef.current.style.transform = `scaleX(${progress})`
    }
    const scheduleProgress = createRafThrottledCallback(updateProgress)

    updateProgress()
    window.addEventListener('pointermove', updatePointer, { passive: true })
    window.addEventListener('scroll', scheduleProgress, { passive: true })
    window.addEventListener('resize', scheduleProgress)

    return () => {
      if (pointerFrame) window.cancelAnimationFrame(pointerFrame)
      scheduleProgress.cancel()
      window.removeEventListener('pointermove', updatePointer)
      window.removeEventListener('scroll', scheduleProgress)
      window.removeEventListener('resize', scheduleProgress)
    }
  }, [])

  return (
    <>
      <div className="shop-pointer-light" aria-hidden="true" />
      <div className="shop-scroll-meter" aria-hidden="true">
        <span ref={meterRef} />
      </div>
    </>
  )
}
