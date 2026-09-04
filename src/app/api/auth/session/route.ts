import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data } = await supabase.auth.getSession();
    return NextResponse.json({ authenticated: !!data.session?.user });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
