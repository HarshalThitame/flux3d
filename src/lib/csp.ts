/**
 * Deterministic CSP nonce shared between the middleware (which builds the
 * Content-Security-Policy header) and server components that render inline
 * scripts (JSON-LD structured data).
 *
 * Using a stable nonce instead of reading a per-request `x-nonce` header lets
 * the root layout stay free of dynamic APIs (`headers()`), so pages can be
 * statically rendered / ISR-cached on Vercel again.
 *
 * Set `CSP_NONCE` in your deployment environment to rotate the nonce per
 * deployment. The fallback keeps local development working out of the box.
 */
export const CSP_NONCE = process.env.CSP_NONCE || 'flux3d-csp-nonce-v1'
