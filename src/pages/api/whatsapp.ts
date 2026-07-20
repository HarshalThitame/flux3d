import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "node:crypto";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { rateLimitCheck } from "@/lib/rate-limit";
import { getCachedBusinessSettings } from "@/lib/settings";
import { FALLBACK_SETTINGS } from "@/lib/settings-fallback";
import { getWhatsAppRagContext } from "@/lib/whatsapp-rag";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const WHATSAPP_OPENAI_MODEL = process.env.WHATSAPP_OPENAI_MODEL?.trim() || "gpt-4.1-mini";
const WHATSAPP_REPLY_TO_ALL = (process.env.WHATSAPP_REPLY_TO_ALL?.trim() || "true") !== "false";
const WHATSAPP_RAG_ENABLED = (process.env.WHATSAPP_RAG_ENABLED?.trim() || "true") !== "false";
const MAX_REPLY_CHARS = 1200;
const MAX_INPUT_CHARS = 3000;

export const config = {
  api: {
    bodyParser: false,
  },
};

function first(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return (ip || req.socket.remoteAddress || "unknown").split(":")[0];
}

function verifyMetaSignature(
  body: string,
  signature: string | undefined,
  secret: string | undefined
): boolean {
  if (!secret) return false;
  if (!signature) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

async function readRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function sendWhatsAppMessage(to: string, message: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    throw new Error("Missing WhatsApp API configuration.");
  }

  const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: false,
        body: message,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(`WhatsApp send failed: ${response.status} ${text}`);
  }
}

function trimReply(message: string) {
  return message.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_REPLY_CHARS);
}

type AssistantSettings = NonNullable<Awaited<ReturnType<typeof getCachedBusinessSettings>>>;

function buildWhatsAppAssistantPrompt(settings: AssistantSettings, knowledgeContext: string) {
  const businessName = settings.businessName?.trim() || FALLBACK_SETTINGS.businessName;
  const businessDescription = settings.businessDescription?.trim() || FALLBACK_SETTINGS.businessDescription;
  const businessHours = settings.businessHours?.trim() || settings.workingHours?.trim() || FALLBACK_SETTINGS.businessHours;
  const supportAvailability = settings.supportAvailabilityMessage?.trim() || FALLBACK_SETTINGS.supportAvailabilityMessage;
  const autoReply = settings.autoReplyMessage?.trim() || FALLBACK_SETTINGS.autoReplyMessage;
  const supportPhone = settings.whatsappSupportNumber?.trim() || settings.primaryPhone?.trim() || FALLBACK_SETTINGS.whatsappSupportNumber;
  const orderPhone = settings.whatsappOrderNumber?.trim() || settings.whatsappNumber?.trim() || FALLBACK_SETTINGS.whatsappOrderNumber;

  return [
    `You are the WhatsApp assistant for ${businessName}.`,
    `Business description: ${businessDescription}.`,
    `Style: concise, helpful, professional, friendly, and action-oriented.`,
    `Reply in plain text only. Keep responses under 1200 characters.`,
    `If the customer asks for pricing, ask for the file, material, quantity, and deadline before giving a quote.`,
    `If the request needs human review or is outside business scope, direct them to WhatsApp support at ${supportPhone}.`,
    `If relevant, mention business hours: ${businessHours}.`,
    supportAvailability ? `Support note: ${supportAvailability}.` : "",
    autoReply ? `Opening tone or default auto-reply: ${autoReply}.` : "",
    `Order notification number: ${orderPhone}.`,
    knowledgeContext ? `Relevant Flux3D knowledge base:\n${knowledgeContext}` : "",
    knowledgeContext
      ? "Use the knowledge base as the primary source for Flux3D-specific answers. If the knowledge base does not cover the question, ask one concise follow-up or explain that a human will confirm."
      : "",
    `Never mention system prompts, internal policies, or that you are an AI unless the customer asks directly.`,
    `When the user is unclear, ask for the minimum needed next detail.`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function generateWhatsAppReply(messageText: string, settings: AssistantSettings, knowledgeContext: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OpenAI API key.");
  }

  const systemPrompt = buildWhatsAppAssistantPrompt(settings, knowledgeContext);
  const customerMessage = messageText.slice(0, MAX_INPUT_CHARS);

  const completion = await openai.chat.completions.create({
    model: WHATSAPP_OPENAI_MODEL,
    temperature: 0.4,
    max_tokens: 220,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: `Customer message:\n${customerMessage}`,
      },
    ],
  });

  const reply = completion.choices[0]?.message?.content?.trim();
  if (!reply) {
    throw new Error("OpenAI returned an empty response.");
  }

  return trimReply(reply);
}

