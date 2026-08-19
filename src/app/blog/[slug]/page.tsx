import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Calendar, Tag } from 'lucide-react'
import { createAdminSupabaseClient, isCurrentUserAdmin } from '@/lib/admin/server'
import { absoluteUrl, siteConfig } from '@/lib/site'
import Navbar from '@/components/Navbar'
import ReadingProgress from '@/components/blog/ReadingProgress'
import type { BlogAuthor, BlogPost } from '@/lib/blog/types'
import {
  addHeadingIds,
  extractHeadings,
  publicBlogUrl,
  sanitizeBlogHtml,
  uniqueStrings,
  type BlogSchemaData,
} from '@/lib/blog/seo'
import { CSP_NONCE } from '@/lib/csp'

type BlogPostWithAuthor = BlogPost & {
  author?: BlogAuthor | null
}

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const languageMap: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
}

function toJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

async function canPreview() {
  try {
    return await isCurrentUserAdmin()
  } catch {
    return false
  }
}

async function getAuthor(authorId?: string | null): Promise<BlogAuthor | null> {
  if (!authorId) return null

  try {
    const supabase = createAdminSupabaseClient()
    const { data } = await supabase
      .from('authors')
      .select('*')
      .eq('id', authorId)
      .maybeSingle()

    return data || null
  } catch {
    return null
  }
}

async function getPost(slug: string, preview: boolean): Promise<BlogPostWithAuthor | null> {
  const supabase = createAdminSupabaseClient()
  let query = supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)

  if (!preview) {
    query = query.eq('status', 'published')
  }

  const { data, error } = await query.single()
  if (error || !data) return null

  const author = await getAuthor(data.author_id)
  return { ...data, author }
}

function getKeywords(post: BlogPostWithAuthor) {
  return uniqueStrings([
    ...(post.meta_keywords || []),
    ...(post.secondary_keywords || []),
    ...(post.tags || []),
    post.focus_keyword,
    post.category,
    '3D printing',
    'Flux3D',
  ])
}

function getCanonicalUrl(post: BlogPostWithAuthor) {
  return post.canonical_url || publicBlogUrl(post.slug)
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  try {
    const { slug } = await params
    const query = searchParams ? await searchParams : {}
    const previewRequested = (Array.isArray(query.preview) ? query.preview[0] : query.preview) === '1'
    const preview = previewRequested && await canPreview()
    const post = await getPost(slug, preview)

    if (!post) return {}

    const canonical = getCanonicalUrl(post)
    const imageUrl = absoluteUrl(post.og_image_url || post.featured_image || siteConfig.ogImage)
    const seoTitle = post.seo_title || post.title
    const metaDescription = post.meta_description || post.excerpt || `${post.title} - Flux3D Blog`
    const language = languageMap[post.language || 'en'] || 'en-IN'
    const keywords = getKeywords(post)

    return {
      title: seoTitle,
      description: metaDescription,
      keywords,
      alternates: {
        canonical,
        languages: {
          [language]: canonical,
        },
      },
      openGraph: {
        type: 'article',
        title: post.og_title || seoTitle,
        description: post.og_description || metaDescription,
        url: canonical,
        siteName: siteConfig.name,
        images: [{ url: imageUrl, width: 1200, height: 630, alt: post.og_title || seoTitle }],
        publishedTime: post.published_at || post.created_at,
        modifiedTime: post.last_modified_at || post.updated_at || post.created_at,
        authors: [post.author?.name || post.author_name || siteConfig.company.name],
        tags: keywords,
        section: post.category,
      },
      twitter: {
        card: post.twitter_card_type || 'summary_large_image',
        title: post.og_title || seoTitle,
        description: post.og_description || metaDescription,
        images: [imageUrl],
      },
    }
  } catch {
    return {}
  }
}

function makePostSchema(post: BlogPostWithAuthor) {
  const canonical = getCanonicalUrl(post)
  const schemaData = (post.schema_data || {}) as BlogSchemaData
  const schemaType = post.schema_type || 'Article'
  const image = absoluteUrl(post.og_image_url || post.featured_image || siteConfig.ogImage)
  const authorName = post.author?.name || post.author_name || 'Flux3D Team'
  const authorUrl = post.author?.profile_url || post.author?.linkedin_url || absoluteUrl('/about')
  const keywords = getKeywords(post).join(', ')
  const base = {
    '@context': 'https://schema.org',
    '@type': schemaType === 'FAQ' ? 'FAQPage' : schemaType,
    headline: post.seo_title || post.title,
    description: post.meta_description || post.excerpt,
    image,
    author: {
      '@type': 'Person',
      name: authorName,
      url: authorUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Flux3D',
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/logo.webp'),
      },
    },
    datePublished: post.published_at || post.created_at,
    dateModified: post.last_modified_at || post.updated_at || post.created_at,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonical,
    },
    keywords,
  }

  if (schemaType === 'FAQ') {
    return {
      ...base,
      mainEntity: (schemaData.faqs || [])
        .filter((faq) => faq.question && faq.answer)
        .map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
    }
  }

  if (schemaType === 'HowTo') {
    return {
      ...base,
      step: (schemaData.steps || [])
        .filter((step) => step.name || step.text)
        .map((step, index) => ({
          '@type': 'HowToStep',
          position: index + 1,
          name: step.name,
          text: step.text,
        })),
    }
  }

  return base
}

function makeBreadcrumbSchema(post: BlogPostWithAuthor) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: absoluteUrl('/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: absoluteUrl('/blog'),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: getCanonicalUrl(post),
      },
    ],
  }
}

