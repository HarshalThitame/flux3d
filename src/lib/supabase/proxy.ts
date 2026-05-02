import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/config'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      auth: {
        logger: {
          error: (message: string, ...args: unknown[]) => {
            if (
              typeof message === 'string' &&
              (message.includes('refresh_token_not_found') ||
                message.includes('Invalid Refresh Token'))
            ) {
              return
            }
            console.error(message, ...args)
          },
          warn: (message: string, ...args: unknown[]) => {
            if (
              typeof message === 'string' &&
              (message.includes('refresh_token_not_found') ||
                message.includes('Invalid Refresh Token'))
            ) {
              return
            }
            console.warn(message, ...args)
          },
          info: console.info,
          debug: console.debug,
        },
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          response = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  try {
    await supabase.auth.getUser()
  } catch {
    // Invalid refresh token — session will be cleared automatically
  }

  return { response, supabase }
}
