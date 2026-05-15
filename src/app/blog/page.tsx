import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getSettings } from '@/lib/settings'

export const revalidate = 3600

import { absoluteUrl, siteConfig } from '@/lib/site'
import Navbar from '@/components/Navbar'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import BlogClient from './BlogClient'
import type { BlogPost } from '@/lib/blog/types'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title: `${settings.businessName} — Blog`,
    description: settings.businessDescription || 'Discover tips, tutorials, and insights about 3D printing, design, and technology.',
    keywords: [
      '3D printing blog India',
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
      title: `${settings.businessName} — Blog`,
      description: settings.businessDescription || 'Discover tips, tutorials, and insights about 3D printing, design, and technology.',
      url: absoluteUrl('/blog'),
      siteName: settings.businessName,
      images: [{ url: absoluteUrl(siteConfig.ogImage), alt: `${settings.businessName} Blog` }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${settings.businessName} — Blog`,
      description: settings.businessDescription || 'Discover tips, tutorials, and insights about 3D printing, design, and technology.',
      images: [absoluteUrl(siteConfig.ogImage)],
    },
  }
}

export default async function BlogPage() {
  let posts: BlogPost[] = []

  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .returns<BlogPost[]>()

    if (!error && data) {
      posts = data
    }
  } catch {
    // Silently fail - will show empty state
  }

  return (
    <div>
      <Navbar transparent />
      <Suspense fallback={<div className="min-h-96 bg-[#FFFFFF] animate-pulse rounded-2xl mx-6 mt-32" />}>
        <BlogClient posts={posts} />
      </Suspense>
    </div>
  )
}
