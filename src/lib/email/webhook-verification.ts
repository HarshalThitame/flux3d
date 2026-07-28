import crypto from 'crypto'

/**
 * Verify Resend webhook signature.
 *
 * Resend signs webhook payloads with HMAC-SHA256 using the webhook secret.
 * The signature is sent in the `svix-signature` header (Resend uses Svix).
 *
 * Header format: `v1,<timestamp>,<signature>`
 * We construct the signed payload as: `<timestamp>.<rawBody>`
 *
 * @param rawBody      — the raw request body as a Buffer or string
 * @param signatureHeader — value of the `svix-signature` header
 * @param secret       — the Resend webhook secret (from business_settings or env)
 * @returns boolean    — true if signature is valid
 */
export function verifyResendWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false

  const signatures = signatureHeader.split(' ')
  for (const sig of signatures) {
    const parts = sig.split(',')
    if (parts.length < 2) continue

    const version = parts[0]
    if (version !== 'v1') continue

    const signature = parts[1] ?? parts[parts.length - 1]
    const timestamp = parts.length >= 3 ? parts[1] : ''
    const payloadToSign = timestamp ? `${timestamp}.${rawBody}` : `${rawBody}`

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
