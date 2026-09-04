import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "node:crypto";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { createClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";
import { getEnv } from "@/lib/env";
import { rateLimitCheck } from "@/lib/rate-limit";
import { getCachedBusinessSettings } from "@/lib/settings";
import { FALLBACK_SETTINGS } from "@/lib/settings-fallback";
import {
  logWhatsAppRagAudit,
  type WhatsAppRagAuditRecord,
} from "@/lib/whatsapp-rag-audit";
import {
  getWhatsAppRagContext,
  fetchStructuredData,
  type StructuredDataResult,
} from "@/lib/whatsapp-rag";
import { extractSearchKeywords } from "@/lib/whatsapp-keywords";
import {
  validatePricesInResponse,
  type ValidationResult,
} from "@/lib/whatsapp-price-validation";
import {
  classifyIntent,
  type ClassifiedIntent,
} from "@/lib/whatsapp-intent-classifier";
import { handleAccountLinkWhatsApp } from "@/lib/whatsapp/account-link-flow";
import {
  handleOrderFlow,
  type OrderInteraction,
  ORDERING_ENABLED,
} from "@/lib/whatsapp/order-flow";
import {
  parseWhatsAppMessage,
  type ParsedWhatsAppMessage,
} from "@/lib/whatsapp/message-parser";
import { detectWhatsAppIntent } from "@/lib/whatsapp/intent";
import {
  downloadAndStoreWhatsAppMedia,
  type MediaResult,
} from "@/lib/whatsapp/media";
import { getOrderSession } from "@/lib/whatsapp/session";
import { classifyGraphError } from "@/lib/whatsapp/graph-errors";
import { sendOpsAlert } from "@/lib/alerts";
import { getQStashClient } from "@/lib/email/qstash";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedServiceClient: any = null;
function getServiceClient() {
  if (cachedServiceClient) return cachedServiceClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cachedServiceClient = createClient(url, key, {
    global: {
      fetch: (url: RequestInfo | URL, options?: RequestInit) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        return fetch(url, { ...options, signal: controller.signal }).finally(
          () => clearTimeout(timeout),
        );
      },
    },
  });
  return cachedServiceClient;
}

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

const WHATSAPP_OPENAI_MODEL =
  process.env.WHATSAPP_OPENAI_MODEL?.trim() || "gpt-4.1-mini";
const WHATSAPP_API_VERSION =
  process.env.WHATSAPP_API_VERSION?.trim() || "v22.0";
const WHATSAPP_REPLY_TO_ALL =
  (process.env.WHATSAPP_REPLY_TO_ALL?.trim() || "true") !== "false";
const WHATSAPP_AI_ASSISTANT_ENABLED =
  (process.env.WHATSAPP_AI_ASSISTANT_ENABLED?.trim() || "true") !== "false";
const WHATSAPP_RAG_ENABLED =
  (process.env.WHATSAPP_RAG_ENABLED?.trim() || "true") !== "false";
const WHATSAPP_RAG_CONFIDENCE_THRESHOLD =
  Number(process.env.WHATSAPP_RAG_CONFIDENCE_THRESHOLD ?? 0.55) || 0.55;
const WHATSAPP_SESSION_TURNS = Math.max(
  1,
  Number(process.env.WHATSAPP_SESSION_TURNS ?? 4) || 4,
);
const WHATSAPP_STRUCTURED_DATA_ENABLED =
  (process.env.WHATSAPP_STRUCTURED_DATA_ENABLED?.trim() || "true") !== "false";
const WHATSAPP_PROMPT_VERSION = "whatsapp-rag-v2";
const MAX_REPLY_CHARS = 1200;
const MAX_INPUT_CHARS = 3000;

export const config = {
  maxDuration: 60,
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
  secret: string | undefined,
): boolean {
  if (!secret) return false;
  if (!signature) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Burn comparable time before rejecting so length isn't a timing oracle.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

async function readRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function sendWhatsAppMessage(
  to: string,
  message: string,
): Promise<{ metaMessageId?: string } | void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    throw new Error("Missing WhatsApp API configuration.");
  }

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;

  // Error-code-aware: throttles (429/130429) are retried once with a short
  // backoff; auth failures (190/401) page ops because every subsequent send
  // would silently fail until the system-user token is rotated.
  const MAX_ATTEMPTS = 2;

  for (let attempt = 1; ; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let response: Response;
    try {
      response = await fetch(url, {
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
        signal: controller.signal,
      });
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      if ((fetchError as { name?: string })?.name === "AbortError") {
        throw new Error("WhatsApp API timeout (15s)");
      }
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        continue;
      }
      throw fetchError;
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const classified = classifyGraphError(response.status, text);

      if (classified.kind === "auth") {
        void sendOpsAlert({
          key: "whatsapp_token_auth",
          severity: "critical",
          source: "whatsapp_send",
          subject: "WhatsApp access token expired or invalid",
          body:
            `Outbound WhatsApp sends are failing with an auth error (${response.status}).\n` +
            `All automated customer replies will fail until the Meta system-user token is rotated.\n\n` +
            `Details: ${classified.message}`,
          metadata: { status: response.status, graphCode: classified.code },
        });
      }

      if (classified.retryable && attempt < MAX_ATTEMPTS) {
        console.warn(
          `[whatsapp] Throttled (${response.status}), retrying once...`,
        );
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }

      const errorMsg = `WhatsApp send failed (${classified.kind}): ${response.status} ${text.slice(0, 300)}`;
      console.error("[whatsapp]", errorMsg);
      throw new Error(errorMsg);
    }

    let metaMessageId: string | undefined;
    try {
      const result = await response.json().catch(() => null);
      metaMessageId = result?.messages?.[0]?.id;
    } catch {
      // best-effort: don't fail the send just because we couldn't parse the ID
    }

    return { metaMessageId };
  }
}

export function trimReply(message: string) {
  return message
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_REPLY_CHARS);
}

export function formatBulletReply(
  lines: Array<string | false | null | undefined>,
) {
  return trimReply(lines.filter(Boolean).join("\n"));
}

