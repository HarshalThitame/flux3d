import { NextResponse } from 'next/server'
import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/supabase/config'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Missing material id' },
        { status: 400 }
      )
    }

    const supabase = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey())

    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete material' },
      { status: 500 }
    )
  }
}
