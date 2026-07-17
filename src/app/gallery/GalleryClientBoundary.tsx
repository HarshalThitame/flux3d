'use client'

import dynamic from 'next/dynamic'
import RouteChunkLoader from '@/components/RouteChunkLoader'

const GalleryClient = dynamic(() => import('./GalleryClient'), {
  ssr: false,
  loading: () => <RouteChunkLoader className="bg-[#05060a] text-white" minHeight="86svh" label="Loading gallery" />,
})

export default function GalleryClientBoundary() {
  return <GalleryClient />
}