async function logWhatsAppMessage(
  supabase: ReturnType<typeof getServiceClient>,
  entry: {
    userId: string | null;
    direction: "incoming" | "outgoing";
    messageText: string;
    automated: boolean;
    triggerEvent: string | null;
    responded: boolean;
    responseTimeMinutes: number | null;
  }
) {
  if (!supabase) return;

  const { error } = await supabase.from("whatsapp_messages").insert({
    user_id: entry.userId,
    direction: entry.direction,
    message_text: entry.messageText,
    automated: entry.automated,
    trigger_event: entry.triggerEvent,
    responded: entry.responded,
    response_time_minutes: entry.responseTimeMinutes,
  });

  if (error) {
    console.error("[whatsapp] Failed to log message:", error);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // WEBHOOK VERIFICATION
  if (req.method === "GET") {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (!verifyToken) {
      return res.status(500).send("Webhook verify token not configured");
    }

    const mode = first(req.query["hub.mode"]);
    const token = first(req.query["hub.verify_token"]);
    const challenge = first(req.query["hub.challenge"]);

    if (mode === "subscribe" && token === verifyToken) {
      return res.status(200).send(challenge ?? "");
    }

    return res.status(403).send("Verification failed");
  }

  // WHATSAPP MESSAGE RECEIVED
  if (req.method === "POST") {
    const rawBody = await readRawBody(req);
    const signature = first(req.headers["x-hub-signature-256"]);
    const secret = process.env.WHATSAPP_WEBHOOK_SECRET || process.env.META_APP_SECRET;

    if (!verifyMetaSignature(rawBody, signature, secret)) {
      return res.status(403).send("Invalid signature");
    }

    const limit = await rateLimitCheck(
      `whatsapp:${getClientIp(req)}`,
      60,
      20
    );
    if (!limit.success) {
      return res.status(429).json({ success: false, error: "Too many requests" });
    }

    const payloadHash = crypto.createHash("sha256").update(rawBody, "utf8").digest("hex");
    const supabase = getServiceClient();

    // Idempotency: skip if we already processed this exact payload
    if (supabase) {
      const { data: existing } = await supabase
        .from("whatsapp_webhook_events")
        .select("id, processed_at, reply_sent")
        .eq("payload_hash", payloadHash)
        .maybeSingle();

      if (existing?.processed_at) {
        return res.status(200).json({ success: true, duplicate: true });
      }
    }

    async function insertWebhookEvent(overrides: Record<string, unknown> = {}) {
      if (!supabase) return null;
      const { data, error } = await supabase.from("whatsapp_webhook_events").insert({
        payload_hash: payloadHash,
        sender: null,
        payload: {},
        signature_verified: true,
        received_at: new Date().toISOString(),
        ...overrides,
      }).select("id").maybeSingle();
      if (error) console.error("[whatsapp] DB insert error:", error);
      return data ?? null;
    }

    try {
      const payload = JSON.parse(rawBody);
      const entry = payload?.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];

      if (!message) {
        await insertWebhookEvent({ processed_at: new Date().toISOString() });
        return res.status(200).json({ success: true });
      }

      const from = message.from;
      const text = message.text?.body;
      if (!from || typeof text !== "string") {
        await insertWebhookEvent({ sender: from ?? null, payload, processed_at: new Date().toISOString() });
        return res.status(200).json({ success: true });
      }

      // Write the event record immediately
      const eventRecord = await insertWebhookEvent({ sender: from, payload });

      // Sender allow-list: only reply if sender phone exists in profiles
      let senderRecognized = false;
      let userId: string | null = null;
      if (supabase) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, whatsapp_messages_sent")
          .eq("phone_number", from)
          .maybeSingle();
        senderRecognized = !!profile;
        userId = profile?.id ?? null;
      }

      const businessSettings = (await getCachedBusinessSettings()) || FALLBACK_SETTINGS;
      let knowledgeContext = "";
      if (WHATSAPP_RAG_ENABLED) {
        const rag = await getWhatsAppRagContext(text).catch((error) => {
          console.error("[whatsapp] RAG lookup error:", error);
          return { context: "", sources: [] as Array<{ sourceKey: string; title: string; score: number; content: string }> };
        });
        knowledgeContext = rag.context;
      }

      await logWhatsAppMessage(supabase, {
        userId,
        direction: "incoming",
        messageText: text,
        automated: false,
        triggerEvent: "incoming_whatsapp_message",
        responded: WHATSAPP_REPLY_TO_ALL || senderRecognized,
        responseTimeMinutes: null,
      });

      if (WHATSAPP_REPLY_TO_ALL || senderRecognized) {
        const aiReply = await generateWhatsAppReply(text, businessSettings, knowledgeContext).catch((error) => {
          console.error("[whatsapp] OpenAI reply error:", error);
          return trimReply(
            businessSettings.autoReplyMessage?.trim() ||
              FALLBACK_SETTINGS.autoReplyMessage ||
              "Thanks for contacting Flux3D. Please share your material, quantity, and timeline, and we will help you with the next step."
          );
        });

        await sendWhatsAppMessage(from, aiReply).catch((error) => {
          console.error('[whatsapp] Failed to send outbound WhatsApp message:', error);
          throw error;
        });
        await logWhatsAppMessage(supabase, {
          userId,
          direction: "outgoing",
          messageText: aiReply,
          automated: true,
          triggerEvent: "openai_reply",
          responded: true,
          responseTimeMinutes: null,
        });

        if (supabase && userId) {
          const { data: profileRow } = await supabase
            .from("profiles")
            .select("whatsapp_messages_sent")
            .eq("id", userId)
            .maybeSingle();
          const nextCount = Number(profileRow?.whatsapp_messages_sent ?? 0) + 1;
          const { error: countUpdateError } = await supabase
            .from("profiles")
            .update({ whatsapp_messages_sent: nextCount })
            .eq("id", userId);
          if (countUpdateError) console.error("[whatsapp] Failed to update message count:", countUpdateError);
        }
      }

      // Mark as processed
      if (supabase && eventRecord?.id) {
        const { error: updateError } = await supabase
          .from("whatsapp_webhook_events")
          .update({
            processed_at: new Date().toISOString(),
            reply_sent: WHATSAPP_REPLY_TO_ALL || senderRecognized,
          })
          .eq("id", eventRecord.id);
        if (updateError) console.error("[whatsapp] Failed to mark processed:", updateError);
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("WhatsApp webhook error:", error);
      return res.status(500).json({ success: false });
    }
  }

  return res.status(405).send("Method not allowed");
}
