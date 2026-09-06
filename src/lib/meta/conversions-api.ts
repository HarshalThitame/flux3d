import { createHash } from "node:crypto";
import { getMetaApiHeaders, getMetaPixelId, getMetaGraphBase } from "./config";
import type { MetaCapiCustomData, MetaCapiEvent } from "./types";

function hash(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.startsWith("91") ? `+${cleaned}` : `+91${cleaned}`;
}

// Meta requires custom_data.value to be a positive number with an optional
// decimal point (Events Manager flags 0, negatives, NaN and non-numeric
// strings). Returns null when the value is unusable so callers can drop the
// field or the whole event instead of sending data Meta rejects.
export function normalizeCapiValue(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const rounded = Math.round(n * 100) / 100;
  return rounded > 0 ? rounded : null;
}

export async function sendCapiEvents(
  events: MetaCapiEvent[],
  sourceIp?: string,
) {
  const pixelId = getMetaPixelId();
  const headers = getMetaApiHeaders();

  const enrichedEvents = events.map((event) => ({
    ...event,
    user_data: {
      ...event.user_data,
      client_ip_address:
        event.user_data.client_ip_address || sourceIp || undefined,
      client_user_agent:
        event.user_data.client_user_agent ||
        process.env.META_CAPI_USER_AGENT ||
        undefined,
    },
  }));

  const body = {
    data: enrichedEvents,
    partner_agent: "flux3d",
  };

  const response = await fetch(`${getMetaGraphBase()}/${pixelId}/events`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error(
      "[Meta CAPI] Error sending events:",
      response.status,
      errorBody,
    );
  }

  return response;
}

export function buildPurchaseEvent(params: {
  eventId: string;
  eventSourceUrl?: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerId?: string | null;
  contentIds: string[];
  contents: Array<{ id: string; quantity: number; item_price?: number }>;
  value: number;
  currency: string;
  orderId?: string;
  numItems?: number;
}): MetaCapiEvent {
  const userData: Record<string, string[]> = {};
  if (params.customerEmail) userData.em = [hash(params.customerEmail)];
  if (params.customerPhone)
    userData.ph = [hash(formatPhone(params.customerPhone))];
  if (params.customerId) userData.external_id = [hash(params.customerId)];

  const contentsTotal = params.contents.reduce(
    (s, c) => s + (c.item_price ?? 0) * c.quantity,
    0,
  );
  const value =
    normalizeCapiValue(params.value) ?? normalizeCapiValue(contentsTotal);
  // Normalize item_price inside each content entry — Meta flags 0, negatives,
  // or non-numeric item_price as "formatting issues" (data quality error).
  const normalizedContents = params.contents.map((c) => {
    const ip = normalizeCapiValue(c.item_price ?? null);
    return ip != null ? { ...c, item_price: ip } : { id: c.id, quantity: c.quantity };
  });
  const customData: MetaCapiCustomData = {
    content_ids: params.contentIds,
    content_type: "product",
    contents: normalizedContents,
    num_items:
      params.numItems ?? params.contents.reduce((s, c) => s + c.quantity, 0),
    currency: (params.currency || "INR").toUpperCase() as "INR",
    order_id: params.orderId,
  };
  if (value != null) customData.value = value;

  return {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.eventId,
    event_source_url: params.eventSourceUrl,
    action_source: "website",
    user_data: userData as MetaCapiEvent["user_data"],
    custom_data: customData,
  };
}