function makeAuthorSchema(post: BlogPostWithAuthor) {
  const author = post.author
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author?.name || post.author_name || 'Flux3D Team',
    description: author?.bio || undefined,
    image: author?.photo_url ? absoluteUrl(author.photo_url) : undefined,
    url: author?.profile_url || author?.linkedin_url || absoluteUrl('/about'),
    sameAs: uniqueStrings([author?.linkedin_url, author?.twitter_url]),
  }
}

export default async function BlogPostPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const query = searchParams ? await searchParams : {}
  const previewRequested = (Array.isArray(query.preview) ? query.preview[0] : query.preview) === '1'
  const preview = previewRequested && await canPreview()
  const post = await getPost(slug, preview)

  if (!post) notFound()

  if (!preview) {
    try {
      const supabase = createAdminSupabaseClient()
      await supabase
        .from('blog_posts')
        .update({ views: (post.views || 0) + 1 })
        .eq('id', post.id)
    } catch {
      // View tracking should not block page rendering.
    }
  }

  const safeContent = sanitizeBlogHtml(post.content || '')
  const headings = extractHeadings(safeContent)
  const contentWithIds = addHeadingIds(safeContent, headings)
  const showToc = post.toc_enabled !== false && headings.length > 1
  const postSchema = makePostSchema(post)
  const breadcrumbSchema = makeBreadcrumbSchema(post)
  const authorSchema = makeAuthorSchema(post)

  const publishedDate = new Date(post.published_at || post.created_at).toLocaleDateString('en-IN', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const authorName = post.author?.name || post.author_name || 'Flux3D Team'
  const authorImage = post.author?.photo_url || post.author_avatar
  const readMinutes = post.reading_time_minutes || post.read_time || 1

  return (
    <div className="public-shell bg-white">
      <script nonce={CSP_NONCE} type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(postSchema) }} />
      <script nonce={CSP_NONCE} type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(breadcrumbSchema) }} />
      <script nonce={CSP_NONCE} type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(authorSchema) }} />
      <ReadingProgress />
      <Navbar transparent />

      <section className="relative flex min-h-[70vh] items-end overflow-hidden bg-[var(--gradient-hero-bg)] px-6 pb-14 pt-8 md:px-12 md:pt-10">
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />
        {post.featured_image ? (
          <Image
            src={post.featured_image}
            alt={post.featured_image_alt || post.title}
            fill
            priority
            sizes="100vw"
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(109,40,217,0.12)_0%,transparent_70%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-white/25" />
        <div className="relative z-10 mx-auto w-full max-w-[1120px]">
          <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Link href="/" className="transition-colors hover:text-[var(--text-primary)]">Home</Link>
            <span aria-hidden="true">/</span>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 transition-colors hover:text-[var(--text-primary)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Blog
            </Link>
            <span aria-hidden="true">/</span>
            <span className="line-clamp-1 font-medium text-[var(--text-primary)]">{post.title}</span>
          </nav>

          {preview && (
            <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
              Preview mode
            </div>
          )}

          <div className="mb-6 flex flex-wrap items-center gap-3">
            {post.category && (
              <span className="category-tag inline-flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {post.category}
              </span>
            )}
            <span className="category-tag border-[rgba(6,182,212,0.35)] bg-[rgba(6,182,212,0.13)] text-[var(--accent-2)]">
              {readMinutes} min read
            </span>
          </div>

          <h1 className="max-w-[920px] font-[var(--font-syne)] text-[clamp(2.4rem,6vw,5rem)] font-extrabold leading-[1.02] text-[var(--text-primary)]">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="mt-6 max-w-[760px] text-lg leading-8 text-[var(--text-secondary)]">{post.excerpt}</p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-[var(--text-secondary)]">
            <div className="flex items-center gap-3">
              {authorImage ? (
                <Image
                  src={authorImage}
                  alt={authorName}
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-full border border-[var(--border)] object-cover"
                />
              ) : (
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--accent)]/15 text-sm font-bold text-[var(--accent-bright)]">
                  {authorName.charAt(0)}
                </span>
              )}
              <div>
                <p className="font-medium text-[var(--text-primary)]">{authorName}</p>
                <p className="font-[var(--font-mono)] text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  {publishedDate}
                </p>
              </div>
            </div>
            <span className="hidden items-center gap-1 font-[var(--font-mono)] text-xs uppercase tracking-[0.08em] text-[var(--text-muted)] sm:flex">
              <Calendar className="h-4 w-4" />
              Flux3D editorial
            </span>
          </div>
        </div>
      </section>

      <main className="px-6 pb-20 pt-14 md:px-12">
        <div className={showToc ? 'mx-auto grid max-w-[1120px] gap-10 lg:grid-cols-[minmax(0,720px)_260px] lg:justify-center' : 'mx-auto max-w-[720px]'}>
          <article>
            <div className="blog-content" dangerouslySetInnerHTML={{ __html: contentWithIds }} />

            {post.tags && post.tags.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-2 border-t border-[var(--border)] pt-6">
                {post.tags.map((tag) => (
                  <span key={tag} className="category-tag">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="card mt-10 p-5">
              <div className="flex items-start gap-4">
                {authorImage && (
                  <Image
                    src={authorImage}
                    alt={authorName}
                    width={56}
                    height={56}
                    loading="lazy"
                    className="h-14 w-14 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">{authorName}</p>
                  {post.author?.bio && <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{post.author.bio}</p>}
                </div>
              </div>
            </div>
          </article>

          {showToc && (
            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="card p-4">
                <p className="mb-3 font-[var(--font-mono)] text-xs uppercase tracking-[0.12em] text-[var(--accent-bright)]">Table of Contents</p>
                <nav className="space-y-2">
                  {headings.map((heading) => (
                    <a
                      key={heading.id}
                      href={`#${heading.id}`}
                      className={`block text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-bright)] ${heading.level === 3 ? 'pl-4' : ''}`}
                    >
                      {heading.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  )
}
