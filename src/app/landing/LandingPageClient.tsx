'use client'

import dynamic from 'next/dynamic'
import { startTransition, useEffect, useRef, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import FadeIn from '@/components/FadeIn'
import { useBusinessSettings } from '@/lib/settings-context'
import { createRafThrottledCallback } from '@/lib/raf-throttle'

const ProblemSection = dynamic(() => import('./ProblemSection'), { ssr: false })
const ServicesSection = dynamic(() => import('./ServicesSection'), { ssr: false })
const OfferBanner = dynamic(() => import('@/components/offers/OfferBanner').then(m => ({ default: m.OfferBanner })), { ssr: false })
const HowItWorksSection = dynamic(() => import('./HowItWorksSection'), { ssr: false })
const PricingSection = dynamic(() => import('./PricingSection'), { ssr: false })
const FAQSection = dynamic(() => import('./FAQSection'), { ssr: false })
const FinalCTASection = dynamic(() => import('./FinalCTASection'), { ssr: false })
const FooterSection = dynamic(() => import('./FooterSection'), { ssr: false })

function runWhenIdle(callback: () => void, timeout = 2500) {
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
    cancelIdleCallback?: (id: number) => void
  }

  if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
    const idleId = idleWindow.requestIdleCallback(callback, { timeout })
    return () => idleWindow.cancelIdleCallback?.(idleId)
  }

  const timeoutId = window.setTimeout(callback, Math.min(timeout, 1200))
  return () => window.clearTimeout(timeoutId)
}

function FloatingWhatsAppButton() {
  const { settings } = useBusinessSettings()
  const whatsappNumber = (settings.whatsappNumber || '+919623023480').replace(/[^0-9]/g, '')

  return (
    <a
      href={`https://wa.me/${whatsappNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Flux 3D on WhatsApp"
      className="fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-[#25D366] text-white shadow-[0_18px_44px_rgba(37,211,102,0.34)] transition-all duration-200 hover:scale-105 hover:shadow-[0_20px_54px_rgba(37,211,102,0.42)] md:bottom-8 md:right-6 md:h-14 md:w-14"
    >
      <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
    </a>
  )
}

function PremiumLandingFX() {
  const meterRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    let pointerFrame = 0
    let pointerX = 0
    let pointerY = 0
    let removeListeners = () => {}

    const updatePointer = (event: PointerEvent) => {
      if (!window.matchMedia('(pointer: fine)').matches) return
      pointerX = event.clientX
      pointerY = event.clientY
      if (pointerFrame) return
      pointerFrame = window.requestAnimationFrame(() => {
        pointerFrame = 0
        document.documentElement.style.setProperty('--premium-pointer-x', `${pointerX}px`)
        document.documentElement.style.setProperty('--premium-pointer-y', `${pointerY}px`)
      })
    }

    const updateProgress = () => {
      const page = document.documentElement
      const maxScroll = Math.max(page.scrollHeight - window.innerHeight, 1)
      const progress = Math.min(Math.max(window.scrollY / maxScroll, 0), 1)
      if (meterRef.current) {
        meterRef.current.style.transform = `scaleX(${progress})`
      }
    }
    const scheduleProgress = createRafThrottledCallback(updateProgress)

    const cancelIdle = runWhenIdle(() => {
      updateProgress()
      window.addEventListener('pointermove', updatePointer, { passive: true })
      window.addEventListener('scroll', scheduleProgress, { passive: true })
      window.addEventListener('resize', scheduleProgress)

      removeListeners = () => {
        window.removeEventListener('pointermove', updatePointer)
        window.removeEventListener('scroll', scheduleProgress)
        window.removeEventListener('resize', scheduleProgress)
      }
    })

    return () => {
      cancelIdle()
      if (pointerFrame) window.cancelAnimationFrame(pointerFrame)
      scheduleProgress.cancel()
      removeListeners()
    }
  }, [])

  return (
    <>
      <div className="premium-pointer-light" aria-hidden="true" />
      <div className="premium-scroll-meter" aria-hidden="true">
        <span ref={meterRef} />
      </div>
      <div className="premium-page-chrome" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </>
  )
}

function LazySection({
  children,
  className = '',
  rootMargin = '240px',
  minHeight = 0,
}: {
  children: React.ReactNode
  className?: string
  rootMargin?: string
  minHeight?: number
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (mounted || !ref.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        startTransition(() => setMounted(true))
        observer.disconnect()
      },
      { rootMargin }
    )

    observer.observe(ref.current)

    return () => observer.disconnect()
  }, [mounted, rootMargin])

  return (
    <div ref={ref} className={className} style={minHeight ? { minHeight } : undefined}>
      {mounted ? <FadeIn>{children}</FadeIn> : null}
    </div>
  )
}

export default function LandingPageClient() {
  return (
    <div className="landing-premium relative">
      <PremiumLandingFX />
      <FloatingWhatsAppButton />
      <LazySection minHeight={520} className="premium-band premium-band-ink">
        <ProblemSection />
      </LazySection>
      <LazySection minHeight={760} className="premium-band premium-band-panel">
        <ServicesSection />
      </LazySection>
      <LazySection minHeight={160} className="premium-band premium-band-panel">
        <section className="premium-offer-shell mx-auto mb-16 max-w-[1200px] px-6">
          <OfferBanner />
        </section>
      </LazySection>
      <LazySection minHeight={720} className="premium-band premium-band-ink">
        <HowItWorksSection />
      </LazySection>
      <LazySection minHeight={860} className="premium-band premium-band-panel">
        <PricingSection />
      </LazySection>
      <LazySection minHeight={720} className="premium-band premium-band-panel">
        <FAQSection />
      </LazySection>
      <LazySection minHeight={560} className="premium-band premium-band-black">
        <FinalCTASection />
      </LazySection>
      <LazySection minHeight={640}>
        <FooterSection />
      </LazySection>
    </div>
  )
}
