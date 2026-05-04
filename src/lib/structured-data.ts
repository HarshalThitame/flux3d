import { absoluteUrl, siteConfig } from '@/lib/site'

export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteConfig.company.name,
  url: siteConfig.url,
  logo: absoluteUrl('/logo.png'),
  email: siteConfig.company.email,
  slogan: siteConfig.company.slogan,
  areaServed: siteConfig.company.areaServed,
  telephone: '+919623023480',
}

export const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
  publisher: {
    '@type': 'Organization',
    name: siteConfig.company.name,
  },
}

export const localBusinessJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: siteConfig.company.name,
  image: absoluteUrl('/logo.png'),
  url: siteConfig.url,
  description: siteConfig.description,
  telephone: '+919623023480',
  email: siteConfig.company.email,
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Mumbai, Maharashtra',
    addressLocality: 'Mumbai',
    addressRegion: 'Maharashtra',
    postalCode: '400053',
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
  openingHours: 'Mo-Sa 09:00-20:00',
  sameAs: [
    'https://instagram.com/flux3d',
    'https://linkedin.com/company/flux3d',
    'https://twitter.com/flux3d',
  ],
}

export const servicesPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: '3D Printing Services',
  provider: {
    '@type': 'Organization',
    name: siteConfig.company.name,
    url: siteConfig.url,
  },
  areaServed: {
    '@type': 'Country',
    name: 'India',
  },
  serviceType: [
    'Rapid Prototyping',
    'FDM Printing',
    'Resin Printing',
    'Custom CAD Design',
  ],
  url: absoluteUrl('/services'),
  description:
    'Professional 3D printing services for prototypes, production parts, and custom components delivered across India.',
}

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
      name: 'Do you provide GST invoices?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes — every single order, without exception, comes with a proper GST invoice. We are GST registered.',
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
