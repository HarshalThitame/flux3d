'use client'

import dynamic from 'next/dynamic'
import RouteChunkLoader from '@/components/RouteChunkLoader'
import type { InstantQuoteWorkspaceProps } from '@/components/instant-quote/InstantQuoteWorkspace'

const InstantQuoteWorkspace = dynamic(
  () => import('@/components/instant-quote/InstantQuoteWorkspace'),
  {
    ssr: false,
    loading: () => (
      <RouteChunkLoader
        className="instant-quote-premium-shell bg-[#05060a] text-white"
        minHeight="100vh"
        label="Loading quote workspace"
      />
    ),
  }
)

export default function InstantQuoteWorkspaceBoundary(props: InstantQuoteWorkspaceProps) {
  return <InstantQuoteWorkspace {...props} />
}
