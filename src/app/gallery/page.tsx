import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

import Navbar from '@/components/Navbar'
import GalleryClient from './GalleryClient'

export const metadata: Metadata = {
  title: {
    absolute: '3D Print Gallery — Real Projects by Flux3D | Flux3D',
  },
  description:
    'Browse real 3D printing projects by Flux3D. Industrial parts, architecture models, medical models, student projects & custom designs.',
  alternates: {
    canonical: '/gallery',
  },
}

export default function GalleryPage() {
  return (
    <div className="gallery-premium-shell min-h-screen overflow-hidden bg-[#05060a] text-white">
      <Navbar transparent />
      <GalleryClient />
    </div>
  )
}
