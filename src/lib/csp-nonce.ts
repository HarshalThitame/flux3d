/**
 * Generates a fresh, unpredictable CSP nonce for a single request.
 *
 * Nonces MUST be unique per request and unguessable. A static/stable nonce
 * would let an attacker reuse it across requests, defeating the purpose of
 * nonce-based CSP. The proxy (proxy.ts) calls this on every request and
 * propagates the value through the `x-nonce` request header so both the
 * Content-Security-Policy header and the rendered scripts stay in sync.
 *
 * This module intentionally avoids `next/headers` so it can be imported
 * safely from the proxy bundle.
 */
export function generateCspNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64')
}