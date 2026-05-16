import { NextResponse } from 'next/server'
import { createAdminSupabaseClient, isCurrentUserAdmin } from '@/lib/admin/server'
import {
  BLOG_SCHEMA_TYPES,
  analyzeBlogSeo,
  makeExcerptFromContent,
  publicBlogUrl,
  slugifyTitle,
  splitCsv,
  uniqueStrings,
  type BlogSchemaData,
  type BlogSchemaType,
} from '@/lib/blog/seo'

export const dynamic = 'force-dynamic'

const allowedStatuses = new Set(['draft', 'published', 'archived', 'all'])
const allowedLanguages = new Set(['en', 'hi', 'mr'])
const allowedTwitterCards = new Set(['summary', 'summary_large_image'])

async function isAdminUser(): Promise<boolean> {
  try {
    return await isCurrentUserAdmin()
  } catch {
    return false
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function normalizeSchemaType(value: unknown): BlogSchemaType {
  return BLOG_SCHEMA_TYPES.includes(value as BlogSchemaType) ? (value as BlogSchemaType) : 'Article'
}

function normalizeSchemaData(value: unknown): BlogSchemaData {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as BlogSchemaData
  }

  return {}
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function normalizePostPayload(body: Record<string, unknown>) {
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const content = typeof body.content === 'string' ? body.content : ''
  const requestedSlug = typeof body.slug === 'string' ? body.slug.trim() : ''
  const slug = requestedSlug || slugifyTitle(title)

  if (!title || !content) {
    return { error: 'Title and content are required' as const }
  }

  if (!slug || slug !== slugifyTitle(slug) || /\s|[A-Z]/.test(slug)) {
    return { error: 'Slug must use lowercase letters, numbers, and hyphens only.' as const }
  }

  const excerpt = typeof body.excerpt === 'string' && body.excerpt.trim()
    ? body.excerpt.trim()
    : makeExcerptFromContent(content)
  const featuredImage = typeof body.featured_image === 'string' ? body.featured_image.trim() : ''
  const featuredImageAlt = typeof body.featured_image_alt === 'string' ? body.featured_image_alt.trim() : ''
  const secondaryKeywords = isStringArray(body.secondary_keywords)
    ? body.secondary_keywords
    : splitCsv(body.secondary_keywords as string | undefined)
  const tags = isStringArray(body.tags) ? body.tags : splitCsv(body.tags as string | undefined)
  const explicitMetaKeywords = isStringArray(body.meta_keywords)
    ? body.meta_keywords
    : splitCsv(body.meta_keywords as string | undefined)
  const focusKeyword = typeof body.focus_keyword === 'string' ? body.focus_keyword.trim() : ''
  const seoTitle = typeof body.seo_title === 'string' && body.seo_title.trim() ? body.seo_title.trim() : title
  const metaDescription = typeof body.meta_description === 'string' && body.meta_description.trim()
    ? body.meta_description.trim()
    : excerpt
  const canonicalUrl = typeof body.canonical_url === 'string' && body.canonical_url.trim()
    ? body.canonical_url.trim()
    : publicBlogUrl(slug)
  const ogTitle = typeof body.og_title === 'string' && body.og_title.trim() ? body.og_title.trim() : seoTitle
  const ogDescription = typeof body.og_description === 'string' && body.og_description.trim()
    ? body.og_description.trim()
    : metaDescription
  const ogImageUrl = typeof body.og_image_url === 'string' && body.og_image_url.trim()
    ? body.og_image_url.trim()
    : featuredImage
  const schemaType = normalizeSchemaType(body.schema_type)
  const language = typeof body.language === 'string' && allowedLanguages.has(body.language) ? body.language : 'en'
  const twitterCardType =
    typeof body.twitter_card_type === 'string' && allowedTwitterCards.has(body.twitter_card_type)
      ? body.twitter_card_type
      : 'summary_large_image'
  const status =
    typeof body.status === 'string' && allowedStatuses.has(body.status) && body.status !== 'all'
      ? body.status
      : 'draft'

  const analysis = analyzeBlogSeo({
    title,
    seoTitle,
    metaDescription,
    slug,
    focusKeyword,
    content,
    featuredImage,
    featuredImageAlt,
    ogImageUrl,
    schemaType,
    canonicalUrl,
  })

  return {
    postData: {
      title,
      slug,
      excerpt,
      content,
      featured_image: featuredImage || null,
      featured_image_alt: featuredImageAlt || null,
      category: typeof body.category === 'string' ? body.category.trim() : '',
      tags: uniqueStrings(tags),
      meta_keywords: uniqueStrings(explicitMetaKeywords),
      status,
      seo_title: seoTitle,
      meta_description: metaDescription,
      focus_keyword: focusKeyword || null,
      secondary_keywords: uniqueStrings(secondaryKeywords),
      canonical_url: canonicalUrl,
      og_title: ogTitle,
      og_description: ogDescription,
      og_image_url: ogImageUrl || null,
      twitter_card_type: twitterCardType,
      schema_type: schemaType,
      schema_data: normalizeSchemaData(body.schema_data),
      author_id: typeof body.author_id === 'string' && isUuid(body.author_id) ? body.author_id : null,
      author_name: typeof body.author_name === 'string' && body.author_name.trim() ? body.author_name.trim() : 'Flux3D Team',
      reading_time_minutes: analysis.readingTimeMinutes,
      read_time: analysis.readingTimeMinutes,
      word_count: analysis.wordCount,
      toc_enabled: typeof body.toc_enabled === 'boolean' ? body.toc_enabled : true,
      language,
      seo_score: typeof body.seo_score === 'number' ? body.seo_score : analysis.score,
      last_modified_at: new Date().toISOString(),
    },
    publishedAt: typeof body.published_at === 'string' && body.published_at ? body.published_at : null,
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'published'

    if (!allowedStatuses.has(status)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
    }

    const requiresAdmin = status !== 'published'
    if (requiresAdmin && !(await isAdminUser())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createAdminSupabaseClient()
    const category = searchParams.get('category')
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10) || 10, 1), 100)
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1)
    const offset = (page - 1) * limit

    let query = supabase
      .from('blog_posts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status !== 'all') {
      query = query.eq('status', status)
    }
    if (category) {
      query = query.eq('category', category)
    }

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ posts: data, total: count, page, limit })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch blog posts' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const supabase = createAdminSupabaseClient()
    const body = await request.json() as Record<string, unknown>
    const normalized = normalizePostPayload(body)

    if ('error' in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 })
    }

    const { postData, publishedAt } = normalized
    const { data: duplicate } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', postData.slug)
      .maybeSingle()

    if (duplicate) {
      return NextResponse.json({ error: 'A post with this slug already exists.' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .insert([
        {
          ...postData,
          published_at: postData.status === 'published' ? publishedAt || new Date().toISOString() : publishedAt,
        },
      ])
      .select()
      .single()

    if (error) {
      const status = error.code === '23505' ? 409 : 500
      return NextResponse.json({ error: error.code === '23505' ? 'A post with this slug already exists.' : error.message }, { status })
    }

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create blog post' }, { status: 500 })
  }
}
