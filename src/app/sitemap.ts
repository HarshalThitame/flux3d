import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/site'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import type { BlogPost } from '@/lib/blog/types'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date()
  let blogPosts: BlogPost[] = []

  try {
    const supabase = createAdminSupabaseClient()
    const { data } = await supabase
      .from('blog_posts')
      .select('slug, updated_at, last_modified_at, published_at, created_at, featured_image')
      .eq('status', 'published')
      .returns<BlogPost[]>()

    blogPosts = data || []
  } catch {
    blogPosts = []
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl('/'),
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
      images: [absoluteUrl('/logo.png')],
    },
    {
      url: absoluteUrl('/about'),
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/services'),
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: absoluteUrl('/materials'),
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/gallery'),
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: absoluteUrl('/pricing'),
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/blog'),
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: absoluteUrl('/instant-quote'),
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: absoluteUrl('/privacy-policy'),
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: absoluteUrl('/terms-of-service'),
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: absoluteUrl('/refund-policy'),
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: absoluteUrl('/shipping-policy'),
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: new Date(post.last_modified_at || post.updated_at || post.published_at || post.created_at),
    changeFrequency: 'weekly',
    priority: 0.7,
    images: post.featured_image ? [absoluteUrl(post.featured_image)] : undefined,
  }))

  return [...staticRoutes, ...blogRoutes]
}
