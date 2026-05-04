import type { Metadata } from 'next'

export const runtime = 'edge'

import Navbar from '@/components/Navbar'
import InstantQuoteWorkspace from '@/components/instant-quote/InstantQuoteWorkspace'
import { getCurrentUserProfile } from '@/lib/auth/server'
import { getPublicQuoteMaterials } from '@/lib/public-materials'
import { absoluteUrl } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Instant 3D Printing Quote Dashboard',
  description:
    'Upload STL, OBJ, or 3MF files, inspect the model in 3D, tune print settings, and review a live production quote in a structured dashboard layout.',
  alternates: {
    canonical: '/instant-quote',
  },
  openGraph: {
    title: 'Flux3D Instant Quote Dashboard',
    description:
      'Structured upload, 3D preview, material controls, and real-time pricing for 3D printing jobs.',
    url: absoluteUrl('/instant-quote'),
  },
  twitter: {
    title: 'Flux3D Instant Quote Dashboard',
    description:
      'Structured upload, 3D preview, material controls, and real-time pricing for 3D printing jobs.',
  },
}

export default async function InstantQuotePage() {
  const auth = await getCurrentUserProfile()
  const initialQuoteId = `F3D-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  const materials = await getPublicQuoteMaterials()

  return (
    <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
      <Navbar transparent />
      <InstantQuoteWorkspace
        user={auth?.profile ?? null}
        initialQuoteId={initialQuoteId}
        materials={materials}
      />
    </div>
  )
}
