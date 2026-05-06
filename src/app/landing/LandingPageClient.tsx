'use client'

import dynamic from 'next/dynamic'
import { startTransition, useEffect, useRef, useState } from 'react'

const ProblemSection = dynamic(() => import('./ProblemSection'), { ssr: false })
const MarqueeSection = dynamic(() => import('./MarqueeSection'), { ssr: false })
const ServicesSection = dynamic(() => import('./ServicesSection'), { ssr: false })
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
  rootMargin = '240px',
  minHeight = 0,
}: {
  children: React.ReactNode
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
    <div ref={ref} style={mounted ? undefined : minHeight ? { minHeight } : undefined}>
      {mounted ? children : null}
    </div>
  )
}

export default function LandingPageClient() {
  return (
    <>
      <LazySection minHeight={520}>
        <ProblemSection />
      </LazySection>
      <LazySection minHeight={140}>
        <MarqueeSection />
      </LazySection>
      <LazySection minHeight={760}>
        <ServicesSection />
      </LazySection>
      <LazySection minHeight={760}>
        <MaterialsSection />
      </LazySection>
      <LazySection minHeight={680}>
        <TechnologySection />
      </LazySection>
      <LazySection minHeight={720}>
        <HowItWorksSection />
      </LazySection>
      <LazySection minHeight={860}>
        <PricingSection />
      </LazySection>
      <LazySection minHeight={720}>
        <TestimonialsSection />
      </LazySection>
      <LazySection minHeight={620}>
        <TrustSection />
      </LazySection>
      <LazySection minHeight={720}>
        <FAQSection />
      </LazySection>
      <LazySection minHeight={560}>
        <FinalCTASection />
      </LazySection>
      <LazySection minHeight={640}>
        <FooterSection />
      </LazySection>
    </>
  )
}
