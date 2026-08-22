import { updateSession } from '@/lib/supabase/proxy'
import { NextRequest, NextResponse } from 'next/server'
import { generateCspNonce } from '@/lib/csp-nonce'
import { getMetaCapiGatewayOrigins } from '@/lib/csp-allowlist'

export function buildCsp(nonce: string) {
  const isDev = process.env.NODE_ENV === 'development'
  const capiGatewayOrigins = getMetaCapiGatewayOrigins()
  // NOTE: 'strict-dynamic' is intentionally NOT used. It disables host-based
  // allowlisting entirely and only propagates trust through nonces, which
  // breaks framework-rendered route chunks that ship without a nonce
  // attribute (<script async> emitted during SSR). Instead we use the hybrid
  // model: inline scripts are gated by the per-request nonce, external
  // scripts by an explicit host allowlist covering every runtime injector in
  // the codebase (RazorpayCheckoutClient, CartDeliveryClient,
  // DeliveryStepClient, DeferredGoogleAnalytics, MetaPixel).
  const directives = [
    "default-src 'self'",
    [
      'script-src',
      "'self'",
      `'nonce-${nonce}'`,
      'https://checkout.razorpay.com https://api.razorpay.com',
      // fbevents.js loaded by the Meta Pixel.
      'https://connect.facebook.net',
      // gtag.js loaded by DeferredGoogleAnalytics.
      'https://www.googletagmanager.com',
      ...(isDev ? ["'unsafe-eval'"] : []),
    ].join(' '),
    "style-src 'self' 'unsafe-inline'",
    [
      'img-src',
      "'self'",
      'blob:',
      'data:',
      'https://jqgaebdtuasenyojvbsi.supabase.co',
      'https://lh3.googleusercontent.com',
      'https://avatars.githubusercontent.com',
      // Facebook Pixel image beacon (noscript + fallback transport).
      'https://www.facebook.com',
    ].join(' '),
    "font-src 'self' data:",
    [
      'connect-src',
      "'self'",
      'https://jqgaebdtuasenyojvbsi.supabase.co',
      'wss://jqgaebdtuasenyojvbsi.supabase.co',
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com',
      'https://analytics.google.com',
      'https://region1.google-analytics.com',
      'https://vitals.vercel-insights.com',
      'https://connect.facebook.net',
      'https://graph.facebook.com',
      // Facebook Pixel fetch/sendBeacon transport for /tr event calls.
      'https://www.facebook.com',
      // Meta Conversions API Gateway relay hosts (browser pixel events).
      ...capiGatewayOrigins,
      'https://api.razorpay.com',
      'https://checkout.razorpay.com',
      'https://lumberjack.razorpay.com',
      'https://lumberjack-cx.razorpay.com',
      'https://custom-analytics.razorpay.com',
    ].join(' '),
    // fbevents.js submits large event payloads to /tr via a hidden form and
    // renders measurement iframes on www.facebook.com.
    `form-action 'self' https://www.facebook.com`,
    `frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://www.facebook.com`,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
    'upgrade-insecure-requests',
  ]
  return directives.join('; ')
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const nonce = generateCspNonce()
  const cspHeader = buildCsp(nonce)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', cspHeader)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  const isAdminPath =
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/api/admin' ||
    pathname.startsWith('/api/admin/') ||
    pathname === '/api/3d-shop/admin' ||
    pathname.startsWith('/api/3d-shop/admin/')
  if (isAdminPath) {
    const nonceRequest = new NextRequest(request, { headers: requestHeaders })
    const updateResponse = await updateSession(nonceRequest)
    updateResponse.headers.set('Content-Security-Policy', cspHeader)
    updateResponse.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
    updateResponse.headers.set('X-Frame-Options', 'SAMEORIGIN')
    updateResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    updateResponse.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains')
    return updateResponse
  }

  response.headers.set('Content-Security-Policy', cspHeader)
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains')

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
    /* Keep the Supabase session refresh running on admin pages and
     * admin APIs (including prefetches), as before. */
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/3d-shop/admin/:path*',
  ],
}