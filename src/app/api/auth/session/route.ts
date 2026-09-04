import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data } = await supabase.auth.getSession();
    // Force rewrite all supabase cookies to remove HttpOnly for existing users
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const supabaseCookies = allCookies.filter((c) => c.name.startsWith("sb-"));

    for (const cookie of supabaseCookies) {
      cookieStore.set({
        name: cookie.name,
        value: cookie.value,
        path: "/",
        maxAge: 400 * 24 * 60 * 60,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        httpOnly: false, // FORCE REMOVE HTTPONLY!
      });
    }

    return NextResponse.json({
      authenticated: !!data.session?.user,
      session: data.session,
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
