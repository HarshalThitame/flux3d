import { cache } from "react";
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/config";

function fetchWithTimeout(
  url: RequestInfo | URL,
  options?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timeout),
  );
}

export const createServerSupabaseClient = cache(async () => {
  const cookieStore = await cookies();

  return createSupabaseServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookieOptions: {
        path: "/",
        maxAge: 400 * 24 * 60 * 60,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
      global: {
        fetch: fetchWithTimeout,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot always write cookies during render.
            // Auth is handled by the middleware/proxy — the setAll callback
            // is only triggered during getUser() token refresh. Since we
            // now use getSession() first in getCurrentUserProfile(), this
            // path is rarely hit in Server Components.
          }
        },
      },
    },
  );
});

export const createServerClient = createServerSupabaseClient;
