import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ productId: string }> }) {
  const authSupabase = await createServerSupabaseClient()
  const { data: authData, error: authError } = await authSupabase.auth.getUser()

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { productId } = await context.params
    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('shelf_wishlists')
      .select('id')
      .eq('user_id', authData.user.id)
      .eq('product_id', productId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return NextResponse.json({ wishlisted: Boolean(data) })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check wishlist.' },
      { status: 500 }
    )
  }
}
