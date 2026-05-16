'use client'

import dynamic from 'next/dynamic'
import { startTransition, useEffect, useRef, useState } from 'react'
import FadeIn from '@/components/FadeIn'

const ProblemSection = dynamic(() => import('./ProblemSection'), { ssr: false })
const MarqueeSection = dynamic(() => import('./MarqueeSection'), { ssr: false })
const ServicesSection = dynamic(() => import('./ServicesSection'), { ssr: false })
const OfferBanner = dynamic(() => import('@/components/offers/OfferBanner').then(m => ({ default: m.OfferBanner })), { ssr: false })
const MaterialsSection = dynamic(() => import('./MaterialsSection'), { ssr: false })
const TechnologySection = dynamic(() => import('./TechnologySection'), { ssr: false })
const HowItWorksSection = dynamic(() => import('./HowItWorksSection'), { ssr: false })
const PricingSection = dynamic(() => import('./PricingSection'), { ssr: false })
const TestimonialsSection = dynamic(() => import('./TestimonialsSection'), { ssr: false })
const TrustSection = dynamic(() => import('./TrustSection'), { ssr: false })
const FAQSection = dynamic(() => import('./FAQSection'), { ssr: false })
const FinalCTASection = dynamic(() => import('./FinalCTASection'), { ssr: false })
const FooterSection = dynamic(() => import('./FooterSection'), { ssr: false })

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
    <div ref={ref} className={className} style={mounted ? undefined : minHeight ? { minHeight } : undefined}>
      {mounted ? <FadeIn>{children}</FadeIn> : null}
    </div>
  )
}

export default function LandingPageClient() {
  return (
    <>
      <LazySection minHeight={520} className="bg-white">
        <ProblemSection />
      </LazySection>
      <LazySection minHeight={140} className="bg-white">
        <MarqueeSection />
      </LazySection>
      <LazySection minHeight={760} className="bg-[var(--bg-soft)]">
        <ServicesSection />
      </LazySection>
      <div className="bg-[var(--bg-soft)]">
        <section className="max-w-[1200px] mx-auto px-6 mb-16">
          <OfferBanner />
        </section>
      </div>
      <LazySection minHeight={760} className="bg-[var(--bg-soft)]">
        <MaterialsSection />
      </LazySection>
      <LazySection minHeight={680} className="bg-white">
        <TechnologySection />
      </LazySection>
      <LazySection minHeight={720} className="bg-white">
        <HowItWorksSection />
      </LazySection>
      <LazySection minHeight={860} className="bg-[var(--bg-soft)]">
        <PricingSection />
      </LazySection>
      <LazySection minHeight={720} className="bg-white">
        <TestimonialsSection />
      </LazySection>
      <LazySection minHeight={620} className="bg-white">
        <TrustSection />
      </LazySection>
      <LazySection minHeight={720} className="bg-[var(--bg-soft)]">
        <FAQSection />
      </LazySection>
      <LazySection minHeight={560} className="bg-white">
        <FinalCTASection />
      </LazySection>
      <LazySection minHeight={640}>
        <FooterSection />
      </LazySection>
    </>
  )
}
