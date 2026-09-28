import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { rateLimitResponse } from "@/lib/rate-limit";
import { createQuoteAnalysisSchema } from "@/lib/quote/analysis-types";
import { createQuoteAnalysis } from "@/lib/quote/analysis-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await rateLimitResponse(request, {
    prefix: "quote_analysis_create",
    windowSeconds: 60,
    maxRequests: 10,
    userId: data.user.id,
  });
  if (!limit.success) {
    return NextResponse.json({ error: "Too many analysis requests." }, { status: 429 });
  }

  const parsed = createQuoteAnalysisSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid analysis request.", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const result = await createQuoteAnalysis({
      userId: data.user.id,
      storagePath: parsed.data.storagePath,
      unitOverride: parsed.data.unitOverride,
    });
    return NextResponse.json(result, { status: 202 });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "Could not create analysis.";
    const status = /not found|invalid|does not belong|exceeds/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
