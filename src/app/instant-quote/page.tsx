import type { Metadata } from 'next'
import { getPublicSettings } from '@/lib/settings'
import dynamic from 'next/dynamic'
import Navbar from '@/components/Navbar'
import { getCurrentUserProfile } from '@/lib/auth/server'
import { getPublicQuoteMaterials } from '@/lib/public-materials'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: {
    absolute: 'Get Instant 3D Printing Quote — Upload Your Model | Flux3D',
  },
  description:
    'Upload your STL, OBJ or 3MF file and get a free 3D printing quote in 2 minutes. No account needed. Powered by Bambu Lab P2S.',
  alternates: {
    canonical: '/instant-quote',
  },
}

const InstantQuoteWorkspace = dynamic(
  () => import('@/components/instant-quote/InstantQuoteWorkspace'),
  {
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFFFF]">
        <div className="text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border border-[#6d28d9]/20 bg-[#6d28d9]/10">
            <svg className="h-8 w-8 text-[#6d28d9] animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-sm text-[#6F7192]">Loading quote workspace...</p>
        </div>
      </div>
    ),
    ssr: true,
  }
)

type InstantQuotePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function InstantQuotePage({ searchParams }: InstantQuotePageProps) {
  const params = await searchParams
  const modelFileId = typeof params.modelFile === 'string' ? params.modelFile : undefined
  const auth = await getCurrentUserProfile()
  let initialModelFile: { fileName: string; fileUrl: string; material?: string | null } | undefined

  if (auth && modelFileId) {
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase
      .from('model_files')
      .select('file_name, file_url, material')
      .eq('id', modelFileId)
      .eq('user_id', auth.user.id)
      .maybeSingle()

    if (data?.file_url) {
      initialModelFile = {
        fileName: data.file_name || data.file_url.split('/').pop() || 'Uploaded model',
        fileUrl: data.file_url,
        material: data.material,
      }
    }
  }

  const initialMaterialId = typeof params.material === 'string'
    ? params.material
    : initialModelFile?.material ?? undefined
  const materials = await getPublicQuoteMaterials()
  const settings = await getPublicSettings()

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0F1B3D]">
      <Navbar transparent />
      <InstantQuoteWorkspace
        user={auth?.profile ?? null}
        materials={materials}
        initialMaterialId={initialMaterialId}
        initialModelFile={initialModelFile}
        pricingSettings={{
          overheadPercentage: settings.overheadPercentage,
          marginPercentage: settings.marginPercentage,
          materialMarkupPercent: settings.materialMarkupPercent,
          printSpeedGramsPerHour: settings.printSpeedGramsPerHour,
          postProcessingMultipliers: settings.postProcessingMultipliers,
          deliveryChargeThreshold: settings.deliveryChargeThreshold,
          defaultDeliveryCharge: settings.defaultDeliveryCharge,
          cartDiscountEnabled: settings.cartDiscountEnabled,
          cartDiscountTiers: settings.cartDiscountTiers,
        }}
        bulkOrderContact={{
          email: settings.primaryEmail,
          whatsappNumber: settings.whatsappNumber || settings.whatsappOrderNumber || settings.primaryPhone,
        }}
      />
    </div>
  )
}
