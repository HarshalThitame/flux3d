import type { NextRequest } from 'next/server'
import { proxy } from '@/lib/middleware/proxy'

export async function middleware(request: NextRequest) {
  return proxy(request)
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/3d-shop/admin/:path*',
  ],
}
