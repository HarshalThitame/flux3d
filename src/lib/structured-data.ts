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
  '@type': 'ProfessionalService',
  name: siteConfig.company.name,
  image: absoluteUrl('/logo.png'),
  url: siteConfig.url,
  description: siteConfig.description,
  areaServed: {
    '@type': 'Country',
    name: 'India',
  },
  serviceType: [
    '3D Printing',
    'Rapid Prototyping',
    'Resin Printing',
    'FDM Printing',
    '3D Modeling',
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
