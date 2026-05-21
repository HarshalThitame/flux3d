import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getUserId() {
  const authSupabase = await createServerSupabaseClient()
  const { data, error } = await authSupabase.auth.getUser()
  if (error || !data.user) return null
  return data.user.id
}

export async function DELETE(_request: Request, context: { params: Promise<{ productId: string }> }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { productId } = await context.params
    const supabase = createAdminSupabaseClient()
    const { error } = await supabase
      .from('shelf_wishlists')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId)

    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true, wishlisted: false })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update wishlist.' },
      { status: 500 }
    )
  }
}
