import type { Metadata } from 'next'
import '../landing-luxury-unified.css'

import Navbar from '@/components/Navbar'
import { getCspNonce } from '@/lib/csp'
import { absoluteUrl } from '@/lib/site'
import { getSettings } from '@/lib/settings'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  pricingFaqs,
  pricingPageMeta,
  workflowSteps,
} from '@/lib/pricing-content'
import PricingHero from './PricingHero'
import QuoteDrivers from './QuoteDrivers'
import MaterialRates from './MaterialRates'
import HowItPriced from './HowItPriced'
import PricingFAQ from './PricingFAQ'
import BottomCTA from './BottomCTA'

export const metadata: Metadata = {
  title: {
    absolute: pricingPageMeta.title,
  },
  description: pricingPageMeta.description,
  keywords: [
    '3D printing price India',
    '3D printing cost per gram',
    'PLA printing price',
    'resin printing cost India',
    '3D printing rates per gram',
    'custom 3D printing quote',
    '3D printing price list',
    'bulk 3D printing pricing',
  ],
  alternates: {
    canonical: '/pricing',
  },
  openGraph: {
    title: pricingPageMeta.title,
    description: pricingPageMeta.description,
    url: absoluteUrl('/pricing'),
    siteName: 'Flux3D',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: pricingPageMeta.title,
    description: pricingPageMeta.description,
  },
}

type MaterialRate = {
  name: string
  price_per_gram: number
  density: number
}

async function getMaterialRates(): Promise<MaterialRate[]> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('materials')
      .select('name, price_per_gram, density')
      .order('price_per_gram', { ascending: true })

    if (error) {
      console.error('[pricing] Failed to load material rates:', error)
      return []
    }

    return ((data ?? []) as MaterialRate[]).filter(
      (material) => material.name && typeof material.price_per_gram === 'number'
    )
  } catch (error) {
    console.error('[pricing] Failed to load material rates:', error)
    return []
  }
}

function buildPricingJsonLd(materials: MaterialRate[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: absoluteUrl('/'),
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Pricing',
            item: absoluteUrl('/pricing'),
          },
        ],
      },
      ...(materials.length > 0
        ? [
            {
              '@type': 'OfferCatalog',
              name: 'Flux3D 3D Printing Material Rates',
              url: absoluteUrl('/pricing#material-rates'),
              itemListElement: materials.map((material, index) => ({
                '@type': 'Offer',
                position: index + 1,
                itemOffered: {
                  '@type': 'Service',
                  name: `${material.name} 3D Printing`,
                  serviceType: 'Custom 3D Printing',
                },
                priceCurrency: 'INR',
                priceSpecification: {
                  '@type': 'UnitPriceSpecification',
                  price: material.price_per_gram,
                  priceCurrency: 'INR',
                  unitText: 'Gram',
                  valueAddedTaxIncluded: false,
                },
                areaServed: {
                  '@type': 'Country',
                  name: 'India',
                },
                seller: {
                  '@type': 'Organization',
                  name: 'Flux3D',
                  url: absoluteUrl('/'),
                },
              })),
            },
          ]
        : []),
      {
        '@type': 'HowTo',
        name: 'How Flux3D quotes a 3D printing order',
        step: workflowSteps.map((step, index) => ({
          '@type': 'HowToStep',
          position: index + 1,
          text: step,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: pricingFaqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
    ],
  }
}

// Live material rates are rendered server-side on every request; a static
// prerender would either fail on cookies() or serve stale rates.
export const dynamic = 'force-dynamic'

function sanitizeWhatsApp(value: string | undefined | null) {
  return (value || '+919623023480').replace(/[^0-9]/g, '')
}

export default async function PricingPage() {
  const [materials, settings, nonce] = await Promise.all([
    getMaterialRates(),
    getSettings(),
    getCspNonce(),
  ])

  const whatsappNumber = sanitizeWhatsApp(settings.whatsappNumber)
  const lowestRate = materials.length > 0 ? materials[0].price_per_gram : null

  return (
    <div className="min-h-screen bg-[var(--lux-bg-base,#FDFCF8)] text-[var(--lux-text-primary)]">
      <Navbar transparent />
      <script
        nonce={nonce}
        suppressHydrationWarning
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildPricingJsonLd(materials)).replace(/</g, '\\u003c') }}
      />
      <PricingHero lowestRate={lowestRate} />
      <QuoteDrivers />
      <MaterialRates materials={materials} />
      <HowItPriced />
      <PricingFAQ whatsappNumber={whatsappNumber} />
      <BottomCTA whatsappNumber={whatsappNumber} />
    </div>
  )
}
