import { NextResponse } from 'next/server'
import { createAdminSupabaseClient, isCurrentUserAdmin } from '@/lib/admin/server'
import type { BlogAuthor } from '@/lib/blog/types'

export const dynamic = 'force-dynamic'

const fallbackAuthor: BlogAuthor = {
  id: '',
  name: 'Flux3D Team',
  bio: 'Flux3D experts writing about 3D printing, rapid prototyping, materials, and manufacturing workflows.',
  photo_url: '/logo.webp',
  profile_url: 'https://flux3d.in/about',
}

export async function GET() {
  try {
    if (!(await isCurrentUserAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('authors')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ authors: [fallbackAuthor] })
    }

    return NextResponse.json({ authors: data?.length ? data : [fallbackAuthor] })
  } catch {
    return NextResponse.json({ authors: [fallbackAuthor] })
  }
}
