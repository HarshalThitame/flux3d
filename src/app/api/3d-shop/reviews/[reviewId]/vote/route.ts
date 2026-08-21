import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type VoteBody = {
  isHelpful?: unknown
}

export async function POST(request: Request, context: { params: Promise<{ reviewId: string }> }) {
  const authSupabase = await createServerSupabaseClient()
  const { data: authData, error: authError } = await authSupabase.auth.getUser()

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { reviewId } = await context.params
    const body = (await request.json()) as VoteBody
    const isHelpful = Boolean(body.isHelpful)

    const supabase = createAdminSupabaseClient()

    // Verify review exists and is approved
    const { data: review, error: reviewError } = await supabase
      .from('shelf_reviews')
      .select('id')
      .eq('id', reviewId)
      .eq('is_approved', true)
      .single()

    if (reviewError || !review) {
      return NextResponse.json({ error: 'Review not found.' }, { status: 404 })
    }

    // Upsert vote
    const { error: upsertError } = await supabase
      .from('shelf_review_votes')
      .upsert(
        {
          review_id: reviewId,
          user_id: authData.user.id,
          is_helpful: isHelpful,
        },
        { onConflict: 'review_id,user_id' }
      )

    if (upsertError) throw new Error(upsertError.message)

    // Return updated counts
    const { data: votes } = await supabase
      .from('shelf_review_votes')
      .select('is_helpful')
      .eq('review_id', reviewId)

    const helpful = (votes ?? []).filter((v) => v.is_helpful).length
    const notHelpful = (votes ?? []).filter((v) => !v.is_helpful).length

    return NextResponse.json({
      helpful,
      notHelpful,
      userVote: isHelpful,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record vote.' },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ reviewId: string }> }) {
  const authSupabase = await createServerSupabaseClient()
  const { data: authData, error: authError } = await authSupabase.auth.getUser()

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { reviewId } = await context.params
    const supabase = createAdminSupabaseClient()

    const { error } = await supabase
      .from('shelf_review_votes')
      .delete()
      .eq('review_id', reviewId)
      .eq('user_id', authData.user.id)

    if (error) throw new Error(error.message)

    const { data: votes } = await supabase
      .from('shelf_review_votes')
      .select('is_helpful')
      .eq('review_id', reviewId)

    const helpful = (votes ?? []).filter((v) => v.is_helpful).length
    const notHelpful = (votes ?? []).filter((v) => !v.is_helpful).length

    return NextResponse.json({ helpful, notHelpful, userVote: null })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove vote.' },
      { status: 500 }
    )
  }
}
