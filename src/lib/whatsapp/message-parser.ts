import { parseOrderCartItems, type OrderInteraction } from "./order-flow";

export type ParsedWhatsAppMessage = {
  metadata: Record<string, unknown>;
  text: string | undefined;
  mediaInfo: string | null;
  mediaId?: string | null;
  mediaMimeType?: string | null;
  mediaFilename?: string | null;
  mediaType?:
    | "image"
    | "document"
    | "audio"
    | "video"
    | "sticker"
    | "stl"
    | "order"
    | "interactive"
    | "location"
    | "contacts"
    | "reaction"
    | null;
  metaMessageId?: string | null;
  interaction: OrderInteraction | null;
  contextMessageId?: string | null;
  isForwarded?: boolean;
  isFrequentlyForwarded?: boolean;
  interactivePayload?: Record<string, unknown> | null;
};

type MetaMessage = Record<string, unknown>;

function getNested(
  message: MetaMessage | null | undefined,
  path: string,
): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object")
      return (acc as Record<string, unknown>)[key];
    return undefined;
  }, message);
}

export function parseWhatsAppMessage(
  message: MetaMessage | undefined | null,
): ParsedWhatsAppMessage {
  const msgType = message?.type;
  const metaMessageId = (message?.id as string | undefined) ?? null;

  let text: string | undefined;
  let mediaInfo: string | null = null;
  let mediaId: string | null = null;
  let mediaMimeType: string | null = null;
  let mediaFilename: string | null = null;
  let mediaType: ParsedWhatsAppMessage["mediaType"] = null;
  let interaction: OrderInteraction | null = null;
  let isForwarded = false;
  let isFrequentlyForwarded = false;
  let interactivePayload: Record<string, unknown> | null = null;
  const metadata: Record<string, unknown> = {};

  // Handle Context (Reply to a message)
  const context = getNested(message, "context") as
    Record<string, unknown> | undefined;
  let contextMessageId: string | null = null;
  if (context && context.id) {
    contextMessageId = String(context.id);
  }
  if (context?.forwarded) isForwarded = true;
  if (context?.frequently_forwarded) isFrequentlyForwarded = true;

  if (msgType === "text") {
    text = (getNested(message, "text.body") as string | undefined) ?? undefined;
  } else if (msgType === "image") {
    text =
      (getNested(message, "image.caption") as string | undefined) ?? undefined;
    mediaId = String(getNested(message, "image.id") ?? "");
    mediaMimeType =
      (getNested(message, "image.mime_type") as string) || "image/jpeg";
    mediaType = "image";
    mediaInfo = `[Image ID: ${mediaId || "unknown"}]`;
  } else if (msgType === "document") {
    text =
      (getNested(message, "document.caption") as string | undefined) ??
      undefined;
    mediaId = String(getNested(message, "document.id") ?? "");
    mediaFilename =
      (getNested(message, "document.filename") as string) || "document";
    mediaMimeType =
      (getNested(message, "document.mime_type") as string) ||
      "application/octet-stream";

    if (
      mediaFilename.toLowerCase().endsWith(".stl") ||
      mediaFilename.toLowerCase().endsWith(".3mf") ||
      mediaFilename.toLowerCase().endsWith(".obj")
    ) {
      mediaType = "stl";
    } else {
      mediaType = "document";
    }
    mediaInfo = `[Document: ${mediaFilename}]`;
  } else if (msgType === "audio") {
    mediaId = String(getNested(message, "audio.id") ?? "");
    mediaMimeType =
      (getNested(message, "audio.mime_type") as string) || "audio/ogg";
    mediaType = "audio";
    mediaInfo = `[Audio]`;
  } else if (msgType === "video") {
    text =
      (getNested(message, "video.caption") as string | undefined) ?? undefined;
    mediaId = String(getNested(message, "video.id") ?? "");
    mediaMimeType =
      (getNested(message, "video.mime_type") as string) || "video/mp4";
    mediaType = "video";
    mediaInfo = `[Video]`;
  } else if (msgType === "sticker") {
    mediaId = String(getNested(message, "sticker.id") ?? "");
    mediaType = "sticker";
    mediaInfo = `[Sticker]`;
  } else if (msgType === "interactive") {
    mediaType = "interactive";
    const interactive = getNested(message, "interactive") as
      Record<string, unknown> | undefined;
    interactivePayload = interactive ?? null;
    const interactiveType = interactive?.type;
    if (interactiveType === "list_reply") {
      interaction = {
        kind: "list",
        id: String(getNested(message, "interactive.list_reply.id") ?? ""),
        title: String(getNested(message, "interactive.list_reply.title") ?? ""),
      };
      text = interaction.title || text;
    } else if (interactiveType === "button_reply") {
      interaction = {
        kind: "button",
        id: String(getNested(message, "interactive.button_reply.id") ?? ""),
        title: String(
          getNested(message, "interactive.button_reply.title") ?? "",
        ),
      };
      text = interaction.title || text;
    } else if (interactiveType === "product") {
      const retailerId = String(
        getNested(message, "interactive.product.product_retailer_id") ?? "",
      );
      if (retailerId) {
        interaction = { kind: "product", id: retailerId, title: "Product" };
        text = text || `[product:${retailerId}]`;
      }
    } else if (interactiveType === "nfm_reply") {
      const nfmReply = interactive?.nfm_reply as
        Record<string, unknown> | undefined;
      if (nfmReply?.name === "flow") {
        const raw =
          typeof nfmReply.response_json === "string"
            ? nfmReply.response_json
            : "";
        let data: Record<string, unknown> = {};
        try {
          data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        } catch {
          data = { parse_error: raw.slice(0, 500) };
        }
        interaction = { kind: "flow_response", data };
        text = text || "[flow response]";
      }
    }
  } else if (msgType === "location") {
    text = "[Location]";
    const location = getNested(message, "location") as Record<string, unknown>;
    metadata.location = location;
    mediaType = "image"; // map to image as a fallback
    mediaInfo = "[Location]";
  } else if (msgType === "contacts") {
    text = "[Contacts]";
    const contacts = getNested(message, "contacts") as unknown[];
    metadata.contacts = contacts;
  } else if (msgType === "reaction") {
    const emoji = String(getNested(message, "reaction.emoji") || "");
    const messageId = String(getNested(message, "reaction.message_id") || "");
    metadata.reaction = { emoji, messageId };
  } else if (msgType === "system") {
    text = String(getNested(message, "system.body") || "[System Message]");
  } else if (msgType === "order") {
    const rawOrder = getNested(message, "order") as
      Record<string, unknown> | undefined;
    interactivePayload = rawOrder ?? null;
    mediaType = "order";
    const items = parseOrderCartItems(rawOrder?.product_items);
    if (items.length > 0) {
      interaction = { kind: "order", items };
      text = text || `[order cart: ${items.length} item(s)]`;
    }
  }

  return {
    text,
    mediaInfo,
    mediaId,
    mediaMimeType,
    mediaFilename,
    mediaType,
    metaMessageId,
    interaction,
    metadata,
    contextMessageId,
    isForwarded,
    isFrequentlyForwarded,
    interactivePayload,
  };
}
