import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

const protectedPrefixes = ['/quote', '/saved-quotes', '/my-orders', '/profile', '/admin']
const guestOnlyPrefixes = ['/login', '/signup']

export async function proxy(request: NextRequest) {
  const { response, supabase } = await updateSession(request)
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Invalid refresh token — treat as unauthenticated
  }
  const pathname = request.nextUrl.pathname
  const fullPath = `${pathname}${request.nextUrl.search}`

  if (protectedPrefixes.some((prefix) => pathname.startsWith(prefix)) && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', fullPath)
    return NextResponse.redirect(loginUrl)
  }

  if (guestOnlyPrefixes.some((prefix) => pathname.startsWith(prefix)) && user) {
    const nextPath = request.nextUrl.searchParams.get('next') ?? '/instant-quote'
    return NextResponse.redirect(new URL(nextPath, request.url))
  }

  return response
}

export const config = {
  matcher: ['/quote/:path*', '/saved-quotes/:path*', '/my-orders/:path*', '/profile/:path*', '/admin/:path*', '/login', '/signup'],
}