export function buildGuidedFallbackReply(
  settings: AssistantSettings,
  messageText: string,
) {
  const businessName =
    settings.businessName?.trim() || FALLBACK_SETTINGS.businessName;
  const businessHours =
    settings.businessHours?.trim() ||
    settings.workingHours?.trim() ||
    FALLBACK_SETTINGS.businessHours;
  const supportPhone =
    settings.whatsappSupportNumber?.trim() ||
    settings.primaryPhone?.trim() ||
    FALLBACK_SETTINGS.whatsappSupportNumber;
  const orderPhone =
    settings.whatsappOrderNumber?.trim() ||
    settings.whatsappNumber?.trim() ||
    FALLBACK_SETTINGS.whatsappOrderNumber;

  switch (detectWhatsAppIntent(messageText)) {
    case "pricing":
      return formatBulletReply([
        `Hi, thanks for reaching out to ${businessName}.`,
        "- For a confirmed quote, please share the file, material, quantity, and deadline.",
        "- If you have a reference image or sketch, send that too.",
        "- I’ll guide you with the next step once I have those details.",
      ]);
    case "shipping":
      return formatBulletReply([
        `Hi, thanks for reaching out to ${businessName}.`,
        "- For delivery checks, please share the pincode and city.",
        "- If you want a shipping estimate, I can help once I have the destination details.",
      ]);
    case "order":
      return formatBulletReply([
        `Hi, thanks for reaching out to ${businessName}.`,
        "- Please share your order number and the registered phone number.",
        "- I’ll use that to help confirm the latest update.",
        `- If needed, support is also available at ${supportPhone}.`,
      ]);
    case "materials":
      return formatBulletReply([
        `Hi, thanks for reaching out to ${businessName}.`,
        "- Please share the use case, required strength, flexibility, and finish you want.",
        "- If you already know the material, send it and I’ll confirm the best next step.",
      ]);
    case "contact":
      return formatBulletReply([
        `Hi, thanks for reaching out to ${businessName}.`,
        `- Support number: ${supportPhone}.`,
        `- Order updates: ${orderPhone}.`,
        `- Business hours: ${businessHours}.`,
      ]);
    case "greeting":
      return formatBulletReply([
        `Hi, thanks for reaching out to ${businessName}.`,
        "- I can help with quotes, materials, delivery, and support.",
        "- Please share what you need, and I’ll give you the next step.",
      ]);
    default:
      return formatBulletReply([
        `Hi, thanks for reaching out to ${businessName}.`,
        "- I can help with quotes, materials, delivery, and support.",
        "- Please share the file or the exact question so I can give you a confirmed answer.",
      ]);
  }
}

type AssistantSettings = NonNullable<
  Awaited<ReturnType<typeof getCachedBusinessSettings>>
>;

function buildWhatsAppAssistantPrompt(
  settings: AssistantSettings,
  knowledgeContext: string,
  liveData: StructuredDataResult = {
    materials: "",
    products: "",
    orderStatus: "",
    orderResults: [],
    totalMatches: 0,
    materialPrices: [],
    productPrices: [],
  },
) {
  const businessName =
    settings.businessName?.trim() || FALLBACK_SETTINGS.businessName;
  const businessDescription =
    settings.businessDescription?.trim() ||
    FALLBACK_SETTINGS.businessDescription;
  const businessHours =
    settings.businessHours?.trim() ||
    settings.workingHours?.trim() ||
    FALLBACK_SETTINGS.businessHours;
  const supportAvailability =
    settings.supportAvailabilityMessage?.trim() ||
    FALLBACK_SETTINGS.supportAvailabilityMessage;
  const autoReply =
    settings.autoReplyMessage?.trim() || FALLBACK_SETTINGS.autoReplyMessage;
  const supportPhone =
    settings.whatsappSupportNumber?.trim() ||
    settings.primaryPhone?.trim() ||
    FALLBACK_SETTINGS.whatsappSupportNumber;
  const orderPhone =
    settings.whatsappOrderNumber?.trim() ||
    settings.whatsappNumber?.trim() ||
    FALLBACK_SETTINGS.whatsappOrderNumber;

  const liveDataSection: string[] = [];

  if (liveData.materials) {
    liveDataSection.push("[MATERIAL PRICING FROM DATABASE]");
    liveDataSection.push(liveData.materials);
    liveDataSection.push("");
  }

  if (liveData.products) {
    liveDataSection.push("[PRODUCT PRICING FROM DATABASE]");
    liveDataSection.push(liveData.products);
    liveDataSection.push("");
  }

  if (liveData.orderStatus) {
    liveDataSection.push("[ORDER STATUS FROM DATABASE]");
    liveDataSection.push(liveData.orderStatus);
    liveDataSection.push("");
  }

  if (liveData.orderStatus) {
    liveDataSection.push(
      "For order status, ONLY report what is shown in [ORDER STATUS FROM DATABASE]. Never guess or invent order status or IDs.",
    );
  }

  if (liveDataSection.length > 0) {
    liveDataSection.push(
      "STRICT RULE: For prices, materials, and stock status — ONLY use the values above.",
    );
    liveDataSection.push(
      'If the database returned no matching data, say "Let me check and confirm" — never invent prices.',
    );
  }

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
    ...liveDataSection,
    knowledgeContext
      ? `Relevant Flux3D knowledge base:\n${knowledgeContext}`
      : "",
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
};

export async function generateWhatsAppReply(
  messageText: string,
  settings: AssistantSettings,
  knowledgeContext: string,
  history: Array<ChatCompletionMessageParam> = [],
  liveData: StructuredDataResult = {
    materials: "",
    products: "",
    orderStatus: "",
    orderResults: [],
    totalMatches: 0,
    materialPrices: [],
    productPrices: [],
  },
): Promise<GeneratedWhatsAppReply> {
  const client = getOpenAI();
  if (!client) {
    throw new Error("Missing OpenAI API key.");
  }

  const systemPrompt = buildWhatsAppAssistantPrompt(
    settings,
    knowledgeContext,
    liveData,
  );
  const customerMessage = messageText.slice(0, MAX_INPUT_CHARS);

  // Estimate prompt token count (rough: 4 chars ≈ 1 token) and cap max_tokens
  const promptText = [
    systemPrompt,
    ...history.map((m) => m.content ?? ""),
    customerMessage,
  ].join(" ");
  const estimatedPromptTokens = Math.ceil(promptText.length / 4);
  const modelContextLimit = 128000; // gpt-4.1-mini context window
  const maxTokens = Math.min(
    180,
    Math.max(50, modelContextLimit - estimatedPromptTokens - 50),
  );

  const completion = await client.chat.completions.create({
    model: WHATSAPP_OPENAI_MODEL,
    temperature: 0.2,
    max_tokens: maxTokens,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      ...history,
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
  };
}

async function logWhatsAppMessage(
  supabase: ReturnType<typeof getServiceClient>,
  entry: {
    userId: string | null;
    sender: string | null;
    direction: "incoming" | "outgoing";
    messageText: string;
    automated: boolean;
    triggerEvent: string | null;
    responded: boolean;
    responseTimeMinutes: number | null;
    mediaType?: string | null;
    mediaUrl?: string | null;
    mediaFilename?: string | null;
    mediaMimeType?: string | null;
    mediaSizeBytes?: number | null;
    metaMessageId?: string | null;
    status?: string | null;
  },
) {
  if (!supabase) return;

  const { error } = await supabase.rpc(
    "insert_whatsapp_message_if_not_exists",
    {
      p_user_id: entry.userId || null,
      p_sender: entry.sender,
      p_direction: entry.direction,
      p_message_text: entry.messageText || null,
      p_automated: entry.automated,
      p_trigger_event: entry.triggerEvent || null,
      p_responded: entry.responded,
      p_response_time_minutes: entry.responseTimeMinutes || null,
      p_media_type: entry.mediaType || null,
      p_media_url: entry.mediaUrl || null,
      p_media_filename: entry.mediaFilename || null,
      p_media_mime_type: entry.mediaMimeType || null,
      p_media_size_bytes: entry.mediaSizeBytes || null,
      p_meta_message_id: entry.metaMessageId || null,
      p_status: entry.status ?? "sent",
    },
  );

  if (error) {
    console.error("[whatsapp] Failed to log message:", error);
  }
}

function buildRagPayload(rag: {
  mode: string;
  confidence: number;
  sources: Array<{ sourceKey: string; title: string; score: number }>;
}) {
  return {
    enabled: WHATSAPP_RAG_ENABLED,
    mode: rag.mode,
    confidence: rag.confidence,
    sources: rag.sources,
  };
}

export async function saveSession(
  supabase: ReturnType<typeof getServiceClient>,
  from: string,
  userMessage: string,
  assistantReply: string,
) {
  if (!supabase || !from) return;
  try {
    const { error } = await supabase.rpc("save_whatsapp_session", {
      p_phone: from,
      p_user_message: userMessage.slice(0, MAX_INPUT_CHARS),
      p_assistant_reply: assistantReply,
      p_max_turns: WHATSAPP_SESSION_TURNS,
    });
    if (error) {
      console.error("[whatsapp] Failed to save session:", error);
    }
  } catch (error) {
    console.error("[whatsapp] Failed to save session:", error);
  }
}

const MAX_PAYLOAD_BYTES = 102_400; // 100KB

function truncatePayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const serialized = JSON.stringify(payload);
  if (serialized.length <= MAX_PAYLOAD_BYTES) return payload;
  // Truncate to 100KB by cutting the string and ensuring valid JSON
  const truncated =
    serialized.slice(0, MAX_PAYLOAD_BYTES - 50) + ',"_truncated":true}';
  try {
    return JSON.parse(truncated);
  } catch {
    return { _truncated: true };
  }
}

