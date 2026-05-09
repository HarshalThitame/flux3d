import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'

export const dynamic = 'force-static'

import Navbar from '@/components/Navbar'
import { absoluteUrl } from '@/lib/site'
import GalleryClient from './GalleryClient'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title: `${settings.businessName} — 3D Printing Project Gallery`,
    description:
      settings.businessDescription || 'Browse Flux3D application categories for prototypes, functional parts, brand models, miniatures, and production fixtures.',
    alternates: {
      canonical: '/gallery',
    },
    openGraph: {
      title: `${settings.businessName} Gallery`,
      description:
        settings.businessDescription || 'A curated look at print categories across prototyping, production, branding, and precision detail work.',
      url: absoluteUrl('/gallery'),
    },
  }
}

export default function GalleryPage() {
  return (
    <div>
      <Navbar transparent />
      <GalleryClient />
    </div>
  )
}
