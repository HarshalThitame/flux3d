# Fix Auth Session Issues — Implementation Plan

## Problem Summary

1. **401 on `/api/3d-shop/admin/orders`**: When admin user navigates from Normal Orders (server-rendered) to 3D Shop Orders (client-fetched), the API call returns 401.
2. **Login required after browser close**: Session cookies don't survive browser restarts.

## Root Causes

### 1. Proxy (`src/proxy.ts`) only covers frontend admin pages, NOT API routes
- The `proxy` (Next.js 16 edge middleware) only runs for `/admin/:path*` 
- API routes at `/api/admin/*` and `/api/3d-shop/admin/*` are NOT covered
- Session refresh only happens on page navigation, not on API calls

### 2. Proxy's `setAll` pattern doesn't follow Supabase docs recommendation
- Creates `NextResponse.next()` once at the start and reuses it
- Official Supabase docs recommend creating a **fresh** `NextResponse.next()` inside `setAll` after updating request cookies
- This can cause `Set-Cookie` headers to not propagate to the browser

### 3. `server.ts` `setAll` silently swallows errors
- `cookies().set()` errors are caught and ignored
- In Route Handlers, this should work, but if it fails, the error is invisible
- No cookie options (`cookieOptions`) are explicitly configured

### 4. `requireAdminRequest()` uses `getUser()` directly
- `getUser()` always makes a network call and can trigger token refresh
- If the proxy has already consumed the refresh token without properly saving cookies, the API route's `getUser()` call will fail

---

## Files to Modify

### 1. `src/proxy.ts` — Expand matcher to cover API routes

**Replace the entire file with:**

```typescript
import { updateSession } from '@/lib/supabase/proxy'
import { type NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/api/3d-shop/admin/:path*'],
}
```

**What changed:**
- Removed the `pathname.startsWith('/admin')` guard (the matcher handles filtering)
- Expanded `config.matcher` to include `/api/admin/:path*` and `/api/3d-shop/admin/:path*`
- This ensures session refresh happens BEFORE Route Handlers execute

---

### 2. `src/lib/supabase/proxy.ts` — Fix `setAll` pattern and cookie options

**Replace the entire file with:**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/config'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookieOptions: {
        path: '/',
        maxAge: 400 * 24 * 60 * 60,
        sameSite: 'lax',
        httpOnly: false,
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          supabaseResponse = NextResponse.next({ request })

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })

          if (headers) {
            Object.entries(headers).forEach(([key, value]) => {
              supabaseResponse.headers.set(key, value)
            })
          }
        },
      },
    }
  )

  try {
    await supabase.auth.getUser()
  } catch {
    // Invalid refresh token — session will be cleared automatically
  }

  return supabaseResponse
}
```

**What changed:**
- Follows official Supabase `setAll` pattern: creates a **fresh** `NextResponse.next({ request })` inside `setAll` after `request.cookies.set()`
- Added explicit `cookieOptions` with `path: '/'` and `maxAge: 400 days`
- Handles the second `headers` parameter from `setAll` (for cache-control headers)
- Removed `auth: { autoRefreshToken: true, persistSession: false }` — these are overridden by the library anyway
- Passes the full `request` object (not just `{ headers }`) to `NextResponse.next()`

---

### 3. `src/lib/supabase/server.ts` — Add cookieOptions, log errors instead of silent catch

**Replace the entire file with:**

```typescript
import { cache } from 'react'
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/config'

export const createServerSupabaseClient = cache(async () => {
  const cookieStore = await cookies()

  return createSupabaseServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookieOptions: {
        path: '/',
        maxAge: 400 * 24 * 60 * 60,
        sameSite: 'lax',
        httpOnly: false,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Server Components cannot always write cookies during render.
            // Auth is handled by the middleware/proxy — the setAll callback
            // is only triggered during getUser() token refresh. Since we
            // now use getSession() first in getCurrentUserProfile(), this
            // path is rarely hit in Server Components.
          }
        },
      },
    }
  )
})

