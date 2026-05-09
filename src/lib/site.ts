import { FALLBACK_SETTINGS } from '@/lib/settings-fallback'
import type { BusinessSettings } from '@/lib/admin/business-settings'

const fallback = FALLBACK_SETTINGS

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

export const siteUrl = normalizeSiteUrl(siteUrlEnv)

export function makeSiteConfig(settings: BusinessSettings) {
  return {
    name: settings.businessName || 'Flux3D',
    shortName: settings.brandName || 'Flux3D',
    title: settings.metaTitle || `${settings.businessName} | Premium 3D Printing Services`,
    description: settings.businessDescription || fallback.businessDescription,
    url: siteUrl,
    ogImage: settings.ogImageUrl || '/opengraph-image.png',
    keywords: settings.metaKeywords ? settings.metaKeywords.split(',').map(k => k.trim()) : fallback.metaKeywords.split(',').map(k => k.trim()),
    company: {
      name: settings.legalBusinessName || settings.businessName || fallback.businessName,
      slogan: settings.tagline || fallback.tagline,
      email: settings.primaryEmail || fallback.primaryEmail,
      areaServed: settings.country || 'India',
      telephone: settings.primaryPhone || fallback.primaryPhone,
      address: {
        streetAddress: `${settings.addressLine1}${settings.addressLine2 ? ', ' + settings.addressLine2 : ''}`,
        addressLocality: settings.city || 'Mumbai',
        addressRegion: settings.state || 'Maharashtra',
        postalCode: settings.postalCode || '400053',
        addressCountry: 'IN',
      },
    },
  }
}

export const siteConfig = makeSiteConfig(FALLBACK_SETTINGS)

export function absoluteUrl(path = '/') {
  return new URL(path, siteUrl).toString()
}
