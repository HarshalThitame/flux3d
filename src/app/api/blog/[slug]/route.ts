import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/supabase/config'

export const dynamic = 'force-dynamic'

async function isAdminUser(): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    return isAdminEmail(user?.email)
  } catch {
    return false
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = createAdminSupabaseClient()
    const { slug } = await params

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 })
    }

    // Increment views
    await supabase
      .from('blog_posts')
      .update({ views: (data.views || 0) + 1 })
      .eq('slug', slug)

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch blog post' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const supabase = createAdminSupabaseClient()
    const { slug } = await params
    const body = await request.json()

    const updateData = {
      ...body,
      updated_at: new Date().toISOString(),
      published_at: body.status === 'published' ? new Date().toISOString() : null,
    }

    if (body.meta_keywords) {
      updateData.meta_keywords = body.meta_keywords
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('slug', slug)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to update blog post' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const supabase = createAdminSupabaseClient()
    const { slug } = await params

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('slug', slug)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete blog post' }, { status: 500 })
  }
}
