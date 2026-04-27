import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth/server'
import Navbar from '@/components/Navbar'
import QuotePage from '@/components/quote/QuotePage'
import { absoluteUrl } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Get Instant 3D Printing Quote',
  description:
    'Upload STL, OBJ, or 3MF files, preview your model in 3D, customize print settings, and get an instant Flux3D price estimate.',
  alternates: {
    canonical: '/quote',
  },
  openGraph: {
    title: 'Flux3D Instant Quote',
    description:
      'Interactive model upload, live 3D preview, and real-time printing price estimation.',
    url: absoluteUrl('/quote'),
  },
  twitter: {
    title: 'Flux3D Instant Quote',
    description:
      'Interactive model upload, live 3D preview, and real-time printing price estimation.',
  },
}

export default async function InstantQuoteRoute() {
  const auth = await requireUser('/quote')
  const initialQuoteId = `F3D-${crypto.randomUUID().slice(0, 8).toUpperCase()}`

  return (
    <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
      <Navbar transparent />
      <QuotePage user={auth.profile} initialQuoteId={initialQuoteId} />
    </div>
  )
}
