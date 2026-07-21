import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "node:crypto";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { rateLimitCheck } from "@/lib/rate-limit";
import { getCachedBusinessSettings } from "@/lib/settings";
import { FALLBACK_SETTINGS } from "@/lib/settings-fallback";
import { logWhatsAppRagAudit, type WhatsAppRagAuditRecord } from "@/lib/whatsapp-rag-audit";
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
const WHATSAPP_RAG_CONFIDENCE_THRESHOLD = Number(process.env.WHATSAPP_RAG_CONFIDENCE_THRESHOLD ?? 0.55) || 0.55;
const WHATSAPP_PROMPT_VERSION = "whatsapp-rag-v2";
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

export function trimReply(message: string) {
  return message.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_REPLY_CHARS);
}

export function formatBulletReply(lines: Array<string | false | null | undefined>) {
  return trimReply(lines.filter(Boolean).join("\n"))
}

type WhatsAppIntent = 'pricing' | 'shipping' | 'order' | 'materials' | 'contact' | 'greeting' | 'general'

export function detectWhatsAppIntent(messageText: string): WhatsAppIntent {
  const text = messageText.toLowerCase()

  if (/(price|pricing|quote|quotation|cost|estimate|amount)/i.test(text)) return 'pricing'
  if (/(ship|shipping|delivery|courier|dispatch|tracking|pincode|pin code)/i.test(text)) return 'shipping'
  if (/(order status|status of my order|where is my order|my order|order number|invoice)/i.test(text)) return 'order'
  if (/(material|pla\+?|abs|petg|asa|tpu|resin|filament|finish|colour|color)/i.test(text)) return 'materials'
  if (/(contact|call|phone|whatsapp number|support|hours|working hours)/i.test(text)) return 'contact'
  if (/(hello|hi|hey|good morning|good afternoon|good evening)/i.test(text)) return 'greeting'

  return 'general'
}

export function buildGuidedFallbackReply(settings: AssistantSettings, messageText: string) {
  const businessName = settings.businessName?.trim() || FALLBACK_SETTINGS.businessName;
  const businessHours = settings.businessHours?.trim() || settings.workingHours?.trim() || FALLBACK_SETTINGS.businessHours;
  const supportPhone = settings.whatsappSupportNumber?.trim() || settings.primaryPhone?.trim() || FALLBACK_SETTINGS.whatsappSupportNumber;
  const orderPhone = settings.whatsappOrderNumber?.trim() || settings.whatsappNumber?.trim() || FALLBACK_SETTINGS.whatsappOrderNumber;

  switch (detectWhatsAppIntent(messageText)) {
    case 'pricing':
      return formatBulletReply([
        `Hi, thanks for reaching out to ${businessName}.`,
        '- For a confirmed quote, please share the file, material, quantity, and deadline.',
        '- If you have a reference image or sketch, send that too.',
        '- I’ll guide you with the next step once I have those details.',
      ])
    case 'shipping':
      return formatBulletReply([
        `Hi, thanks for reaching out to ${businessName}.`,
        '- For delivery checks, please share the pincode and city.',
        '- If you want a shipping estimate, I can help once I have the destination details.',
      ])
    case 'order':
      return formatBulletReply([
        `Hi, thanks for reaching out to ${businessName}.`,
        '- Please share your order number and the registered phone number.',
        '- I’ll use that to help confirm the latest update.',
        `- If needed, support is also available at ${supportPhone}.`,
      ])
    case 'materials':
      return formatBulletReply([
        `Hi, thanks for reaching out to ${businessName}.`,
        '- Please share the use case, required strength, flexibility, and finish you want.',
        '- If you already know the material, send it and I’ll confirm the best next step.',
      ])
    case 'contact':
      return formatBulletReply([
        `Hi, thanks for reaching out to ${businessName}.`,
        `- Support number: ${supportPhone}.`,
        `- Order updates: ${orderPhone}.`,
        `- Business hours: ${businessHours}.`,
      ])
    case 'greeting':
      return formatBulletReply([
        `Hi, thanks for reaching out to ${businessName}.`,
        '- I can help with quotes, materials, delivery, and support.',
        '- Please share what you need, and I’ll give you the next step.',
      ])
    default:
      return formatBulletReply([
        `Hi, thanks for reaching out to ${businessName}.`,
        '- I can help with quotes, materials, delivery, and support.',
        '- Please share the file or the exact question so I can give you a confirmed answer.',
      ])
  }
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
    `Style: warm, polite, concise, and structured.`,
    `Reply in plain text only. Keep responses under 1200 characters.`,
    `Use only confirmed facts from the knowledge base and approved business settings.`,
    `Do not guess, infer, or improvise missing facts.`,
    `Prefer 3 to 5 short bullets instead of a long paragraph.`,
    `If the customer asks for pricing, ask for the file, material, quantity, and deadline before giving a quote unless the knowledge base directly confirms the answer.`,
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
    `Response shape: Greeting, Answer, Needed details, Next step.`,
  ]
    .filter(Boolean)
    .join("\n");
}

