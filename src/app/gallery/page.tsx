import type { Metadata } from 'next'

import Navbar from '@/components/Navbar'
import GalleryClient from './GalleryClient'
import { getPublishedGalleryItems } from '@/lib/gallery/public-data'

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

export default async function GalleryPage() {
  const items = await getPublishedGalleryItems().catch(() => [])

  return (
    <div className="min-h-screen overflow-hidden bg-[#f8f7f4]">
      <Navbar transparent />
      <GalleryClient items={items} />
    </div>
  )
}
