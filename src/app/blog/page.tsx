import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'

export const revalidate = 3600

import { absoluteUrl, siteConfig } from '@/lib/site'
import Navbar from '@/components/Navbar'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import BlogClientBoundary from './BlogClientBoundary'
import type { BlogPost } from '@/lib/blog/types'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  const title = '3D Printing Blog | Flux3D'
  const description = 'Read Flux3D guides on 3D printing, rapid prototyping, materials, design tips, and manufacturing workflows for India.'

  return {
    title,
    description,
    keywords: [
      '3D printing blog India',
      'custom 3D printing India',
      'rapid prototyping tips',
      '3D printing tutorials',
      'Flux3D blog',
      'additive manufacturing insights',
      '3D design tips',
      'resin printing guide',
      'FDM printing tips',
    ],
    alternates: {
      canonical: '/blog',
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl('/blog'),
      siteName: settings.businessName,
      images: [{ url: absoluteUrl(siteConfig.ogImage), alt: `${settings.businessName} Blog` }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [absoluteUrl(siteConfig.ogImage)],
    },
  }
}

type BlogPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  let posts: BlogPost[] = []
  let total = 0
  const params = await searchParams
  const pageParam = Array.isArray(params.page) ? params.page[0] : params.page
  const page = Math.max(parseInt(pageParam || '1', 10) || 1, 1)
  const limit = 9
  const offset = (page - 1) * limit

  try {
    const supabase = createAdminSupabaseClient()
    const { data, error, count } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
      .returns<BlogPost[]>()

    if (!error && data) {
      posts = data
      total = count || data.length
    }
  } catch {
    // Silently fail - will show empty state
  }

  return (
    <div className="blog-premium-shell min-h-screen overflow-hidden">
      <Navbar transparent />
      <BlogClientBoundary posts={posts} page={page} totalPages={Math.max(1, Math.ceil(total / limit))} />
    </div>
  )
}
