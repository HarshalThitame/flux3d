import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import dynamic from 'next/dynamic'
import Navbar from '@/components/Navbar'
import { getCurrentUserProfile } from '@/lib/auth/server'
import { getPublicQuoteMaterials } from '@/lib/public-materials'
import { absoluteUrl } from '@/lib/site'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title: `${settings.businessName} — Instant 3D Printing Quote Dashboard`,
    description:
      settings.businessDescription || 'Upload STL, OBJ, or 3MF files, inspect the model in 3D, tune print settings, and review a live production quote in a structured dashboard layout.',
    alternates: {
      canonical: '/instant-quote',
    },
    openGraph: {
      title: `${settings.businessName} — Instant Quote Dashboard`,
      description:
        settings.businessDescription || 'Structured upload, 3D preview, material controls, and real-time pricing for 3D printing jobs.',
      url: absoluteUrl('/instant-quote'),
    },
    twitter: {
      title: `${settings.businessName} — Instant Quote Dashboard`,
      description:
        settings.businessDescription || 'Structured upload, 3D preview, material controls, and real-time pricing for 3D printing jobs.',
    },
  }
}

const InstantQuoteWorkspace = dynamic(
  () => import('@/components/instant-quote/InstantQuoteWorkspace'),
  {
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-[#050810]">
        <div className="text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border border-[#FF5C1A]/20 bg-[#FF5C1A]/10">
            <svg className="h-8 w-8 text-[#FF5C1A] animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-sm text-[#7a82a0]">Loading quote workspace...</p>
        </div>
      </div>
    ),
    ssr: true,
  }
)

export default async function InstantQuotePage() {
  const auth = await getCurrentUserProfile()
  const materials = await getPublicQuoteMaterials()

  return (
    <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
      <Navbar transparent />
      <InstantQuoteWorkspace
        user={auth?.profile ?? null}
        materials={materials}
      />
    </div>
  )
}
