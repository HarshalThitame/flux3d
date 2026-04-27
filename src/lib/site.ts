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
  title: 'Flux3D | 3D Printing Services in India',
  description:
    'Flux3D provides high-precision 3D printing, rapid prototyping, resin printing, and custom CAD support across India.',
  url: normalizeSiteUrl(siteUrlEnv),
  ogImage: '/logo.png',
  keywords: [
    '3D printing services India',
    'rapid prototyping India',
    'custom 3D printing',
    'resin printing service',
    'FDM printing service',
    '3D modeling service',
    'Flux3D',
  ],
  company: {
    name: 'Flux3D',
    slogan: 'Additive Innovation',
    email: 'hello@flux3d.in',
    areaServed: 'India',
  },
}

export function absoluteUrl(path = '/') {
  return new URL(path, siteConfig.url).toString()
}
