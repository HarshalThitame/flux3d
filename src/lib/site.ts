const siteUrlEnv =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.VERCEL_PROJECT_PRODUCTION_URL ??
  process.env.VERCEL_URL

function normalizeSiteUrl(value?: string) {
  if (!value) {
    return 'http://localhost:3000'
  }

  const withProtocol = value.startsWith('http') ? value : `https://${value}`

  return withProtocol.replace(/\/+$/, '')
}

export const siteConfig = {
  name: 'Flux3D',
  shortName: 'Flux3D',
  title: 'Flux3D | Premium 3D Printing Services in India | ₹99 Onwards',
  description:
    'India\'s most trusted 3D printing service in Mumbai. Industrial parts, architecture models, student projects & corporate gifts. Starting ₹99. Pan-India delivery with GST invoices.',
  url: normalizeSiteUrl(siteUrlEnv),
  ogImage: '/opengraph-image.png',
  keywords: [
    '3D printing services India',
    '3D printing Mumbai',
    'rapid prototyping India',
    'custom 3D printing',
    'resin printing service',
    'FDM printing service',
    '3D modeling service',
    'Bambu Lab 3D printing',
    'industrial 3D printing',
    'architecture models India',
    'Flux3D',
  ],
  company: {
    name: 'Flux3D',
    slogan: 'Additive Innovation',
    email: 'hello@flux3d.in',
    areaServed: 'India',
    telephone: '+919623023480',
    address: {
      streetAddress: 'Mumbai, Maharashtra',
      addressLocality: 'Mumbai',
      addressRegion: 'Maharashtra',
      postalCode: '400053',
      addressCountry: 'IN',
    },
  },
}

export function absoluteUrl(path = '/') {
  return new URL(path, siteConfig.url).toString()
}
