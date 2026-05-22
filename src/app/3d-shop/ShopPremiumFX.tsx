'use client'

import { useEffect, useRef } from 'react'

export default function ShopPremiumFX() {
  const meterRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    let frame = 0

    const updatePointer = (event: PointerEvent) => {
      if (!window.matchMedia('(pointer: fine)').matches) return
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--shop-pointer-x', `${event.clientX}px`)
      })
    }

    const updateProgress = () => {
      const page = document.documentElement
      const maxScroll = Math.max(page.scrollHeight - window.innerHeight, 1)
      const progress = Math.min(Math.max(window.scrollY / maxScroll, 0), 1)
      if (meterRef.current) meterRef.current.style.transform = `scaleX(${progress})`
    }

    updateProgress()
    window.addEventListener('pointermove', updatePointer, { passive: true })
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', updatePointer)
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
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
