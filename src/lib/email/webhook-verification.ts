import crypto from 'crypto'

/**
 * Verify Resend webhook signature.
 *
 * Resend uses the Svix webhook standard:
 *   - `svix-id` header: unique message ID
 *   - `svix-timestamp` header: Unix timestamp (seconds since epoch)
 *   - `svix-signature` header: `v1,<base64_hmac> v1,<base64_hmac>` (space-separated for key rotation)
 *
 * The signed payload is: `<svix-id>.<svix-timestamp>.<rawBody>`
 * HMAC-SHA256 is computed using the base64-decoded webhook secret (stripping `whsec_` prefix).
 *
 * @param rawBody          — the raw request body as a string or Buffer
 * @param signatureHeader  — value of the `svix-signature` header
 * @param timestampHeader  — value of the `svix-timestamp` header (Unix timestamp)
 * @param svixIdHeader     — value of the `svix-id` header
 * @param secret           — the Resend webhook secret (with or without `whsec_` prefix)
 * @returns boolean        — true if any signature matches
 */
export function verifyResendWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null,
  timestampHeader: string | null,
  svixIdHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false

  // Strip `whsec_` prefix and base64-decode the secret
  let signingSecret = secret
  if (secret.startsWith('whsec_')) {
    signingSecret = secret.slice(6)
  }
  const secretBuffer = Buffer.from(signingSecret, 'base64')

  const timestamp = String(timestampHeader ?? '')
  const msgId = String(svixIdHeader ?? '')
  const payloadToSign = `${msgId}.${timestamp}.${rawBody}`

  const signatures = signatureHeader.split(' ')
  for (const sig of signatures) {
    const parts = sig.split(',')
    if (parts.length < 2) continue

    const version = parts[0]
    if (version !== 'v1') continue

    const signature = parts[1]
    const expected = crypto
      .createHmac('sha256', secretBuffer)
      .update(payloadToSign)
      .digest('base64')

    if (timingSafeCompare(signature, expected)) {
      return true
    }
  }

  return false
}

/**
 * Constant-time comparison to prevent timing attacks.
 */
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to avoid leaking length info, but with a dummy value
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b.padEnd(a.length, '0')))
    return false
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}
