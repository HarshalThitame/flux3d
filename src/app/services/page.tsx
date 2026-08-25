import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import { getCspNonce } from '@/lib/csp'
import { absoluteUrl } from '@/lib/site'
import { getSettings } from '@/lib/settings'
import {
  orderSteps,
  serviceVerticals,
  servicesFaqs,
  servicesPageMeta,
} from '@/lib/services-content'
import ServicesHero from './ServicesHero'
import ServicesList from './ServicesList'
import HowToOrder from './HowToOrder'
import WhyChooseUs from './WhyChooseUs'
import FAQSection from './FAQSection'
import BottomCTA from './BottomCTA'

export const metadata: Metadata = {
  title: {
    absolute: servicesPageMeta.title,
  },
  description: servicesPageMeta.description,
  keywords: [
    '3D printing services India',
    'FDM printing services',
    'resin SLA printing',
    'rapid prototyping India',
    'custom 3D printed parts',
    'spare parts 3D printing',
    'architecture scale models',
    'medical dental 3D printing',
    'corporate gifting 3D printing',
    'student project 3D printing',
  ],
  alternates: {
    canonical: '/services',
  },
  openGraph: {
    title: servicesPageMeta.title,
    description: servicesPageMeta.description,
    url: absoluteUrl('/services'),
    siteName: 'Flux3D',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: servicesPageMeta.title,
    description: servicesPageMeta.description,
  },
}

function buildServicesJsonLd() {
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
            name: 'Services',
            item: absoluteUrl('/services'),
          },
        ],
      },
      ...serviceVerticals.map((service) => ({
        '@type': 'Service',
        name: service.title,
        description: service.description,
        serviceType: `${service.category} 3D Printing`,
        url: absoluteUrl(`/services#${service.slug}`),
        provider: {
          '@type': 'Organization',
          name: 'Flux3D',
          url: absoluteUrl('/'),
        },
        areaServed: {
          '@type': 'Country',
          name: 'India',
        },
      })),
      {
        '@type': 'HowTo',
        name: 'How to order a 3D print from Flux3D',
        step: orderSteps.map((step) => ({
          '@type': 'HowToStep',
          position: Number(step.step),
          name: step.title,
          text: step.description,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: servicesFaqs.map((faq) => ({
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

function sanitizeWhatsApp(value: string | undefined | null) {
  return (value || '+919623023480').replace(/[^0-9]/g, '')
}

export default async function ServicesPage() {
  const [settings, nonce] = await Promise.all([getSettings(), getCspNonce()])
  const whatsappNumber = sanitizeWhatsApp(settings.whatsappNumber)

  return (
    <div className="min-h-screen bg-[var(--lux-bg-base,#FDFCF8)] text-[var(--lux-text-primary)]">
      <Navbar transparent />
      <script
        nonce={nonce}
        suppressHydrationWarning
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildServicesJsonLd()).replace(/</g, '\\u003c') }}
      />
      <ServicesHero whatsappNumber={whatsappNumber} />
      <ServicesList />
      <HowToOrder />
      <WhyChooseUs />
      <FAQSection whatsappNumber={whatsappNumber} />
      <BottomCTA whatsappNumber={whatsappNumber} />
    </div>
  )
}
