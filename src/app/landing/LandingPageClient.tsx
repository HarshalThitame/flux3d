'use client'

import dynamic from 'next/dynamic'
import { startTransition, useEffect, useRef, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import FadeIn from '@/components/FadeIn'
import { useBusinessSettings } from '@/lib/settings-context'

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

function FloatingWhatsAppButton() {
  const { settings } = useBusinessSettings()
  const whatsappNumber = (settings.whatsappNumber || '+919623023480').replace(/[^0-9]/g, '')

  return (
    <a
      href={`https://wa.me/${whatsappNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Flux 3D on WhatsApp"
      className="fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_16px_36px_rgba(37,211,102,0.28)] transition-all duration-200 hover:scale-105 hover:shadow-[0_18px_42px_rgba(37,211,102,0.34)] md:bottom-8 md:right-6 md:h-14 md:w-14"
    >
      <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
    </a>
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
    <div ref={ref} className={className} style={mounted ? undefined : minHeight ? { minHeight } : undefined}>
      {mounted ? <FadeIn>{children}</FadeIn> : null}
    </div>
  )
}

export default function LandingPageClient() {
  return (
    <>
      <FloatingWhatsAppButton />
      <LazySection minHeight={520} className="bg-[var(--bg-base)]">
        <ProblemSection />
      </LazySection>
      <LazySection minHeight={140} className="bg-[var(--bg-base)]">
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
      <LazySection minHeight={680} className="bg-[var(--bg-base)]">
        <TechnologySection />
      </LazySection>
      <LazySection minHeight={720} className="bg-[var(--bg-base)]">
        <HowItWorksSection />
      </LazySection>
      <LazySection minHeight={860} className="bg-[var(--bg-soft)]">
        <PricingSection />
      </LazySection>
      <LazySection minHeight={720} className="bg-[var(--bg-base)]">
        <TestimonialsSection />
      </LazySection>
      <LazySection minHeight={620} className="bg-[var(--bg-base)]">
        <TrustSection />
      </LazySection>
      <LazySection minHeight={720} className="bg-[var(--bg-soft)]">
        <FAQSection />
      </LazySection>
      <LazySection minHeight={560} className="bg-[var(--bg-base)]">
        <FinalCTASection />
      </LazySection>
      <LazySection minHeight={640}>
        <FooterSection />
      </LazySection>
    </>
  )
}
