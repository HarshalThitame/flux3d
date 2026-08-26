import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL,
  'https://flux3d.in',
  'https://www.flux3d.in',
].filter(Boolean) as string[]

export function getCorsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') ?? ''
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] ?? '*'

  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-nonce',
    'Access-Control-Max-Age': '86400',
  }
}

export function withCors(response: NextResponse, request: NextRequest) {
  const headers = getCorsHeaders(request)
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value)
  }
  return response
}

export function corsPreflightResponse(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 })
  return withCors(response, request)
}
