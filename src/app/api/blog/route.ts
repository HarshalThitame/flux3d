import { NextResponse } from 'next/server'
import { createAdminSupabaseClient, isCurrentUserAdmin } from '@/lib/admin/server'

export const dynamic = 'force-dynamic'

const allowedStatuses = new Set(['draft', 'published', 'archived', 'all'])

async function isAdminUser(): Promise<boolean> {
  try {
    return await isCurrentUserAdmin()
  } catch {
    return false
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
    const body = await request.json()

    const { title, excerpt, content, featured_image, category, tags, meta_keywords, status } = body

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const postData = {
      title,
      slug,
      excerpt: excerpt || content.substring(0, 150) + '...',
      content,
      featured_image,
      category,
      tags: tags || [],
      meta_keywords: meta_keywords || [],
      status: status || 'draft',
      published_at: status === 'published' ? new Date().toISOString() : null,
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .insert([postData])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create blog post' }, { status: 500 })
  }
}
