import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { rateLimitResponse } from "@/lib/rate-limit";
import { getQuoteAnalysis } from "@/lib/quote/analysis-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await rateLimitResponse(request, {
    prefix: "quote_analysis_status",
    windowSeconds: 60,
    maxRequests: 60,
    userId: data.user.id,
  });
  if (!limit.success) {
    return NextResponse.json({ error: "Too many status requests." }, { status: 429 });
  }

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid analysis id." }, { status: 400 });
  }

  try {
    const analysis = await getQuoteAnalysis(data.user.id, id);
    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
    }
    return NextResponse.json(analysis, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (reason) {
    console.error("[quote/analyses/:id] Status lookup failed:", reason);
    return NextResponse.json({ error: "Could not load analysis status." }, { status: 500 });
  }
}
