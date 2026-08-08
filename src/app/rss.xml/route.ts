import { createAdminSupabaseClient } from '@/lib/admin/server'
import { absoluteUrl, siteConfig } from '@/lib/site'

export const revalidate = 3600

const BLOG_URL = 'https://flux3d.in/blog'

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

type RssPost = {
  title: string
  slug: string
  excerpt?: string | null
  meta_description?: string | null
  published_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  last_modified_at?: string | null
  author_name?: string | null
  category?: string | null
  tags?: string[] | null
  featured_image?: string | null
}

export async function GET() {
  let posts: RssPost[] = []

  try {
    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('blog_posts')
      .select(
        'title, slug, excerpt, meta_description, published_at, created_at, updated_at, last_modified_at, author_name, category, tags, featured_image'
      )
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(50)
      .returns<RssPost[]>()

    if (!error && data) {
      posts = data
    } else {
      console.error('[rss] Failed to load blog posts:', error)
    }
  } catch (error) {
    console.error('[rss] Failed to load blog posts:', error)
  }

  const lastBuildDate = new Date(
    posts[0]?.last_modified_at || posts[0]?.updated_at || posts[0]?.published_at || posts[0]?.created_at || Date.now()
  ).toUTCString()

  const items = posts
    .filter((post) => post.slug && post.title)
    .map((post) => {
      const link = `${BLOG_URL}/${post.slug}`
      const published = new Date(post.published_at || post.created_at || Date.now()).toUTCString()
      const description = post.meta_description || post.excerpt || `${post.title} - Flux3D Blog`
      const author = post.author_name || 'Flux3D Team'
      const category = post.category ? `<category>${escapeXml(post.category)}</category>` : ''
      const tags = (post.tags ?? []).map((tag) => `<category>${escapeXml(tag)}</category>`).join('')
      const enclosure = post.featured_image
        ? `<enclosure url="${escapeXml(post.featured_image)}" type="image/jpeg" length="0" />`
        : ''

      return [
        '<item>',
        `<title>${escapeXml(post.title)}</title>`,
        `<link>${escapeXml(link)}</link>`,
        `<guid isPermaLink="false">flux3d-${escapeXml(post.slug)}</guid>`,
        `<description>${escapeXml(description)}</description>`,
        `<pubDate>${published}</pubDate>`,
        `<dc:creator>${escapeXml(author)}</dc:creator>`,
        category,
        tags,
        enclosure,
        '</item>',
      ]
        .filter(Boolean)
        .join('')
    })
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${escapeXml(siteConfig.name)} Blog</title>
  <link>${escapeXml(BLOG_URL)}</link>
  <description>3D printing guides, rapid prototyping tips, materials, and design advice from ${escapeXml(siteConfig.name)}.</description>
  <language>en-IN</language>
  <lastBuildDate>${lastBuildDate}</lastBuildDate>
  <generator>Flux3D (Next.js)</generator>
  <atom:link href="${escapeXml(absoluteUrl('/rss.xml'))}" rel="self" type="application/rss+xml" />
  ${items}
</channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, must-revalidate',
    },
  })
}