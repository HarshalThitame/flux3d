import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { rateLimitResponse } from "@/lib/rate-limit";
import { quoteAnalysisConfigSchema } from "@/lib/quote/analysis-types";
import { createConfiguredAnalysis } from "@/lib/quote/analysis-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await rateLimitResponse(request, {
    prefix: "quote_analysis_config",
    windowSeconds: 60,
    maxRequests: 15,
    userId: data.user.id,
  });
  if (!limit.success) {
    return NextResponse.json({ error: "Too many slicing requests." }, { status: 429 });
  }

  const parsed = quoteAnalysisConfigSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid quote configuration.", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { id } = await params;
  try {
    const result = await createConfiguredAnalysis({
      userId: data.user.id,
      analysisId: id,
      config: parsed.data,
    });
    return NextResponse.json(result, { status: 202 });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "Could not queue slicing.";
    const status = /not found/i.test(message) ? 404 : /not ready|confirm|invalid/i.test(message) ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
