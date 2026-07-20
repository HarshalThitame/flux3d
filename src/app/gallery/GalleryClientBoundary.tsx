'use client'

import dynamic from 'next/dynamic'
import RouteChunkLoader from '@/components/RouteChunkLoader'

const GalleryClient = dynamic(() => import('./GalleryClient'), {
  ssr: false,
  loading: () => <RouteChunkLoader className="text-[#0F1B3D]" minHeight="86svh" label="Loading gallery" />,
})

export default function GalleryClientBoundary() {
  return <GalleryClient />
}