async function insertWebhookEvent(
  supabase: ReturnType<typeof getServiceClient>,
  payloadHash: string,
  payload: Record<string, unknown>,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string } | { duplicate: true } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("whatsapp_webhook_events")
    .insert({
      payload_hash: payloadHash,
      sender: null,
      payload: truncatePayload(payload),
      signature_verified: true,
      received_at: new Date().toISOString(),
      ...overrides,
    })
    .select("id")
    .maybeSingle();
  if (error) {
    // Unique violation on payload_hash: a concurrent Meta retry already
    // inserted this exact payload. Report it so the caller does NOT fall back
    // to inline processing — the winning request is already handling it.
    if ((error as { code?: string }).code === "23505") {
      console.log("[whatsapp] Concurrent duplicate webhook payload, skipping");
      return { duplicate: true };
    }
    console.error("[whatsapp] DB insert error:", error);
  }
  return data ?? null;
}

/**
 * Enqueue message processing to the QStash queue. The worker at
 * /api/whatsapp/process runs processIncomingMessage with full
 * maxDuration (300s) and automatic retries — the async-after-200
 * pattern on Vercel is unreliable (functions can be terminated
 * seconds after the response is sent).
 *
 * Returns true if the job was queued. Never throws.
 */
async function enqueueWhatsAppProcessing(
  eventId: string | null,
): Promise<boolean> {
  if (!eventId) return false;
  try {
    const qstash = getQStashClient();
    const baseUrl = (
      process.env.NEXT_PUBLIC_SITE_URL || "https://flux3d.in"
    ).replace(/\/+$/, "");
    await Promise.race([
      qstash.publishJSON({
        url: `${baseUrl}/api/whatsapp/process`,
        body: { eventId },
        retries: 5,
        timeout: 120,
        headers: { "X-WhatsApp-Event": eventId },
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("QStash enqueue timeout (4s)")),
          4000,
        ),
      ),
    ]);
    return true;
  } catch (error) {
    console.error(
      "[whatsapp] QStash enqueue failed, falling back to inline processing:",
      error,
    );
    return false;
  }
}

type IncomingMessageParams = {
  supabase: ReturnType<typeof getServiceClient>;
  payloadHash: string;
  payload: Record<string, unknown>;
  from: string;
  text: string;
  interaction?: OrderInteraction | null;
  eventRecord: { id: string } | null;
  requestStartedAt: number;
};

