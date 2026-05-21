import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/profile', '/api/'],
    },
    sitemap: 'https://flux3d.in/sitemap.xml',
  }
}
