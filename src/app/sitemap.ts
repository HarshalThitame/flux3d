import type { MetadataRoute } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getShopCategories, listAllShopProducts } from '@/lib/shop/public-data'

type BlogSitemapRow = {
  slug: string
  updated_at?: string | null
  last_modified_at?: string | null
  published_at?: string | null
  created_at?: string | null
}

async function getShopRoutes(): Promise<MetadataRoute.Sitemap> {
  try {
    const [categories, products] = await Promise.all([
      getShopCategories(),
      listAllShopProducts(),
    ])

    const categoryRoutes: MetadataRoute.Sitemap = categories
      .filter((category) => category.slug)
      .map((category) => ({
        url: `https://flux3d.in/3d-shop/category/${category.slug}`,
        // No reliable per-category update timestamp — omit lastMod rather
        // than emitting a fake one.
        changeFrequency: 'weekly',
        priority: 0.8,
      }))

    const productRoutes: MetadataRoute.Sitemap = products
      .filter((product) => product.slug && product.stock_status !== 'unavailable')
      .map((product) => ({
        url: `https://flux3d.in/3d-shop/product/${product.slug}`,
        lastModified: new Date(product.updated_at || product.created_at || Date.now()),
        changeFrequency: 'weekly',
        priority: 0.9,
      }))

    return [...categoryRoutes, ...productRoutes]
  } catch (error) {
    console.error('[sitemap] Failed to load shop data:', error)
    return []
  }
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

  // Static routes: omit lastModified — a constant "now" is worse than no
  // signal (it tells crawlers everything changed on every fetch).
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: 'https://flux3d.in', changeFrequency: 'weekly', priority: 1 },
    { url: 'https://flux3d.in/about', changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://flux3d.in/contact', changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://flux3d.in/features', changeFrequency: 'monthly', priority: 0.9 },
    { url: 'https://flux3d.in/services', changeFrequency: 'monthly', priority: 0.9 },
    { url: 'https://flux3d.in/materials', changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://flux3d.in/gallery', changeFrequency: 'weekly', priority: 0.8 },
    { url: 'https://flux3d.in/pricing', changeFrequency: 'monthly', priority: 0.9 },
    { url: 'https://flux3d.in/instant-quote', changeFrequency: 'monthly', priority: 1 },
    { url: 'https://flux3d.in/privacy-policy', changeFrequency: 'yearly', priority: 0.6 },
    { url: 'https://flux3d.in/terms-and-conditions', changeFrequency: 'yearly', priority: 0.6 },
    { url: 'https://flux3d.in/refund-policy', changeFrequency: 'yearly', priority: 0.6 },
    { url: 'https://flux3d.in/service-delivery-policy', changeFrequency: 'yearly', priority: 0.6 },
    { url: 'https://flux3d.in/security', changeFrequency: 'yearly', priority: 0.5 },
    { url: 'https://flux3d.in/blog', changeFrequency: 'weekly', priority: 0.7 },
  ]

  const blogRoutes: MetadataRoute.Sitemap = ((blogPosts ?? []) as BlogSitemapRow[])
    .filter((post) => post.slug)
    .map((post) => ({
      url: `https://flux3d.in/blog/${post.slug}`,
      lastModified: new Date(post.last_modified_at || post.updated_at || post.published_at || post.created_at || Date.now()),
      changeFrequency: 'monthly',
      priority: 0.6,
    }))

  const shopRoutes = await getShopRoutes()

  return [...staticRoutes, ...blogRoutes, ...shopRoutes]
}
