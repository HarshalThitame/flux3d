import { absoluteUrl, siteUrl } from '@/lib/site'
import type { BusinessSettings } from '@/lib/admin/business-settings'
import { FALLBACK_SETTINGS } from '@/lib/settings-fallback'

const fallback = FALLBACK_SETTINGS

export function makeOrganizationJsonLd(settings: BusinessSettings) {
  const publicUrl = settings.websiteUrl || siteUrl
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.legalBusinessName || settings.businessName || fallback.businessName,
    url: publicUrl,
    logo: settings.logoUrl ? absoluteUrl(settings.logoUrl) : absoluteUrl('/logo.webp'),
    email: settings.primaryEmail || fallback.primaryEmail,
    areaServed: settings.country || 'India',
    telephone: settings.primaryPhone || fallback.primaryPhone,
  }
}

export function makeWebsiteJsonLd(settings: BusinessSettings) {
  const publicUrl = settings.websiteUrl || siteUrl
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: settings.businessName || fallback.businessName,
    url: publicUrl,
    description: settings.businessDescription || fallback.businessDescription,
    publisher: {
      '@type': 'Organization',
      name: settings.legalBusinessName || settings.businessName || fallback.businessName,
    },
  }
}

export function makeLocalBusinessJsonLd(settings: BusinessSettings) {
  const addressParts = [
    settings.addressLine1,
    settings.addressLine2,
  ].filter(Boolean).join(', ')
  const sameAs = [
    settings.instagramUrl,
    settings.facebookUrl,
    settings.linkedinUrl,
    settings.twitterUrl,
    settings.youtubeUrl,
    settings.threadsUrl,
    settings.pinterestUrl,
    settings.githubUrl,
    settings.websiteUrl,
  ].filter(Boolean)

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: settings.legalBusinessName || settings.businessName || fallback.businessName,
    image: settings.logoUrl ? absoluteUrl(settings.logoUrl) : absoluteUrl('/logo.webp'),
    url: siteUrl,
    description: settings.businessDescription || fallback.businessDescription,
    telephone: settings.primaryPhone || fallback.primaryPhone,
    email: settings.primaryEmail || fallback.primaryEmail,
    address: {
      '@type': 'PostalAddress',
      streetAddress: addressParts || `${fallback.addressLine1}, ${fallback.city}, ${fallback.state}`,
      addressLocality: settings.city || fallback.city,
      addressRegion: settings.state || fallback.state,
      postalCode: settings.postalCode || fallback.postalCode,
      addressCountry: 'IN',
    },
    areaServed: [
      { '@type': 'Country', name: 'India' },
    ],
    serviceType: [
      'Custom 3D Printing',
      'Rapid Prototyping',
      'Ready-Made 3D Products',
      'Custom Manufacturing',
    ],
    priceRange: 'Quotation based',
    openingHours: settings.businessHours || undefined,
    sameAs: sameAs.length > 0 ? sameAs : [
      fallback.instagramUrl,
      fallback.linkedinUrl,
      fallback.twitterUrl,
    ].filter(Boolean),
  }
}

export const organizationJsonLd = makeOrganizationJsonLd(FALLBACK_SETTINGS)
export const websiteJsonLd = makeWebsiteJsonLd(FALLBACK_SETTINGS)
export const localBusinessJsonLd = makeLocalBusinessJsonLd(FALLBACK_SETTINGS)

export const faqPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How do I request a quote?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Customers can upload a design file or share product details through the website contact flow or quote request process. The final price is confirmed after the design, material, finish, and quantity are reviewed.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do you sell physical goods?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Flux 3D provides digitally ordered manufacturing services and ready-made 3D printed products. There is no general catalogue of physical goods unrelated to the service.',
      },
    },
    {
      '@type': 'Question',
      name: 'How are payments handled?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Payments are handled through the website checkout flow. Payment authorization and settlement details are verified on the server before an order is marked successful.',
      },
    },
    {
      '@type': 'Question',
      name: 'How are order issues handled?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Customers can contact support with order details, photos, and delivery information. Damaged, defective, incorrect, cancellation and refund cases are reviewed according to the published policies.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I contact support?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Customers can contact Flux 3D by email, phone, or the public contact page listed on the website.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is my design file kept confidential?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Design files are used only to review, quote, and produce the requested order, subject to the privacy policy and the customer’s instructions.',
      },
    },
    {
      '@type': 'Question',
      name: 'Where do you deliver?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Delivery is available across serviceable locations in India. Production and shipping timelines are shared before final order confirmation where possible.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I cancel an order?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Cancellation depends on the order type and production stage. Custom orders usually cannot be cancelled after production starts; ready-made products can be cancelled before dispatch if the request is approved.',
      },
    },
    {
      '@type': 'Question',
      name: 'Are refunds available?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Refund eligibility depends on the order type, the issue reported, and the published refund and cancellation policy.',
      },
    },
  ],
}
