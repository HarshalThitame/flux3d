import { NextResponse } from "next/server";
import {
  getMetaApiHeaders,
  getMetaPixelId,
  getMetaGraphBase,
} from "@/lib/meta/config";
import { normalizeCapiValue } from "@/lib/meta/conversions-api";
import type {
  MetaCapiRequest,
  MetaCapiEvent,
  MetaCapiResponse,
} from "@/lib/meta/types";
import { rateLimitCheck } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const clientIp = forwarded?.split(",")[0]?.trim() || undefined;
  const rateLimit = await rateLimitCheck(
    `meta_capi:${clientIp || "unknown"}`,
    60,
    120,
  );
  if (!rateLimit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: MetaCapiRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.data?.length) {
    return NextResponse.json({ error: "No events provided" }, { status: 400 });
  }

  // Meta's custom_data.value is optional. When present but unusable (0,
  // negative, NaN), omit the field instead of dropping the whole event so
  // zero-value conversions (e.g. free products) still reach Meta.
  const validEvents: MetaCapiEvent[] = [];
  for (const event of body.data) {
    const raw = event.custom_data as Record<string, unknown> | undefined;
    if (!raw || !("value" in raw)) {
      validEvents.push(event);
      continue;
    }
    const value = normalizeCapiValue(raw.value);
    if (value == null) {
      const { value: _dropped, ...rest } = raw;
      validEvents.push({ ...event, custom_data: rest } as MetaCapiEvent);
      continue;
    }
    validEvents.push({
      ...event,
      custom_data: { ...raw, value },
    } as MetaCapiEvent);
  }

  if (!validEvents.length) {
    return NextResponse.json(
      { error: "No events with a valid value provided" },
      { status: 400 },
    );
  }

  const events: MetaCapiEvent[] = validEvents.map((event) => ({
    ...event,
    event_time: event.event_time ?? Math.floor(Date.now() / 1000),
    user_data: {
      ...event.user_data,
      client_ip_address: event.user_data.client_ip_address || clientIp,
      client_user_agent:
        event.user_data.client_user_agent ||
        request.headers.get("user-agent") ||
        undefined,
    },
    action_source: event.action_source || "website",
  }));

  const pixelId = getMetaPixelId();
  const headers = getMetaApiHeaders();

  const payload: MetaCapiRequest & { data_processing_options?: string[] } = {
    data: events,
    partner_agent: "flux3d",
  };

  try {
    const response = await fetch(`${getMetaGraphBase()}/${pixelId}/events`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as MetaCapiResponse & {
      error?: { message: string };
    };

    if (!response.ok) {
      console.error(
        "[Meta CAPI] API error:",
        response.status,
        "trace:",
        result.fbtrace_id,
        "| message:",
        result.error?.message,
      );
      return NextResponse.json(
        {
          error: result.error?.message || "Meta API error",
          fbtrace_id: result.fbtrace_id,
        },
        { status: response.status },
      );
    }

    console.log(
      "[Meta CAPI] Events sent:",
      result.events_received,
      "trace:",
      result.fbtrace_id,
    );
    return NextResponse.json({
      success: true,
      events_received: result.events_received,
      fbtrace_id: result.fbtrace_id,
    });
  } catch (err) {
    console.error("[Meta CAPI] Network error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Network error" },
      { status: 502 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", service: "Meta Conversions API" });
}
