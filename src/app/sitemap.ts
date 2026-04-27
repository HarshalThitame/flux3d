import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    {
      url: absoluteUrl('/'),
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
      images: [absoluteUrl('/logo.png')],
    },
    {
      url: absoluteUrl('/services'),
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
      images: [absoluteUrl('/logo.png')],
    },
  ]
}
