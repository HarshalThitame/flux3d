import type { MetadataRoute } from 'next'
import { absoluteUrl, siteConfig } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: 'facebookexternalhit',
        allow: '/',
      },
      {
        userAgent: '*',
        allow: ['/', '/blog', '/blog/*'],
      },
    ],
    host: siteConfig.url,
    sitemap: absoluteUrl('/sitemap.xml'),
  }
}
