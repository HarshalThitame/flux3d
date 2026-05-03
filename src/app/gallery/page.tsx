import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import { absoluteUrl } from '@/lib/site'
import GalleryClient from './GalleryClient'

export const metadata: Metadata = {
  title: '3D Printing Project Gallery',
  description:
    'Browse Flux3D application categories for prototypes, functional parts, brand models, miniatures, and production fixtures.',
  alternates: {
    canonical: '/gallery',
  },
  openGraph: {
    title: 'Flux3D Gallery',
    description:
      'A curated look at print categories across prototyping, production, branding, and precision detail work.',
    url: absoluteUrl('/gallery'),
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