export async function processIncomingMessage(params: IncomingMessageParams) {
  const {
    supabase,
    payloadHash,
    payload,
    from,
    text,
    interaction = null,
    eventRecord,
    requestStartedAt,
  } = params;

  const processingSpan = Sentry.startInactiveSpan({
    op: "whatsapp.process",
    name: `msg from ${from?.slice(-4)}`,
  });

  const _log = (step: string) => {
    console.log("[whatsapp] PROC", from?.slice(-4), step);
    // Write progress to DB (non-blocking, won't hang the pipeline)
    if (eventRecord?.id && supabase) {
      Promise.race([
        supabase
          .from("whatsapp_webhook_events")
          .update({ error: step.slice(0, 200) })
          .eq("id", eventRecord.id),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ])
        .catch(() => {})
        .then(() => {});
    }
  };
  _log("START text=" + text?.slice(0, 30));

  // ── Inbound media enrichment (best-effort, bounded by download timeouts) ──
  // Re-derives media metadata from the raw webhook payload (works for both the
  // inline-processing and QStash worker paths) and stores the file to Supabase
  // Storage so admins can preview/download customer attachments in the inbox.
  let inboundMedia: MediaResult | null = null;
  let inboundMediaType: ParsedWhatsAppMessage["mediaType"] = null;
  let inboundMetaMessageId: string | null = null;
  if (supabase) {
    try {
      const rawPayloadMessage = (
        payload as {
          entry?: Array<{
            changes?: Array<{
              value?: { messages?: Array<Record<string, unknown>> };
            }>;
          }>;
        }
      )?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      const parsedMedia = parseWhatsAppMessage(rawPayloadMessage);
      inboundMediaType = parsedMedia.mediaType ?? null;
      inboundMetaMessageId = parsedMedia.metaMessageId ?? null;
      if (parsedMedia.mediaId && parsedMedia.mediaType) {
        inboundMedia = await downloadAndStoreWhatsAppMedia(
          parsedMedia.mediaId,
          parsedMedia.mediaMimeType ?? undefined,
          parsedMedia.mediaFilename ?? undefined,
        ).catch(() => null);
      }
    } catch (error) {
      console.error("[whatsapp] Inbound media enrichment failed:", error);
    }
  }

  try {
    // Sender allow-list: only reply if sender phone exists in profiles
    let senderRecognized = false;
    let userId: string | null = null;
    if (supabase) {
      try {
        _log("profile_lookup");
        const profilePromise = supabase
          .from("profiles")
          .select("id")
          .eq("phone_number", from)
          .maybeSingle();
        const profileTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Profile lookup timeout")), 5000),
        );
        const { data: profile } = (await Promise.race([
          profilePromise,
          profileTimeout,
        ])) as { data: Record<string, unknown> | null };
        senderRecognized = !!profile;
        userId = (profile?.id as string | undefined) ?? null;
      } catch (error) {
        console.error("[whatsapp] Failed to lookup profile:", error);
      }
    }
    _log("profile_done recognized=" + senderRecognized);

    // ── Log incoming message BEFORE any early-return paths ──
    // This ensures every customer message is stored in the whatsapp_messages
    // table, even if it gets consumed by the account-link flow, order flow,
    // out-of-scope handler, or unsupported-media handler below.
    await logWhatsAppMessage(supabase, {
      userId,
      sender: from,
      direction: "incoming",
      messageText: text,
      automated: false,
      triggerEvent: "incoming_whatsapp_message",
      responded: WHATSAPP_REPLY_TO_ALL || senderRecognized,
      responseTimeMinutes: null,
      mediaType: inboundMedia?.mediaType ?? inboundMediaType,
      mediaUrl: inboundMedia?.url,
      mediaFilename: inboundMedia?.filename,
      mediaMimeType: inboundMedia?.mimeType,
      mediaSizeBytes: inboundMedia?.sizeBytes,
      metaMessageId: inboundMetaMessageId,
    });

    // ── Conversational Components Interceptor ──
    // Intercept explicit commands and ice breakers
    if (text) {
      let interceptReply: string | null = null;
      const cmdMatch = text.match(/^\/([a-z0-9_-]+)/i);

      if (cmdMatch) {
        const command = cmdMatch[1].toLowerCase();
        switch (command) {
          case "quote":
            interceptReply =
              "To get a price estimate, please share your 3D file (.STL, .STEP, or .OBJ), preferred material, and quantity.";
            break;
          case "status":
            interceptReply =
              "To check your order status, please reply with your Order ID (e.g. ORD-1234) or your registered email address.";
            break;
          case "materials":
            interceptReply =
              "We offer a wide range of materials including PLA, ABS, PETG, TPU, and various Resins. Do you have a specific use case in mind?";
            break;
          case "support":
            interceptReply = `A human support agent will be with you shortly. You can also reach us directly at ${FALLBACK_SETTINGS.whatsappSupportNumber}.`;
            break;
          default:
            interceptReply = `I didn't recognize the command /${command}. Try /quote, /status, /materials, or /support.`;
        }
      } else if (text === "Get a 3D printing quote") {
        interceptReply =
          "To get a price estimate, please share your 3D file (.STL, .STEP, or .OBJ), preferred material, and quantity.";
      } else if (text === "Check order status") {
        interceptReply =
          "To check your order status, please reply with your Order ID (e.g. ORD-1234) or your registered email address.";
      } else if (text === "What materials do you offer?") {
        interceptReply =
          "We offer a wide range of materials including PLA, ABS, PETG, TPU, and various Resins. Do you have a specific use case in mind?";
      }

      if (interceptReply) {
        _log("intercepted_command");
        await sendWhatsAppMessage(from, interceptReply).catch(() => {});

        await logWhatsAppMessage(supabase, {
          userId,
          sender: from,
          direction: "outgoing",
          messageText: interceptReply,
          automated: true,
          triggerEvent: "automated_command_reply",
          responded: true,
          responseTimeMinutes: 0,
        });

        if (supabase && eventRecord?.id) {
          try {
            await supabase
              .from("whatsapp_webhook_events")
              .update({
                processed_at: new Date().toISOString(),
                reply_sent: true,
              })
              .eq("id", eventRecord.id);
          } catch {
            // best-effort marking
          }
        }
        return;
      }
    }
    // ── WhatsApp account linking flow (Direction A) ──
    // Runs before the ordering state machine so a link flow never collides
    // with it. Returns true (and the webhook returns) only when the message
    // was consumed by the linking flow — i.e. an explicit link intent, or a
    // reply while a WhatsApp-initiated link request is pending for this phone.
    let linkHandled = false;
    try {
      linkHandled = await handleAccountLinkWhatsApp({
        from,
        text,
        supabase,
        userId,
      });
    } catch (error) {
      console.error("[whatsapp] Account link flow error:", error);
    }
    if (linkHandled) {
      if (supabase && eventRecord?.id) {
        try {
          await supabase
            .from("whatsapp_webhook_events")
            .update({
              processed_at: new Date().toISOString(),
              reply_sent: true,
            })
            .eq("id", eventRecord.id);
        } catch {
          // best-effort marking
        }
      }
      return;
    }

    // ── WhatsApp ordering flow (runs before the AI assistant) ──
    if (ORDERING_ENABLED) {
      try {
        const orderResult = await handleOrderFlow({
          phone: from,
          userId,
          interaction,
          text,
          profileName: null,
        }).catch((error) => {
          console.error("[whatsapp] Order flow error:", error);
          return { handled: false };
        });

        if (orderResult.handled) {
          _log("order_flow_handled");
          if (supabase && eventRecord?.id) {
            try {
              await supabase
                .from("whatsapp_webhook_events")
                .update({
                  processed_at: new Date().toISOString(),
                  reply_sent: true,
                })
                .eq("id", eventRecord.id);
            } catch {
              // best-effort marking
            }
          }
          return;
        }
      } catch (error) {
        console.error(
          "[whatsapp] Order flow failed, falling back to assistant:",
          error,
        );
      }
    }

    // Load conversation history for context-aware replies
    let sessionHistory: Array<ChatCompletionMessageParam> = [];
    if (supabase) {
      try {
        const sessionPromise = supabase
          .from("whatsapp_sessions")
          .select("messages")
          .eq("phone_number", from)
          .maybeSingle();
        const sessionTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Session load timeout")), 5000),
        );
        const { data: session } = (await Promise.race([
          sessionPromise,
          sessionTimeout,
        ])) as { data: Record<string, unknown> | null };
        if (session?.messages && Array.isArray(session.messages)) {
          sessionHistory = (session.messages as Array<Record<string, unknown>>)
            .filter(
              (m) =>
                typeof m === "object" &&
                m !== null &&
                typeof m.role === "string" &&
                (m.role === "user" || m.role === "assistant") &&
                typeof m.content === "string",
            )
            .slice(
              -(WHATSAPP_SESSION_TURNS * 2),
            ) as unknown as Array<ChatCompletionMessageParam>;
        }
      } catch (error) {
        console.error(
          "[whatsapp] Failed to load session, continuing with empty history:",
          error,
        );
      }
    }

    _log("session_done");
    const businessSettings =
      (await getCachedBusinessSettings()) || FALLBACK_SETTINGS;
    _log("settings_done");
    let knowledgeContext = "";
    let ragMode: "database" | "seed" | "none" = "none";
    let ragConfidence = 0;
    let ragSources: Array<{
      sourceKey: string;
      title: string;
      score: number;
      content: string;
    }> = [];
    let retrievalLatencyMs: number | null = null;
    _log("rag_start");
    if (WHATSAPP_AI_ASSISTANT_ENABLED && WHATSAPP_RAG_ENABLED) {
      const retrievalStartedAt = Date.now();
      const rag = await getWhatsAppRagContext(text).catch((error) => {
        console.error("[whatsapp] RAG lookup error:", error);
        return {
          context: "",
          sources: [] as Array<{
            sourceKey: string;
            title: string;
            score: number;
            content: string;
          }>,
          mode: "none" as const,
          confidence: 0,
        };
      });
      retrievalLatencyMs = Date.now() - retrievalStartedAt;
      knowledgeContext = rag.context;
      ragMode = rag.mode;
      ragConfidence = rag.confidence;
      ragSources = rag.sources;
    }
    _log("rag_done conf=" + ragConfidence);

    // Intent classification: use regex for unambiguous intents (saves GPT call)
    const regexIntent = detectWhatsAppIntent(text);
    const skipGptClassifier =
      !WHATSAPP_AI_ASSISTANT_ENABLED ||
      regexIntent === "greeting" ||
      regexIntent === "contact";
    const [classified] = skipGptClassifier
      ? [{ intent: regexIntent, keywords: [] as string[] }]
      : await Promise.all([
          classifyIntent(text).catch(() => ({
            intent: "general" as const,
            keywords: [] as string[],
          })),
        ]);

    // Declare state variables early (used by both out_of_scope and normal flow)
    let didSendReply = false;
    let replySendFailed = false;
    let finalReply = "";
    let finalReplyKind: "model" | "fallback" | "error" = "fallback";
    let fallbackReason: string | null = null;
    let generatedReply: GeneratedWhatsAppReply | null = null;
    let generationLatencyMs: number | null = null;
    let auditRecord: WhatsAppRagAuditRecord | null = null;
    let structuredData: StructuredDataResult = {
      materials: "",
      products: "",
      orderStatus: "",
      orderResults: [],
      totalMatches: 0,
      materialPrices: [],
      productPrices: [],
    };

    // Handle out-of-scope messages immediately — no RAG, no GPT, no structured data
    if (classified.intent === "out_of_scope") {
      finalReply = formatBulletReply([
        `Hi, thanks for reaching out.`,
        `I can only assist with 3D printing and custom manufacturing questions.`,
        `Please let me know if you have a 3D printing-related query.`,
      ]);
      finalReplyKind = "fallback";
      fallbackReason = "out_of_scope";
      auditRecord = {
        webhook_event_id: eventRecord?.id ?? null,
        sender: from,
        user_id: userId,
        question_text: text,
        retrieval_mode: "none",
        retrieval_confidence: 0,
        retrieval_sources: [],
        response_kind: "fallback",
        response_text: finalReply,
        response_metadata: {
          model: WHATSAPP_OPENAI_MODEL,
          promptTokens: null,
          completionTokens: null,
          totalTokens: null,
          finishReason: null,
          replyToAll: WHATSAPP_REPLY_TO_ALL,
          senderRecognized,
          sendStatus: "pending",
          classifiedIntent: "out_of_scope",
        },
        fallback_reason: "out_of_scope",
        model_name: null,
        prompt_version: WHATSAPP_PROMPT_VERSION,
        latency_ms: null,
        retrieval_latency_ms: null,
        generation_latency_ms: null,
        session_history_length: sessionHistory.length,
        structured_data_matches: 0,
      };
      // Send out_of_scope reply and finish
      try {
        const sendResult = await sendWhatsAppMessage(from, finalReply);
        didSendReply = true;
        auditRecord.response_metadata = {
          ...auditRecord.response_metadata,
          sendStatus: "sent",
        };
        // Log the outgoing bot reply so it appears in the admin inbox
        if (sendResult?.metaMessageId) {
          await logWhatsAppMessage(supabase, {
            userId,
            sender: from,
            direction: "outgoing",
            messageText: finalReply,
            automated: true,
            triggerEvent: "out_of_scope_reply",
            responded: true,
            responseTimeMinutes: (Date.now() - requestStartedAt) / 60000,
            metaMessageId: sendResult.metaMessageId,
          });
        } else {
          await logWhatsAppMessage(supabase, {
            userId,
            sender: from,
            direction: "outgoing",
            messageText: finalReply,
            automated: true,
            triggerEvent: "out_of_scope_reply",
            responded: true,
            responseTimeMinutes: (Date.now() - requestStartedAt) / 60000,
          });
        }
      } catch (error) {
        auditRecord.response_metadata = {
          ...auditRecord.response_metadata,
          sendStatus: "failed",
        };
        console.error("[whatsapp] Failed to send out_of_scope reply:", error);
      } finally {
        auditRecord.latency_ms = Date.now() - requestStartedAt;
        await logWhatsAppRagAudit(auditRecord).catch(() => {});
      }
      // Mark event as processed (no structured data to attach). If the send
      // failed, leave unprocessed and register for the retry cron instead.
      if (supabase && eventRecord?.id) {
        try {
          if (!didSendReply) {
            await supabase.rpc("increment_webhook_retry", {
              p_event_id: eventRecord.id,
              p_error:
                "out_of_scope reply send failed (transient) — queued for retry",
            });
          } else {
            await supabase
              .from("whatsapp_webhook_events")
              .update({
                processed_at: new Date().toISOString(),
                reply_sent: true,
                payload: { ...payload, classifiedIntent: "out_of_scope" },
              })
              .eq("id", eventRecord.id);
          }
        } catch {
          // Best-effort: event stays unprocessed but WhatsApp won't retry (200 already sent)
        }
      }
      return;
    }

    _log("intent=" + classified.intent);

    // Merge GPT keywords with regex-extracted keywords (deduped)
    const gptKeywords = classified.keywords;
    const regexKeywords = extractSearchKeywords(text);
    const combinedKeywords = [...new Set([...gptKeywords, ...regexKeywords])];

    // Query live database for structured data using combined keywords
    if (
      WHATSAPP_AI_ASSISTANT_ENABLED &&
      WHATSAPP_STRUCTURED_DATA_ENABLED &&
      supabase &&
      combinedKeywords.length > 0
    ) {
      structuredData = await fetchStructuredData(
        combinedKeywords,
        classified.intent,
        from,
      ).catch((error) => {
        console.error("[whatsapp] Structured data query failed:", error);
        return {
          materials: "",
          products: "",
          orderStatus: "",
          orderResults: [],
          totalMatches: 0,
          materialPrices: [],
          productPrices: [],
        };
      });
    }

    _log("evaluate_model");
    // Use AI model when there's grounded data to work with:
    // RAG context above threshold, OR live structured data from DB
    const hasGroundedRag =
      Boolean(knowledgeContext) &&
      ragConfidence >= WHATSAPP_RAG_CONFIDENCE_THRESHOLD;
    const hasLiveData = structuredData.totalMatches > 0;
    const shouldUseModel =
      WHATSAPP_AI_ASSISTANT_ENABLED &&
      (WHATSAPP_REPLY_TO_ALL || senderRecognized) &&
      (hasGroundedRag || hasLiveData);
    _log(
      "use_model=" +
        shouldUseModel +
        " rag=" +
        hasGroundedRag +
        " live=" +
        hasLiveData,
    );

    if (shouldUseModel) {
      const generationStartedAt = Date.now();
      generatedReply = await generateWhatsAppReply(
        text,
        businessSettings,
        knowledgeContext,
        sessionHistory,
        structuredData,
      ).catch((error) => {
        console.error("[whatsapp] OpenAI reply error:", error);
        fallbackReason = "openai_error";
        return null;
      });
      generationLatencyMs = Date.now() - generationStartedAt;
    }

    if (generatedReply) {
      finalReply = generatedReply.reply;
      finalReplyKind = "model";
    } else {
      finalReply = buildGuidedFallbackReply(businessSettings, text);
      finalReplyKind = "fallback";
      fallbackReason =
        fallbackReason ??
        (WHATSAPP_RAG_ENABLED
          ? shouldUseModel
            ? "model_generation_failed"
            : "low_confidence"
          : "rag_disabled");
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
        sendStatus: "pending",
      },
      fallback_reason: fallbackReason,
      model_name:
        generatedReply?.model ??
        (shouldUseModel ? WHATSAPP_OPENAI_MODEL : null),
      prompt_version: WHATSAPP_PROMPT_VERSION,
      latency_ms: null,
      retrieval_latency_ms: retrievalLatencyMs,
      generation_latency_ms: generationLatencyMs,
      session_history_length: sessionHistory.length,
      structured_data_matches: structuredData.totalMatches,
    };

    // Validate prices in GPT response against live DB data
    let validationResult: ValidationResult | null = null;
    if (finalReplyKind === "model" && structuredData.totalMatches > 0) {
      const knownPrices = [
        ...structuredData.materialPrices,
        ...structuredData.productPrices,
      ];
      if (knownPrices.length > 0) {
        validationResult = await validatePricesInResponse(
          finalReply,
          knownPrices,
        );
        if (!validationResult.valid) {
          const originalReply = finalReply;
          finalReply = validationResult.safeResponse;
          auditRecord.response_text = finalReply;
          auditRecord.fallback_reason = "price_hallucination";
          auditRecord.response_metadata = {
            ...auditRecord.response_metadata,
            validationValid: false,
            mentionedPrices: validationResult.mentionedPrices,
            hallucinatedPrices: validationResult.hallucinatedPrices,
            originalResponseText: originalReply,
          };
        } else {
          auditRecord.response_metadata = {
            ...auditRecord.response_metadata,
            validationValid: true,
            mentionedPrices: validationResult.mentionedPrices,
          };
        }
      }
    }

    _log("before_send kind=" + finalReplyKind);
    try {
      _log("calling_send");
      const sendResult = await sendWhatsAppMessage(from, finalReply);
      _log("send_success");
      didSendReply = true;
      auditRecord.response_metadata = {
        ...auditRecord.response_metadata,
        sendStatus: "sent",
      };

      // Non-blocking post-send operations (don't delay the reply)
      await logWhatsAppMessage(supabase, {
        userId,
        sender: from,
        direction: "outgoing",
        messageText: finalReply,
        automated: true,
        triggerEvent: "openai_reply",
        responded: true,
        responseTimeMinutes: (Date.now() - requestStartedAt) / 60000,
        metaMessageId: sendResult?.metaMessageId ?? null,
      });

      await saveSession(supabase, from, text, finalReply);

      if (supabase && userId) {
        supabase
          .from("profiles")
          .select("whatsapp_messages_sent")
          .eq("id", userId)
          .maybeSingle()
          .then(
            ({
              data: profileRow,
            }: {
              data: Record<string, unknown> | null;
            }) => {
              const nextCount =
                Number(profileRow?.whatsapp_messages_sent ?? 0) + 1;
              supabase
                .from("profiles")
                .update({ whatsapp_messages_sent: nextCount })
                .eq("id", userId)
                .then()
                .catch(() => {});
            },
          )
          .catch(() => {});
      }
    } catch (error) {
      auditRecord.response_kind = "error";
      auditRecord.fallback_reason =
        auditRecord.fallback_reason ?? "send_failed";
      auditRecord.response_metadata = {
        ...auditRecord.response_metadata,
        sendStatus: "failed",
      };
      replySendFailed = true;
      // Save session even on send failure so context isn't lost
      await saveSession(supabase, from, text, finalReply);
      console.error(
        "[whatsapp] Failed to send outbound WhatsApp message:",
        error,
      );
    } finally {
      auditRecord.latency_ms = Date.now() - requestStartedAt;
      logWhatsAppRagAudit(auditRecord).catch((error) => {
        console.error("[whatsapp] Failed to log RAG audit:", error);
      });
    }

    _log("END replied=" + didSendReply + " kind=" + finalReplyKind);

    // Mark as processed (fire-and-forget to avoid blocking). If the reply send
    // failed, leave the event UNPROCESSED and register it for the retry cron —
    // otherwise the customer never gets an answer and nothing retries it.
    if (supabase && eventRecord?.id) {
      if (replySendFailed && !didSendReply) {
        supabase
          .rpc("increment_webhook_retry", {
            p_event_id: eventRecord.id,
            p_error: "reply send failed (transient) — queued for retry",
          })
          .then()
          .catch((e: unknown) =>
            console.error("[whatsapp] Failed to record retry info:", e),
          );
      } else {
        supabase
          .from("whatsapp_webhook_events")
          .update({
            processed_at: new Date().toISOString(),
            reply_sent: didSendReply,
            payload: {
              ...payload,
              rag: buildRagPayload({
                mode: ragMode,
                confidence: ragConfidence,
                sources: ragSources.map(({ sourceKey, title, score }) => ({
                  sourceKey,
                  title,
                  score,
                })),
              }),
            },
          })
          .eq("id", eventRecord.id)
          .then()
          .catch((e: unknown) =>
            console.error("[whatsapp] Failed to mark processed:", e),
          );
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[whatsapp] Async processing error:", errorMessage);

    Sentry.withScope((scope) => {
      scope.setTag("handler", "processIncomingMessage");
      scope.setExtra("sender", from);
      scope.setExtra("eventId", eventRecord?.id);
      scope.setExtra("text", text?.slice(0, 200));
      Sentry.captureException(error);
    });

    // Record failure for retry queue
    if (supabase && eventRecord?.id) {
      try {
        await supabase.rpc("increment_webhook_retry", {
          p_event_id: eventRecord.id,
          p_error: errorMessage.slice(0, 1000),
        });
        // Also write to the visible 'error' column for easy debugging
        await supabase
          .from("whatsapp_webhook_events")
          .update({
            error: errorMessage.slice(0, 2000),
          })
          .eq("id", eventRecord.id);
      } catch (dbError) {
        console.error("[whatsapp] Failed to record retry info:", dbError);
      }
    }
  } finally {
    processingSpan?.end();
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
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

    if (
      mode === "subscribe" &&
      timingSafeStringEqual(token ?? "", verifyToken)
    ) {
      return res.status(200).send(challenge ?? "");
    }

    return res.status(403).send("Verification failed");
  }

  // WHATSAPP MESSAGE RECEIVED
  if (req.method === "POST") {
    // Validate all environment variables at runtime — fails fast on misconfiguration
    try {
      getEnv();
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: e instanceof Error ? e.message : "Configuration error",
      });
    }

    const webhookSpan = Sentry.startInactiveSpan({
      op: "whatsapp.webhook",
      name: "POST /api/whatsapp",
    });

    try {
      const rawBody = await readRawBody(req);
      const signature = first(req.headers["x-hub-signature-256"]);
      const secret = process.env.WHATSAPP_WEBHOOK_SECRET;

      if (!verifyMetaSignature(rawBody, signature, secret)) {
        return res.status(403).send("Invalid signature");
      }

      const ipLimit = await rateLimitCheck(
        `whatsapp:${getClientIp(req)}`,
        60,
        20,
      );
      if (!ipLimit.success) {
        return res
          .status(429)
          .json({ success: false, error: "Too many requests" });
      }

      const payloadHash = crypto
        .createHash("sha256")
        .update(rawBody, "utf8")
        .digest("hex");
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let payload: any;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return res.status(200).json({ success: true });
      }

      // Template lifecycle events (message_template_status_update subscription):
      // log approval/rejection/pause so ops can see them in Vercel logs. The raw
      // event is still persisted to whatsapp_webhook_events by the generic path below.
      const webhookField = payload?.entry?.[0]?.changes?.[0]?.field;
      if (webhookField === "message_template_status_update") {
        const tv = payload?.entry?.[0]?.changes?.[0]?.value ?? {};
        console.log(
          "[whatsapp] template status update:",
          tv.message_template_name,
          "->",
          tv.event,
          tv.reason ? `(${tv.reason})` : "",
        );
      }

      const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      const from = message?.from;
      const msgType = message?.type;

      // Handle delivery/read status updates pushed by Meta (may arrive with or
      // without a message in the same payload). Matches on the WhatsApp
      // Message ID (wamid) stored as meta_message_id.
      const statuses = payload?.entry?.[0]?.changes?.[0]?.value
        ?.statuses as unknown as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(statuses) && statuses.length > 0 && supabase) {
        for (const st of statuses) {
          const wamid = typeof st?.id === "string" ? st.id : null;
          const sStatus = typeof st?.status === "string" ? st.status : null;
          if (
            !wamid ||
            !sStatus ||
            !["sent", "delivered", "read", "failed"].includes(sStatus)
          )
            continue;
          const update: Record<string, unknown> = { status: sStatus };
          if (sStatus === "failed") {
            const errInfo = st?.errors as
              Array<Record<string, unknown>> | undefined;
            update.status_error = String(
              errInfo?.[0]?.title ?? "delivery failed",
            );
          }
          // NOTE: postgrest-js 2.x builders implement .then but NOT .catch —
          // chaining .catch() directly on the builder throws TypeError.
          // Await inside try/catch instead.
          try {
            await supabase
              .from("whatsapp_messages")
              .update(update)
              .eq("meta_message_id", wamid);
          } catch (error) {
            console.error("[whatsapp] Failed to update message status:", error);
          }
        }
        await insertWebhookEvent(supabase, payloadHash, payload, {
          sender: null,
          processed_at: new Date().toISOString(),
        }).catch(() => {});
        // Status-only events have no message body — nothing else to process
        if (!message || !from) return res.status(200).json({ success: true });
      }

      // Extract text/interaction from supported message types (shared with the retry cron)
      const {
        text: parsedText,
        mediaInfo: parsedMedia,
        interaction: parsedInteraction,
      } = parseWhatsAppMessage(message);
      let text: string | undefined = parsedText;
      const mediaInfo: string | null = parsedMedia;
      const interaction: OrderInteraction | null = parsedInteraction;

      if (!message || !from) {
        await insertWebhookEvent(supabase, payloadHash, payload, {
          sender: from ?? null,
          processed_at: new Date().toISOString(),
        }).catch(() => {});
        return res.status(200).json({ success: true });
      }

      // Handle unsupported media types (audio, video, sticker) with a direct reply
      if (
        msgType &&
        msgType !== "text" &&
        msgType !== "image" &&
        msgType !== "document" &&
        !text
      ) {
        const mediaReply = `Thanks for your ${msgType}. I can only assist with text, images, and documents. Please describe what you need in text.`;
        await insertWebhookEvent(supabase, payloadHash, payload, {
          sender: from,
          processed_at: new Date().toISOString(),
        }).catch(() => {});

        // Look up profile for userId (best-effort, 2s timeout)
        let mediaUserId: string | null = null;
        try {
          const { data: mediaProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("phone_number", from)
            .maybeSingle();
          mediaUserId = mediaProfile?.id ?? null;
        } catch {
          /* ignore */
        }

        // Log the incoming media message so it appears in the admin inbox
        const parsedMedia = parseWhatsAppMessage(message);
        await logWhatsAppMessage(supabase, {
          userId: mediaUserId,
          sender: from,
          direction: "incoming",
          messageText: `[${parsedMedia.mediaType ?? msgType}]`,
          automated: false,
          triggerEvent: "incoming_whatsapp_message",
          responded: true,
          responseTimeMinutes: null,
          mediaType: parsedMedia.mediaType ?? msgType,
          mediaFilename: parsedMedia.mediaFilename ?? null,
          mediaMimeType: parsedMedia.mediaMimeType ?? null,
          metaMessageId: parsedMedia.metaMessageId ?? null,
        });

        try {
          const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
          const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
          if (phoneNumberId && accessToken) {
            const apiVersion = process.env.WHATSAPP_API_VERSION || "v22.0";
            const mediaController = new AbortController();
            const mediaTimeout = setTimeout(
              () => mediaController.abort(),
              10000,
            );
            const mediaResponse = await fetch(
              `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  to: from,
                  type: "text",
                  text: { body: mediaReply },
                }),
                signal: mediaController.signal,
              },
            ).finally(() => clearTimeout(mediaTimeout));

            // Log the outgoing reply so it appears in the admin inbox
            let mediaReplyId: string | undefined;
            try {
              const mediaResult = await mediaResponse.json().catch(() => null);
              mediaReplyId = mediaResult?.messages?.[0]?.id;
            } catch {
              /* best-effort */
            }
            await logWhatsAppMessage(supabase, {
              userId: mediaUserId,
              sender: from,
              direction: "outgoing",
              messageText: mediaReply,
              automated: true,
              triggerEvent: "unsupported_media_reply",
              responded: true,
              responseTimeMinutes: null,
              metaMessageId: mediaReplyId ?? null,
            });
          }
        } catch {
          /* best-effort */
        }
        return res.status(200).json({ success: true });
      }

      // Media without caption — use guided fallback
      if (mediaInfo && !text) {
        // Store the event with media info, then process as a guided reply
        text = mediaInfo;
      }

      // Fallback if no text or interaction could be extracted (shouldn't reach here)
      if ((!text || typeof text !== "string") && !interaction) {
        await insertWebhookEvent(supabase, payloadHash, payload, {
          sender: from,
          processed_at: new Date().toISOString(),
        }).catch(() => {});
        return res.status(200).json({ success: true });
      }

      // Phone-based rate limit
      const phoneLimit = await rateLimitCheck(`whatsapp_phone:${from}`, 60, 10);
      if (!phoneLimit.success) {
        return res.status(429).json({
          success: false,
          error: "Too many messages. Please wait before sending another.",
        });
      }

      // Write the event record immediately (worker will use this ID)
      const eventRecord = await insertWebhookEvent(
        supabase,
        payloadHash,
        payload,
        { sender: from },
      ).catch(() => null);

      // A concurrent Meta retry already claimed this exact payload — the winner
      // is processing (or has processed) it. Short-circuit here instead of
      // falling through to inline processing, which would double-reply.
      if (eventRecord && "duplicate" in eventRecord) {
        return res.status(200).json({ success: true, duplicate: true });
      }

      // Enqueue processing to the QStash queue BEFORE responding, so the job
      // is durable even if the function is terminated right after the 200.
      const queued = await enqueueWhatsAppProcessing(eventRecord?.id ?? null);

      // If QStash was unreachable, process inline BEFORE returning 200.
      // Background work after the 200 is killed seconds later on Hobby plans,
      // so doing this synchronously is the only reliable fallback. The
      // order/guided-fallback paths are fast (<~3s) and fit within the
      // function duration limit. The queue remains the primary path.
      if (!queued && eventRecord?.id) {
        const requestStartedAt = Date.now();
        const workKey = `webhook-${payloadHash.slice(0, 12)}`;
        const workPromise = processIncomingMessage({
          supabase,
          payloadHash,
          payload,
          from,
          text: text!,
          interaction,
          eventRecord,
          requestStartedAt,
        })
          .catch((error) => {
            console.error("[whatsapp] Async processing failed:", error);
            Sentry.captureException(error, {
              tags: { handler: "webhook_async" },
              extra: { sender: from },
            });
          })
          .finally(() => {
            pendingWorkMap.delete(workKey);
          });
        pendingWorkMap.set(workKey, workPromise);

        // WhatsApp allows ~20s for the 200 ack; our Hobby cap is 10s, so bound
        // the inline fallback well under that.
        const PROCESSING_TIMEOUT_MS = 6_000;
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Processing timeout (6s)")),
            PROCESSING_TIMEOUT_MS,
          ),
        );
        try {
          await Promise.race([workPromise, timeoutPromise]);
        } catch (processingError) {
          const errMsg =
            processingError instanceof Error
              ? processingError.message
              : String(processingError);
          console.error("[whatsapp] Processing timed out or failed:", errMsg);
          Sentry.captureException(processingError, {
            tags: { handler: "processing_timeout" },
            extra: { sender: from },
          });
          // Mark event as failed so it's visible in the database
          if (supabase && eventRecord?.id) {
            try {
              await supabase
                .from("whatsapp_webhook_events")
                .update({
                  error: errMsg.slice(0, 500),
                })
                .eq("id", eventRecord.id);
            } catch {
              // best-effort marking
            }
          }
        }
      }

      // Quick acknowledgment for plain-text messages, sent only when the
      // worker will also follow up (queue path). When we processed inline
      // above the reply already went out, so we don't double up.
      // Sent BEFORE the 200: post-response execution is killed seconds later
      // on serverless, making the old after-response placement best-effort at
      // best. Bounded to 4s so Meta's ~20s ack window is never at risk.
      if (!interaction && queued) {
        const hasOrderSession = await getOrderSession(from ?? "").catch(
          () => null,
        );
        if (!hasOrderSession) {
          const ackReply = `👍 Got your message! Processing...`;
          try {
            const ackController = new AbortController();
            const ackTimeout = setTimeout(() => ackController.abort(), 4000);
            const ackResponse = await fetch(
              `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  to: from,
                  type: "text",
                  text: { body: ackReply },
                }),
                signal: ackController.signal,
              },
            ).finally(() => clearTimeout(ackTimeout));
            console.log("[whatsapp] ACK sent to", from?.slice(-4));

            // Log the ACK so it appears in the admin inbox alongside the customer's message
            let ackMessageId: string | undefined;
            try {
              const ackResult = await ackResponse.json().catch(() => null);
              ackMessageId = ackResult?.messages?.[0]?.id;
            } catch {
              /* best-effort */
            }
            await logWhatsAppMessage(supabase, {
              userId: null,
              sender: from,
              direction: "outgoing",
              messageText: ackReply,
              automated: true,
              triggerEvent: "whatsapp_ack",
              responded: true,
              responseTimeMinutes: null,
              metaMessageId: ackMessageId ?? null,
            });
          } catch (ackError) {
            console.error("[whatsapp] ACK failed:", ackError);
          }
        }
      }

      // === RETURN 200 IMMEDIATELY; the queue (or the inline fallback above) handles processing ===
      res.status(200).json({ success: true, queued });
    } catch (pre200Error) {
      // Catch any error that occurs BEFORE res.status(200).json() is called.
      // Log it, but ALWAYS return 200 to stop Meta from retrying.
      // The retry queue will handle reprocessing if needed.
      console.error(
        "[whatsapp] Pre-200 error (will still ack 200):",
        pre200Error,
      );
      Sentry.captureException(pre200Error, {
        tags: { handler: "webhook_pre200" },
        extra: { method: req.method, path: "/api/whatsapp" },
      });
      // Ensure at least some response is sent to Meta
      if (!res.headersSent) {
        res.status(200).json({ success: true, error: true });
      }
    } finally {
      webhookSpan?.end();
    }
    return;
  }

  return res.status(405).send("Method not allowed");
}

// Test hooks: resolves when all async message processing completes
const pendingWorkMap = new Map<string, Promise<void>>();
export function getPendingWorkForTest(): Promise<void> {
  const promises = Array.from(pendingWorkMap.values());
  if (promises.length === 0) return Promise.resolve();
  // Wait for all to settle, then check if any new ones were added
  return Promise.allSettled(promises).then(() => getPendingWorkForTest());
}
export function resetPendingAsyncWork() {
  pendingWorkMap.clear();
}
