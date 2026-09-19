import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const maxDuration = 160; // seconds (Vercel Pro allows up to 300s)

export async function POST(request: Request) {
  // Must be signed-in (file is in their Supabase storage bucket)
  await requireUser("/instant-quote");

  const settings = await getSettings();
  if (!settings.slicerServiceEnabled || !settings.slicerServiceUrl) {
    return NextResponse.json(
      { error: "Slicer not enabled", fallback: true },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body?.fileUrl) {
    return NextResponse.json({ error: "fileUrl required" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${settings.slicerServiceUrl}/slice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SLICER_SERVICE_SECRET}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(150_000),
    });

    if (!upstream.ok) {
      const err = await upstream
        .json()
        .catch(() => ({ error: "Slicer error" }));
      return NextResponse.json(
        { error: err.error, fallback: true },
        { status: 502 },
      );
    }

    return NextResponse.json(await upstream.json());
  } catch {
    return NextResponse.json(
      { error: "Slicer unavailable", fallback: true },
      { status: 503 },
    );
  }
}
