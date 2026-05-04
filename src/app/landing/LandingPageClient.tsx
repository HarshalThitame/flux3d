'use client'

import dynamic from 'next/dynamic'

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

export default function LandingPageClient() {
  return (
    <>
      <ProblemSection />
      <MarqueeSection />
      <ServicesSection />
      <MaterialsSection />
      <TechnologySection />
      <HowItWorksSection />
      <PricingSection />
      <TestimonialsSection />
      <TrustSection />
      <FAQSection />
      <FinalCTASection />
      <FooterSection />
    </>
  )
}
