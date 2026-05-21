import type { Metadata } from 'next'

export const dynamic = 'force-static'

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
    <div>
      <Navbar transparent />
      <GalleryClient />
    </div>
  )
}
