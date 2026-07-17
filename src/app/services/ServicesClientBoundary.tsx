'use client'

import dynamic from 'next/dynamic'
import RouteChunkLoader from '@/components/RouteChunkLoader'

const ServicesHero = dynamic(() => import('./ServicesHero'), {
  ssr: false,
  loading: () => <RouteChunkLoader className="text-white" minHeight="86svh" label="Loading services hero" />,
})
const ServicesList = dynamic(() => import('./ServicesList'), {
  ssr: false,
  loading: () => <RouteChunkLoader className="text-white" minHeight="560px" label="Loading services list" />,
})
const WhyChooseUs = dynamic(() => import('./WhyChooseUs'), {
  ssr: false,
  loading: () => <RouteChunkLoader className="text-white" minHeight="420px" label="Loading trust section" />,
})
const HowToOrder = dynamic(() => import('./HowToOrder'), {
  ssr: false,
  loading: () => <RouteChunkLoader className="text-white" minHeight="420px" label="Loading order flow" />,
})
const FAQSection = dynamic(() => import('./FAQSection'), {
  ssr: false,
  loading: () => <RouteChunkLoader className="text-white" minHeight="420px" label="Loading FAQs" />,
})
const BottomCTA = dynamic(() => import('./BottomCTA'), {
  ssr: false,
  loading: () => <RouteChunkLoader className="text-white" minHeight="320px" label="Loading call to action" />,
})

export default function ServicesClientBoundary() {
  return (
    <>
      <ServicesHero />
      <ServicesList />
      <WhyChooseUs />
      <HowToOrder />
      <FAQSection />
      <BottomCTA />
    </>
  )
}
