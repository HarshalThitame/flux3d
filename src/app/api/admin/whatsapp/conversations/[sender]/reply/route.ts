import { NextResponse } from "next/server";
import { getAdminApiErrorResponse } from "@/lib/admin/api";
import { requireAdminRequest } from "@/lib/admin/request";
import { createAdminSupabaseClient } from "@/lib/admin/server";
import {
  sendWhatsAppMediaMessage,
  extractWhatsAppMediaStoragePath,
} from "@/lib/whatsapp/media";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sender: string }> },
) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const { sender } = await params;
    const phone = decodeURIComponent(sender);
    const body = (await request.json()) as {
      message?: string;
      mediaUrl?: string;
      mediaType?: "image" | "document" | "audio" | "video";
      mediaFilename?: string;
      mediaSizeBytes?: number;
      mediaMimeType?: string;
      contextMessageId?: string;
      sendType?:
        | "text"
        | "buttons"
        | "list"
        | "location"
        | "contacts"
        | "reaction"
        | "product"
        | "multi_product";
      buttons?: Array<{ id: string; title: string }>;
      listHeader?: string;
      listBody?: string;
      listFooter?: string;
      listButtonText?: string;
      listSections?: Array<{
        title?: string;
        rows: Array<{ id: string; title: string; description?: string }>;
      }>;
      location?: {
        latitude: number;
        longitude: number;
        name?: string;
        address?: string;
      };
      contacts?: Array<Record<string, unknown>>;
      reaction?: { emoji: string; messageId: string };
      catalogId?: string;
      productRetailerId?: string;
      productRetailerIds?: string[];
    };

    const rawMessage = body.message?.trim() ?? "";
    const message = rawMessage
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .slice(0, 4096);
    const {
      mediaUrl,
      mediaType,
      mediaFilename,
      mediaSizeBytes,
      mediaMimeType,
    } = body;

    if (!message && !mediaUrl && !body.sendType && !body.reaction) {
      return NextResponse.json(
        { error: "Message text, media, or interactive payload is required." },
        { status: 400 },
      );
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!phoneNumberId || !accessToken) {
      return NextResponse.json(
        { error: "WhatsApp API is not configured." },
        { status: 500 },
      );
    }

    let metaMessageId: string | null = null;

    if (mediaUrl && mediaType) {
      // Send media message to WhatsApp customer
      const resData = await sendWhatsAppMediaMessage(
        phone,
        mediaUrl,
        mediaType,
        mediaFilename,
        message,
      );
      metaMessageId = resData.messages?.[0]?.id ?? null;
    } else {
      let payload: Record<string, unknown> = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "text",
        text: { preview_url: false, body: message },
      };

      if (body.contextMessageId) {
        payload.context = { message_id: body.contextMessageId };
      }

      switch (body.sendType) {
        case "buttons":
          payload = {
            ...payload,
            type: "interactive",
            interactive: {
              type: "button",
              body: { text: message },
              action: {
                buttons: body.buttons?.map((b) => ({
                  type: "reply",
                  reply: { id: b.id, title: b.title },
                })),
              },
            },
          };
          break;

        case "list":
          payload = {
            ...payload,
            type: "interactive",
            interactive: {
              type: "list",
              header: body.listHeader
                ? { type: "text", text: body.listHeader }
                : undefined,
              body: { text: body.listBody || message },
              footer: body.listFooter ? { text: body.listFooter } : undefined,
              action: {
                button: body.listButtonText || "View Options",
                sections: body.listSections,
              },
            },
          };
          break;

        case "location":
          payload = {
            ...payload,
            type: "location",
            location: body.location,
          };
          break;

        case "contacts":
          payload = {
            ...payload,
            type: "contacts",
            contacts: body.contacts,
          };
          break;

        case "reaction":
          payload = {
            ...payload,
            type: "reaction",
            reaction: {
              message_id: body.reaction?.messageId,
              emoji: body.reaction?.emoji,
            },
          };
          break;

        case "product":
        case "multi_product":
          payload = {
            ...payload,
            type: "interactive",
            interactive: {
              type: body.sendType === "product" ? "product" : "product_list",
              header:
                body.sendType === "multi_product"
                  ? {
                      type: "text",
                      text: body.listHeader || "Our Recommendations",
                    }
                  : undefined,
              body:
                body.sendType === "multi_product"
                  ? {
                      text: body.listBody || message || "Check out these items",
                    }
                  : undefined,
              action:
                body.sendType === "product"
                  ? {
                      catalog_id: body.catalogId,
                      product_retailer_id: body.productRetailerId,
                    }
                  : {
                      catalog_id: body.catalogId,
                      sections: [
                        {
                          title: "Products",
                          product_items: body.productRetailerIds?.map((id) => ({
                            product_retailer_id: id,
                          })),
                        },
                      ],
                    },
            },
          };
          break;
      }

      const apiVersion = process.env.WHATSAPP_API_VERSION || "v22.0";
      const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "Unknown error");
        return NextResponse.json(
          { error: `WhatsApp send failed: ${response.status} ${text}` },
          { status: 502 },
        );
      }

      const resData = (await response.json()) as {
        messages?: Array<{ id: string }>;
      };
      metaMessageId = resData.messages?.[0]?.id ?? null;
    }

    if (body.sendType === "reaction" && metaMessageId) {
      // Do not log reactions to whatsapp_messages table. Return early.
      return NextResponse.json({ success: true, metaMessageId });
    }

    // Determine specific mediaType enum for DB storage (e.g. stl vs document)
    let storedMediaType = mediaType as string | null;
    if (mediaType === "document" && mediaFilename) {
      const lower = mediaFilename.toLowerCase();
      if (
        lower.endsWith(".stl") ||
        lower.endsWith(".3mf") ||
        lower.endsWith(".obj")
      ) {
        storedMediaType = "stl";
      }
    }

    // Log the outgoing message into whatsapp_messages
    const supabase = createAdminSupabaseClient();
    const { error: logError } = await supabase
      .from("whatsapp_messages")
      .insert({
        sender: phone,
        direction: "outgoing",
        message_text: message || mediaFilename || "Media attachment",
        automated: false,
        trigger_event: "admin_reply",
        responded: true,
        media_type: storedMediaType,
        // Store the canonical storage path (not the signed URL) — the inbox API
        // mints fresh signed URLs at read time.
        media_url:
          (mediaUrl && extractWhatsAppMediaStoragePath(mediaUrl)) || null,
        media_filename: mediaFilename || null,
        media_mime_type: mediaMimeType || null,
        media_size_bytes: mediaSizeBytes || null,
        meta_message_id: metaMessageId,
        context_message_id: body.contextMessageId || null,
        status: "sent",
        metadata: body.sendType ? { sendType: body.sendType, ...body } : null,
      });

    if (logError) {
      console.error("[whatsapp-inbox] Failed to log message:", logError);
    }

    // Also mark customer messages in this thread as responded
    await supabase
      .from("whatsapp_messages")
      .update({ responded: true })
      .eq("sender", phone)
      .eq("direction", "incoming");

    return NextResponse.json({ success: true, metaMessageId });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}
