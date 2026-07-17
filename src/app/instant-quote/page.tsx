import type { Metadata } from 'next'
import { getPublicSettings } from '@/lib/settings'
import Navbar from '@/components/Navbar'
import { getCurrentUserProfile } from '@/lib/auth/server'
import { getPublicQuoteMaterials } from '@/lib/public-materials'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CartProvider } from '@/lib/cart/context'
import InstantQuoteWorkspaceBoundary from './InstantQuoteWorkspaceBoundary'

export const metadata: Metadata = {
  title: {
    absolute: 'Get a 3D Printing Quote | Flux3D',
  },
  description:
    'Upload your 3D model or share your requirements to request a custom 3D printing quote from Flux3D.',
  alternates: {
    canonical: '/instant-quote',
  },
}

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
    <div className="instant-quote-premium-shell min-h-screen overflow-hidden bg-[#05060a] text-white">
      <Navbar transparent />
      <CartProvider initialSettings={settings}>
        <InstantQuoteWorkspaceBoundary
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
      </CartProvider>
    </div>
  )
}
