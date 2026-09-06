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

  // Normalize custom_data fields that Meta validates strictly:
  //  - custom_data.value: must be a positive finite number. When unusable (0,
  //    negative, NaN), omit the field rather than drop the event so non-purchase
  //    events (e.g. free samples) still reach Meta.
  //  - custom_data.contents[].item_price: same rules apply — Meta flags events
  //    where item_price is 0, negative, or non-numeric (15% data quality error).
  const validEvents: MetaCapiEvent[] = [];
  for (const event of body.data) {
    const raw = event.custom_data as Record<string, unknown> | undefined;
    if (!raw) {
      validEvents.push(event);
      continue;
    }

    // Normalize top-level value
    let normalized: Record<string, unknown> = { ...raw };
    if ("value" in raw) {
      const value = normalizeCapiValue(raw.value);
      if (value == null) {
        const { value: _dropped, ...rest } = normalized;
        normalized = rest;
      } else {
        normalized = { ...normalized, value };
      }
    }

    // Normalize item_price inside contents[]
    if (Array.isArray(normalized.contents)) {
      normalized = {
        ...normalized,
        contents: (normalized.contents as Array<Record<string, unknown>>).map(
          (item) => {
            if (!("item_price" in item)) return item;
            const itemPrice = normalizeCapiValue(item.item_price);
            if (itemPrice == null) {
              const { item_price: _dropped, ...rest } = item;
              return rest;
            }
            return { ...item, item_price: itemPrice };
          },
        ),
      };
    }

    // Normalize currency to uppercase
    if (typeof normalized.currency === "string") {
      normalized = { ...normalized, currency: normalized.currency.toUpperCase() };
    }

    validEvents.push({ ...event, custom_data: normalized } as MetaCapiEvent);
  }

  if (!validEvents.length) {
    return NextResponse.json(
      { error: "No events provided" },
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
