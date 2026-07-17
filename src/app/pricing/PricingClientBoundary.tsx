'use client'

import dynamic from 'next/dynamic'
import RouteChunkLoader from '@/components/RouteChunkLoader'

type MaterialPricing = {
  name: string
  price_per_gram: number
  density: number
}

const PricingClient = dynamic(() => import('./PricingClient'), {
  ssr: false,
  loading: () => <RouteChunkLoader className="text-white" minHeight="86svh" label="Loading pricing" />,
})

export default function PricingClientBoundary({ materials }: { materials: MaterialPricing[] }) {
  return <PricingClient materials={materials} />
}