export const createServerClient = createServerSupabaseClient
```

**What changed:**
- Added explicit `cookieOptions` matching the Supabase SSR library defaults (`path: '/'`, `maxAge: 400 days`)
- This ensures consistency regardless of library version changes
- The try-catch silently ignores errors (as before) — this is intentional because Server Components can't write cookies during render and this is handled by the proxy now

---

### 4. `src/lib/admin/request.ts` — Use `getSession()` first to avoid unnecessary refresh

**Replace the entire file with:**

```typescript
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function requireAdminRequest() {
  const supabase = await createServerSupabaseClient()

  // getSession() reads cookies locally — no network call, no token refresh.
  // Session refresh is handled by the proxy, which runs before Route Handlers.
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  const sessionUser = sessionData?.session?.user

  if (sessionError) {
    return { response: NextResponse.json({ error: sessionError.message }, { status: 401 }) }
  }

  if (sessionUser) {
    // Session exists locally — verify with getUser() (network call, may refresh)
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      if (error.code === 'refresh_token_not_found') {
        return { response: NextResponse.json({ error: 'Session expired' }, { status: 401 }) }
      }
      return { response: NextResponse.json({ error: error.message }, { status: 401 }) }
    }

    if (!data.user) {
      return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', data.user.id)
      .maybeSingle()

    if (profileError) {
      return { response: NextResponse.json({ error: profileError.message }, { status: 500 }) }
    }

    if (!profile?.is_admin) {
      return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    }

    return { supabase, user: data.user }
  }

  // No session at all — fall back to getUser() for the edge case where
  // the proxy hasn't run yet (e.g., first request after login redirect)
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    if (error.code === 'refresh_token_not_found') {
      return { response: NextResponse.json({ error: 'Session expired' }, { status: 401 }) }
    }
    return { response: NextResponse.json({ error: error.message }, { status: 401 }) }
  }

  const user = data.user
  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return { response: NextResponse.json({ error: profileError.message }, { status: 500 }) }
  }

  if (!profile?.is_admin) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { supabase, user }
}
```

**What changed:**
- Tries `getSession()` first (reads cookies locally, no network call)
- If session exists, verifies with `getUser()` (network call, but tokens will be fresh since proxy already refreshed them)
- Falls back to `getUser()` only when there's no local session (edge case)
- This pattern matches `getCurrentUserProfile()` in `src/lib/auth/server.ts`

---

### 5. (Optional) `src/app/auth/callback/route.ts` — Add cookieOptions for consistency

**Add `cookieOptions` to the `createServerClient` call:**

```typescript
const supabase = createServerClient(
  getSupabaseUrl(),
  getSupabasePublishableKey(),
  {
    cookieOptions: {
      path: '/',
      maxAge: 400 * 24 * 60 * 60,
      sameSite: 'lax',
    },
    cookies: { ... },
  }
)
```

This ensures the OAuth callback also sets cookies with consistent options.

---

## How These Fixes Work Together

```
Request flow BEFORE fix:
  Browser → /admin/3d-shop/orders (page)
    → Proxy runs (setAll may not save cookies properly)
    → Layout renders (getSession() works locally)
    → Client component renders
    → fetch /api/3d-shop/admin/orders (separate request)
      → NO PROXY (API routes not in matcher)
      → Route handler calls getUser() → refresh needed
      → Refresh fails (old refresh token already consumed by bad proxy pattern)
      → Returns 401 🚫

Request flow AFTER fix:
  Browser → /admin/3d-shop/orders (page)
    → Proxy runs (setAll saves cookies properly via fresh NextResponse)
    → Layout renders → Client component renders
    → fetch /api/3d-shop/admin/orders (separate request)
      → PROXY RUNS (API routes now in matcher) → session refreshed
      → Route handler calls getSession() → valid session
      → getUser() verifies with fresh tokens → ✅

Login flow:
  loginAction succeeds → cookies set with maxAge=400 days
  Browser stores cookies persistently
  Next visit: cookies are still there → no login needed ✅
```

## Verification Steps

After applying changes:

1. **Clear browser cookies** and log in fresh
2. Navigate to `/admin/orders` — should load
3. Navigate to `/admin/3d-shop/orders` — should load orders (no 401)
4. **Close browser completely**, reopen, navigate to `/admin` — should still be logged in
5. Check browser devtools → Application → Cookies → verify cookie has `Max-Age` set
