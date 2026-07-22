import { updateSession } from '@/lib/supabase/proxy'
import { type NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/api/3d-shop/admin/:path*'],
}
