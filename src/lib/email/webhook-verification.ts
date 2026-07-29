import crypto from 'crypto'

/**
 * Verify Resend webhook signature.
 *
 * Resend uses the Svix webhook standard:
 *   - `svix-timestamp` header: Unix timestamp (seconds since epoch)
 *   - `svix-signature` header: `v1,<base64_hmac> v1,<base64_hmac>` (space-separated for key rotation)
 *
 * The signed payload is: `<timestamp>.<rawBody>`
 * HMAC-SHA256 is computed using the webhook secret.
 *
 * @param rawBody          — the raw request body as a string or Buffer
 * @param signatureHeader  — value of the `svix-signature` header
 * @param timestampHeader  — value of the `svix-timestamp` header (Unix timestamp)
 * @param secret           — the Resend webhook secret
 * @returns boolean        — true if any signature matches
 */
export function verifyResendWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null,
  timestampHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false

  const timestamp = String(timestampHeader ?? '')
  const payloadToSign = timestamp ? `${timestamp}.${rawBody}` : `${rawBody}`

  const signatures = signatureHeader.split(' ')
  for (const sig of signatures) {
    const parts = sig.split(',')
    if (parts.length < 2) continue

    const version = parts[0]
    if (version !== 'v1') continue

    const signature = parts[1]
    const expected = crypto.createHmac('sha256', secret).update(payloadToSign).digest('base64')
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
