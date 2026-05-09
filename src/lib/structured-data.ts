import { absoluteUrl, siteUrl } from '@/lib/site'
import type { BusinessSettings } from '@/lib/admin/business-settings'
import { FALLBACK_SETTINGS } from '@/lib/settings-fallback'

const fallback = FALLBACK_SETTINGS

export function makeOrganizationJsonLd(settings: BusinessSettings) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.legalBusinessName || settings.businessName || fallback.businessName,
    url: siteUrl,
    logo: settings.logoUrl ? absoluteUrl(settings.logoUrl) : absoluteUrl('/logo.png'),
    email: settings.primaryEmail || fallback.primaryEmail,
    slogan: settings.tagline || fallback.tagline,
    areaServed: settings.country || 'India',
    telephone: settings.primaryPhone || fallback.primaryPhone,
  }
}

export function makeWebsiteJsonLd(settings: BusinessSettings) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: settings.businessName || fallback.businessName,
    url: siteUrl,
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
  ].filter(Boolean)

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: settings.legalBusinessName || settings.businessName || fallback.businessName,
    image: settings.logoUrl ? absoluteUrl(settings.logoUrl) : absoluteUrl('/logo.png'),
    url: siteUrl,
    description: settings.businessDescription || fallback.businessDescription,
    telephone: settings.primaryPhone || fallback.primaryPhone,
    email: settings.primaryEmail || fallback.primaryEmail,
    address: {
      '@type': 'PostalAddress',
      streetAddress: addressParts || 'Mumbai, Maharashtra',
      addressLocality: settings.city || 'Mumbai',
      addressRegion: settings.state || 'Maharashtra',
      postalCode: settings.postalCode || '400053',
      addressCountry: 'IN',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '19.0760',
      longitude: '72.8777',
    },
    areaServed: [
      { '@type': 'Country', name: 'India' },
      { '@type': 'City', name: 'Mumbai' },
      { '@type': 'City', name: 'Pune' },
      { '@type': 'City', name: 'Bangalore' },
      { '@type': 'City', name: 'Delhi' },
      { '@type': 'City', name: 'Hyderabad' },
      { '@type': 'City', name: 'Chennai' },
    ],
    serviceType: [
      '3D Printing',
      'Rapid Prototyping',
      'Resin Printing',
      'FDM Printing',
      '3D Modeling',
    ],
    priceRange: '₹99 - ₹50,000',
    openingHours: settings.workingDays ? `${settings.workingDays.replace('—', '-').replace('–', '-').slice(0, 2)}-${settings.workingDays.slice(-1)} 09:00-20:00` : 'Mo-Sa 09:00-20:00',
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
      name: 'What file formats do you accept?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'We accept STL, STEP, OBJ, 3MF, DXF, and DWG files. For medical models, we also accept DICOM files and convert them to printable format.',
      },
    },
    {
      '@type': 'Question',
      name: 'How long does it take to get my print?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Standard orders are delivered in 3–5 business days across India. Express orders placed before 10 AM are dispatched the same day within Mumbai and Pune, delivering in 24–48 hours.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is your minimum order quantity?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'There is no minimum order. You can order a single print for ₹99. We print one piece with the same care and quality as a batch of 500.',
      },
    },
    {
      '@type': 'Question',
      name: 'What materials do you stock?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'We currently stock PLA+, PETG, ABS, ASA, TPU, Nylon PA12, Silk PLA, Multi-Color PLA, Standard Resin 4K, and ABS-Like Resin.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I pay?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'We accept all major payment methods — UPI (Google Pay, PhonePe, Paytm), Razorpay, debit/credit cards, net banking.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is my design file kept confidential?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Absolutely. We never share, sell, or use your design files for any purpose other than printing your order.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do you offer discounts for bulk orders?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Orders of 10+ units get 10% off. 50+ units get 20% off. 100+ units get 30% off.',
      },
    },
    {
      '@type': 'Question',
      name: 'What if my print comes out wrong?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'If the defect is on our side — we reprint it for free. We send a photo of every completed print before dispatch.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do you ship outside India?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Currently we ship across all of India. International shipping is available on request for specific orders.',
      },
    },
  ],
}