type GeneratedWhatsAppReply = {
  reply: string;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  finishReason: string | null;
}

async function generateWhatsAppReply(messageText: string, settings: AssistantSettings, knowledgeContext: string): Promise<GeneratedWhatsAppReply> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OpenAI API key.");
  }

  const systemPrompt = buildWhatsAppAssistantPrompt(settings, knowledgeContext);
  const customerMessage = messageText.slice(0, MAX_INPUT_CHARS);

  const completion = await openai.chat.completions.create({
    model: WHATSAPP_OPENAI_MODEL,
    temperature: 0.2,
    max_tokens: 180,
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

  return {
    reply: trimReply(reply),
    model: completion.model ?? WHATSAPP_OPENAI_MODEL,
    promptTokens: completion.usage?.prompt_tokens ?? null,
    completionTokens: completion.usage?.completion_tokens ?? null,
    totalTokens: completion.usage?.total_tokens ?? null,
    finishReason: completion.choices[0]?.finish_reason ?? null,
  }
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

function buildRagPayload(rag: { mode: string; confidence: number; sources: Array<{ sourceKey: string; title: string; score: number }> }) {
  return {
    enabled: WHATSAPP_RAG_ENABLED,
    mode: rag.mode,
    confidence: rag.confidence,
    sources: rag.sources,
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

    async function insertWebhookEvent(payload: Record<string, unknown>, overrides: Record<string, unknown> = {}) {
      if (!supabase) return null;
      const { data, error } = await supabase.from("whatsapp_webhook_events").insert({
        payload_hash: payloadHash,
        sender: null,
        payload,
        signature_verified: true,
        received_at: new Date().toISOString(),
        ...overrides,
      }).select("id").maybeSingle();
      if (error) console.error("[whatsapp] DB insert error:", error);
      return data ?? null;
    }

    try {
      const requestStartedAt = Date.now();
      const payload = JSON.parse(rawBody);
      const entry = payload?.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];

      if (!message) {
        await insertWebhookEvent(payload, { processed_at: new Date().toISOString() });
        return res.status(200).json({ success: true });
      }

      const from = message.from;
      const text = message.text?.body;
      if (!from || typeof text !== "string") {
        await insertWebhookEvent(payload, { sender: from ?? null, processed_at: new Date().toISOString() });
        return res.status(200).json({ success: true });
      }

      // Write the event record immediately
      const eventRecord = await insertWebhookEvent(payload, { sender: from });

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
      let ragMode: 'database' | 'seed' | 'none' = 'none';
      let ragConfidence = 0;
      let ragSources: Array<{ sourceKey: string; title: string; score: number; content: string }> = [];
      let retrievalLatencyMs: number | null = null;
      if (WHATSAPP_RAG_ENABLED) {
        const retrievalStartedAt = Date.now();
        const rag = await getWhatsAppRagContext(text).catch((error) => {
          console.error("[whatsapp] RAG lookup error:", error);
          return { context: "", sources: [] as Array<{ sourceKey: string; title: string; score: number; content: string }>, mode: 'none' as const, confidence: 0 };
        });
        retrievalLatencyMs = Date.now() - retrievalStartedAt;
        knowledgeContext = rag.context;
        ragMode = rag.mode;
        ragConfidence = rag.confidence;
        ragSources = rag.sources;
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

      const shouldUseModelReply =
        WHATSAPP_REPLY_TO_ALL || senderRecognized
          ? Boolean(knowledgeContext) && ragConfidence >= WHATSAPP_RAG_CONFIDENCE_THRESHOLD
          : false;

      let finalReply = "";
      let finalReplyKind: 'model' | 'fallback' | 'error' = 'fallback';
      let fallbackReason: string | null = null;
      let generatedReply: GeneratedWhatsAppReply | null = null;
      let generationLatencyMs: number | null = null;
      let auditRecord: WhatsAppRagAuditRecord | null = null;

      if (WHATSAPP_REPLY_TO_ALL || senderRecognized) {
        if (shouldUseModelReply) {
          const generationStartedAt = Date.now();
          generatedReply = await generateWhatsAppReply(text, businessSettings, knowledgeContext).catch((error) => {
            console.error("[whatsapp] OpenAI reply error:", error);
            fallbackReason = 'openai_error';
            return null;
          });
          generationLatencyMs = Date.now() - generationStartedAt;
        }

        if (generatedReply) {
          finalReply = generatedReply.reply;
          finalReplyKind = 'model';
        } else {
          finalReply = buildGuidedFallbackReply(businessSettings, text);
          finalReplyKind = 'fallback';
          fallbackReason = fallbackReason ?? (WHATSAPP_RAG_ENABLED ? (shouldUseModelReply ? 'model_generation_failed' : 'low_confidence') : 'rag_disabled');
        }

        auditRecord = {
          webhook_event_id: eventRecord?.id ?? null,
          sender: from,
          user_id: userId,
          question_text: text,
          retrieval_mode: ragMode,
          retrieval_confidence: ragConfidence,
          retrieval_sources: ragSources,
          response_kind: finalReplyKind,
          response_text: finalReply,
          response_metadata: {
            model: generatedReply?.model ?? WHATSAPP_OPENAI_MODEL,
            promptTokens: generatedReply?.promptTokens ?? null,
            completionTokens: generatedReply?.completionTokens ?? null,
            totalTokens: generatedReply?.totalTokens ?? null,
            finishReason: generatedReply?.finishReason ?? null,
            replyToAll: WHATSAPP_REPLY_TO_ALL,
            senderRecognized,
            sendStatus: 'pending',
          },
          fallback_reason: fallbackReason,
          model_name: generatedReply?.model ?? (shouldUseModelReply ? WHATSAPP_OPENAI_MODEL : null),
          prompt_version: WHATSAPP_PROMPT_VERSION,
          latency_ms: null,
          retrieval_latency_ms: retrievalLatencyMs,
          generation_latency_ms: generationLatencyMs,
        };

        try {
          await sendWhatsAppMessage(from, finalReply);
          auditRecord.response_metadata = {
            ...auditRecord.response_metadata,
            sendStatus: 'sent',
          }

          await logWhatsAppMessage(supabase, {
            userId,
            direction: "outgoing",
            messageText: finalReply,
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
        } catch (error) {
          auditRecord.response_kind = 'error';
          auditRecord.fallback_reason = auditRecord.fallback_reason ?? 'send_failed';
          auditRecord.response_metadata = {
            ...auditRecord.response_metadata,
            sendStatus: 'failed',
          }
          console.error('[whatsapp] Failed to send outbound WhatsApp message:', error);
        } finally {
          auditRecord.latency_ms = Date.now() - requestStartedAt;
          await logWhatsAppRagAudit(auditRecord).catch((error) => {
            console.error("[whatsapp] Failed to log RAG audit:", error);
          });
        }
      }

      // Mark as processed
      if (supabase && eventRecord?.id) {
        const { error: updateError } = await supabase
          .from("whatsapp_webhook_events")
          .update({
            processed_at: new Date().toISOString(),
            reply_sent: WHATSAPP_REPLY_TO_ALL || senderRecognized,
            payload: {
              ...payload,
              rag: buildRagPayload({
                mode: ragMode,
                confidence: ragConfidence,
                sources: ragSources.map(({ sourceKey, title, score }) => ({ sourceKey, title, score })),
              }),
            },
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
