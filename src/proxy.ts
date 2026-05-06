import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

const protectedPrefixes = ['/quote', '/saved-quotes', '/my-orders', '/profile', '/admin']
const guestOnlyPrefixes = ['/login', '/signup']

export async function proxy(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development'
  const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

  const cspHeader = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    `img-src 'self' data: blob: https:`,
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co`,
    `frame-src 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`
  ].join('; ')

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const pathname = request.nextUrl.pathname
  const isAuthRoute = [...protectedPrefixes, ...guestOnlyPrefixes].some(prefix => pathname.startsWith(prefix))
  const isAdminRoute = pathname.startsWith('/admin')

  if (isAuthRoute) {
    const { response, supabase } = await updateSession(request)
    let user = null
    try {
      const { data } = await supabase.auth.getUser()
      user = data.user
    } catch {
      // Invalid refresh token — treat as unauthenticated
    }

    const fullPath = `${pathname}${request.nextUrl.search}`

    if (protectedPrefixes.some((prefix) => pathname.startsWith(prefix)) && !user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('next', fullPath)
      const redirectResponse = NextResponse.redirect(loginUrl)
      redirectResponse.headers.set('Content-Security-Policy', cspHeader)
      redirectResponse.headers.set('X-Frame-Options', 'DENY')
      redirectResponse.headers.set('X-Content-Type-Options', 'nosniff')
      redirectResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
      redirectResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
      return redirectResponse
    }

    if (guestOnlyPrefixes.some((prefix) => pathname.startsWith(prefix)) && user) {
      const nextPath = request.nextUrl.searchParams.get('next') ?? '/instant-quote'
      const redirectResponse = NextResponse.redirect(new URL(nextPath, request.url))
      redirectResponse.headers.set('Content-Security-Policy', cspHeader)
      redirectResponse.headers.set('X-Frame-Options', 'DENY')
      redirectResponse.headers.set('X-Content-Type-Options', 'nosniff')
      redirectResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
      redirectResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
      return redirectResponse
    }

    if (isAdminRoute && user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.role !== 'admin') {
        const redirectResponse = NextResponse.redirect(new URL('/', request.url))
        redirectResponse.headers.set('Content-Security-Policy', cspHeader)
        redirectResponse.headers.set('X-Frame-Options', 'DENY')
        redirectResponse.headers.set('X-Content-Type-Options', 'nosniff')
        redirectResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
        redirectResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
        return redirectResponse
      }
    }

    response.headers.set('Content-Security-Policy', cspHeader)
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    return response
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders }
  })

  response.headers.set('Content-Security-Policy', cspHeader)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest).*)',
  ],
}
