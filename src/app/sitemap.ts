import type { MetadataRoute } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type BlogSitemapRow = {
  slug: string
  updated_at?: string | null
  last_modified_at?: string | null
  published_at?: string | null
  created_at?: string | null
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createServerSupabaseClient()
  const { data: blogPosts, error } = await supabase
    .from('blog_posts')
    .select('slug, updated_at, last_modified_at, published_at, created_at')
    .eq('status', 'published')

  if (error) {
    console.error('[sitemap] Failed to load blog posts:', error)
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: 'https://flux3d.in', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: 'https://flux3d.in/services', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: 'https://flux3d.in/materials', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://flux3d.in/gallery', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: 'https://flux3d.in/pricing', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: 'https://flux3d.in/instant-quote', lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    { url: 'https://flux3d.in/blog', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ]

  const blogRoutes: MetadataRoute.Sitemap = ((blogPosts ?? []) as BlogSitemapRow[])
    .filter((post) => post.slug)
    .map((post) => ({
      url: `https://flux3d.in/blog/${post.slug}`,
      lastModified: new Date(post.last_modified_at || post.updated_at || post.published_at || post.created_at || Date.now()),
      changeFrequency: 'monthly',
      priority: 0.6,
    }))

  return [...staticRoutes, ...blogRoutes]
}
