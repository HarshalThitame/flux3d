/**
 * Client-side nonce helper.
 *
 * During SSR, Next.js injects the per-request CSP nonce onto its framework
 * `<script>` tags. Client components that create third-party `<script>`
 * elements at runtime (e.g. Razorpay checkout, deferred analytics) can read
 * the nonce from the DOM and re-apply it to the scripts they create, so they
 * stay compliant with the strict `script-src 'nonce-…' 'strict-dynamic'`
 * policy without needing to thread the nonce through every prop.
 */
export function getClientCspNonce(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const script = document.querySelector<HTMLScriptElement>('script[nonce]')
  return script?.getAttribute('nonce') ?? undefined
}