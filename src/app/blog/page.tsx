import type { Metadata } from 'next'
import { absoluteUrl, siteConfig } from '@/lib/site'
import Navbar from '@/components/Navbar'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import BlogClient from './BlogClient'

export const metadata: Metadata = {
  title: 'Blog | FLUX 3D',
  description: 'Discover tips, tutorials, and insights about 3D printing, design, and technology.',
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
    title: 'Blog | FLUX 3D',
    description: 'Discover tips, tutorials, and insights about 3D printing, design, and technology.',
    url: absoluteUrl('/blog'),
    siteName: siteConfig.name,
    images: [{ url: absoluteUrl(siteConfig.ogImage), alt: 'Flux 3D Blog' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog | FLUX 3D',
    description: 'Discover tips, tutorials, and insights about 3D printing, design, and technology.',
    images: [absoluteUrl(siteConfig.ogImage)],
  },
}

export default async function BlogPage() {
  let posts: any[] = []

  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (!error && data) {
      posts = data
    }
  } catch {
    // Silently fail - will show empty state
  }

  return (
    <div>
      <Navbar transparent />
      <BlogClient posts={posts} />
    </div>
  )
}
