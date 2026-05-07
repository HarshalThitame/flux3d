import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { absoluteUrl, siteConfig } from '@/lib/site'
import Navbar from '@/components/Navbar'
import { Calendar, User, Tag, ArrowLeft } from 'lucide-react'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  featured_image: string
  author_name: string
  category: string
  tags: string[]
  meta_keywords: string[]
  read_time: number
  views: number
  created_at: string
  updated_at?: string
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const { slug } = await params
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase
      .from('blog_posts')
      .select('title, excerpt, featured_image, tags, created_at, updated_at, category, meta_keywords')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (!data) return {}

    const postUrl = absoluteUrl(`/blog/${slug}`)
    const imageUrl = data.featured_image ? absoluteUrl(data.featured_image) : absoluteUrl(siteConfig.ogImage)
    const keywords = [
      ...(data.meta_keywords || []),
      '3D printing',
      'Flux3D',
      data.category,
    ].filter(Boolean)

    return {
      title: data.title,
      description: data.excerpt || `${data.title} - Read more on Flux 3D Blog`,
      keywords,
      alternates: { canonical: `/blog/${slug}` },
      openGraph: {
        type: 'article',
        title: data.title,
        description: data.excerpt,
        url: postUrl,
        siteName: siteConfig.name,
        images: [{ url: imageUrl, alt: data.title }],
        publishedTime: data.created_at,
        modifiedTime: data.updated_at,
        authors: [siteConfig.company.name],
        tags: data.tags || [],
        section: data.category,
      },
      twitter: {
        card: 'summary_large_image',
        title: data.title,
        description: data.excerpt,
        images: [imageUrl],
      },
    }
  } catch {
    return {}
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  let post: BlogPost | null = null
  const { slug } = await params

  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (error || !data) {
      notFound()
    }
    post = data
  } catch {
    notFound()
  }

  if (!post) notFound()

  const renderContent = (content: string) => {
    if (!content) return ''
    const trimmed = content
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|blockquote|section|article)>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim()

    if (!trimmed) return ''

    return trimmed
      .split('\n\n')
      .map(para => para.trim())
      .filter(Boolean)
      .map(para => `<p class="mb-4">${para.replace(/\n/g, '<br/>')}</p>`)
      .join('')
  }

  function toJsonLd(value: unknown) {
    return JSON.stringify(value).replace(/</g, '\\u003c')
  }

  const blogPostJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.featured_image ? absoluteUrl(post.featured_image) : undefined,
    url: absoluteUrl(`/blog/${slug}`),
    datePublished: post.created_at,
    dateModified: post.updated_at || post.created_at,
    author: {
      '@type': 'Organization',
      name: post.author_name || siteConfig.company.name,
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.company.name,
      logo: absoluteUrl('/logo.png'),
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': absoluteUrl(`/blog/${slug}`),
    },
    keywords: post.tags?.join(', '),
    articleSection: post.category,
  }

  return (
    <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(blogPostJsonLd) }}
      />
      <Navbar transparent />
      <main className="px-6 pb-20 pt-32 md:px-12">
        <div className="mx-auto max-w-[800px]">
          <Link
            href="/blog"
            className="mb-8 inline-flex items-center gap-2 text-sm text-[#7a82a0] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>

          {post.featured_image && (
            <div className="mb-8 overflow-hidden rounded-2xl">
              <img
                src={post.featured_image}
                alt={post.title}
                className="h-auto w-full object-cover"
              />
            </div>
          )}

          <div className="mb-6 flex items-center gap-4 text-sm text-[#7a82a0]">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(post.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {post.author_name}
            </span>
            {post.category && (
              <span className="flex items-center gap-1">
                <Tag className="h-4 w-4" />
                {post.category}
              </span>
            )}
          </div>

          <h1 className="font-[var(--font-syne)] text-4xl font-extrabold text-white mb-6">
            {post.title}
          </h1>

          <div className="text-[#b1b9d5] leading-8">
            <div dangerouslySetInnerHTML={{ __html: renderContent(post.content) }} />
          </div>

          {post.tags && post.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[#FF5C1A]/10 px-3 py-1 text-xs text-[#FF5C1A]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
