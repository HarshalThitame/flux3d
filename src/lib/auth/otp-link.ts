import { siteUrl } from '@/lib/site'

/**
 * Builds an in-app OTP confirmation link resolved by `/auth/confirm`.
 *
 * The GoTrue-hosted `action_link` from `generateLink` redirects with
 * implicit-flow tokens in the URL fragment (`#access_token=...`) when the
 * OTP was created without a PKCE challenge, which our server-side callback
 * cannot read. Pointing the email at our own `/auth/confirm` route and
 * verifying the one-time token with `verifyOtp` instead works for both
 * implicit and PKCE flows, and works across devices (no code-verifier
 * cookie required).
 */
export function buildOtpConfirmUrl({
  tokenHash,
  type,
  nextPath,
}: {
  tokenHash: string
  type: 'recovery' | 'signup'
  nextPath: string
}) {
  const next =
    type === 'recovery'
      ? `/auth/update-password?next=${encodeURIComponent(nextPath)}`
      : nextPath

  return `${siteUrl}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${type}&next=${encodeURIComponent(next)}`
}
