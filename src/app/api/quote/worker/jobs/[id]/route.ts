import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { workerEventSchema } from "@/lib/quote/analysis-types";
import {
  finalizeAnalysisResult,
  updateAnalysisProgress,
} from "@/lib/quote/analysis-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

function hasValidWorkerToken(request: Request) {
  const expected = process.env.QUOTE_WORKER_CALLBACK_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !supplied) return false;
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return (
    expectedBuffer.length === suppliedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasValidWorkerToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = workerEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid worker event." }, { status: 400 });
  }

  const { id } = await params;
  try {
    if (parsed.data.type === "progress") {
      await updateAnalysisProgress(id, parsed.data);
      return NextResponse.json({ accepted: true });
    }
    const result = await finalizeAnalysisResult(id, parsed.data);
    return NextResponse.json({ accepted: true, ...result });
  } catch (reason) {
    console.error("[quote-worker-callback] Event failed:", reason);
    return NextResponse.json({ error: "Worker event could not be persisted." }, { status: 500 });
  }
}
