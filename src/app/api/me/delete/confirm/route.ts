import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { reportError } from '@/lib/error-handling'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/me/delete/confirm
 *
 * Confirms account deletion using the one-time token emailed to the user.
 * Verifies the token hash + expiry, then invokes the delete_user_data RPC.
 * The user is signed out and returned a success flag.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { token?: unknown }
    const token = typeof body.token === 'string' && body.token.trim() ? body.token.trim() : null
    if (!token) {
      return NextResponse.json({ error: 'Missing confirmation token.' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: authData } = await supabase.auth.getUser()

    const admin = createAdminSupabaseClient()
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const { data: requestRow, error: fetchError } = await admin
      .from('account_deletion_requests')
      .select('id, user_id, token_hash, expires_at, status')
      .eq('token_hash', tokenHash)
      .maybeSingle()

    if (fetchError) {
      reportError(fetchError, 'Failed to look up deletion request', { module: 'account', tags: { flow: 'me_delete_confirm' } })
      return NextResponse.json({ error: 'Deletion confirmation failed.' }, { status: 500 })
    }

    if (!requestRow || requestRow.status !== 'pending') {
      return NextResponse.json({ error: 'This confirmation link is invalid or has already been used.' }, { status: 400 })
    }

    if (new Date(requestRow.expires_at).getTime() < Date.now()) {
      await admin.from('account_deletion_requests').update({ status: 'expired' }).eq('id', requestRow.id)
      return NextResponse.json({ error: 'This confirmation link has expired. Request a new deletion.' }, { status: 400 })
    }

    const { error: deleteError } = await admin.rpc('delete_user_data', { p_user_id: requestRow.user_id })

    if (deleteError) {
      reportError(deleteError, 'delete_user_data RPC failed', { module: 'account', tags: { flow: 'me_delete_confirm', userId: requestRow.user_id } })
      return NextResponse.json({ error: 'Account deletion failed. Please contact support.' }, { status: 500 })
    }

    await admin.from('account_deletion_requests').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', requestRow.id)

    // Sign the user out if they were still signed in
    if (authData.user) {
      await supabase.auth.signOut().catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    reportError(error, 'Account deletion confirmation failed', { module: 'account', tags: { flow: 'me_delete_confirm' } })
    return NextResponse.json({ error: 'Account deletion failed. Please try again.' }, { status: 500 })
  }
}