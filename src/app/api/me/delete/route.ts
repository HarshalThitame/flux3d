import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { rateLimitResponse } from '@/lib/rate-limit'
import { getResendClient, getSenderAddress } from '@/lib/email/resend-client'
import { reportError } from '@/lib/error-handling'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CONFIRM_TOKEN_TTL_MINUTES = 60
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://flux3d.in'

/**
 * POST /api/me/delete
 *
 * Initiates account deletion (DPDP Act 2023 right to erasure). Sends a
 * confirmation email with a one-time token; the account is only deleted
 * after the user clicks the confirmation link. This prevents accidental
 * or malicious account deletion.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = authData.user.id
    const email = authData.user.email

    if (!email) {
      return NextResponse.json({ error: 'No email on account.' }, { status: 400 })
    }

    const limit = await rateLimitResponse(request, {
      prefix: 'me_delete',
      windowSeconds: 3600,
      maxRequests: 3,
      userId,
    })
    if (!limit.success) {
      return NextResponse.json({ error: 'Too many deletion requests. Try again later.' }, { status: 429 })
    }

    const admin = createAdminSupabaseClient()

    // Cancel any prior pending request for this user
    await admin
      .from('account_deletion_requests')
      .update({ status: 'expired' })
      .eq('user_id', userId)
      .eq('status', 'pending')

    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const { error: insertError } = await admin.from('account_deletion_requests').insert({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + CONFIRM_TOKEN_TTL_MINUTES * 60 * 1000).toISOString(),
      status: 'pending',
    })

    if (insertError) {
      reportError(insertError, 'Failed to create account deletion request', { module: 'account', tags: { flow: 'me_delete' } })
      return NextResponse.json({ error: 'Failed to start deletion. Please try again.' }, { status: 500 })
    }

    const confirmUrl = `${siteUrl.replace(/\/+$/, '')}/account/delete-confirm?token=${token}`

    try {
      const resend = await getResendClient()
      const sender = await getSenderAddress()
      const from = `${sender.name} <${sender.email}>`
      await resend.emails.send({
        from,
        to: email,
        subject: 'Confirm account deletion — Flux3D',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a1a;">
            <h2 style="color:#0F1B3D;">Confirm account deletion</h2>
            <p>You requested to delete your Flux3D account. This will permanently remove your
               personal data and anonymize your order history (kept only for legal/tax compliance).</p>
            <p style="margin:24px 0;">
              <a href="${confirmUrl}" style="display:inline-block;padding:12px 24px;background:#6d28d9;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
                Confirm deletion
              </a>
            </p>
            <p>This link expires in ${CONFIRM_TOKEN_TTL_MINUTES} minutes. If you didn't request this,
               you can safely ignore this email.</p>
            <p style="color:#888;font-size:12px;">If the button doesn't work, copy this link:<br/>${confirmUrl}</p>
          </div>
        `,
      })
    } catch (emailError) {
      reportError(emailError, 'Failed to send account deletion confirmation email', { module: 'account', tags: { flow: 'me_delete' } })
      return NextResponse.json({ error: 'Could not send confirmation email. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Confirmation email sent. Check your inbox to complete deletion.',
    })
  } catch (error) {
    reportError(error, 'Account deletion request failed', { module: 'account', tags: { flow: 'me_delete' } })
    return NextResponse.json({ error: 'Deletion request failed. Please try again.' }, { status: 500 })
  }
}