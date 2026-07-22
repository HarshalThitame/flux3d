import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "node:crypto";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { createClient } from "@supabase/supabase-js";
import * as Sentry from '@sentry/nextjs';
import { getEnv } from '@/lib/env';
import { rateLimitCheck } from "@/lib/rate-limit";
import { getCachedBusinessSettings } from "@/lib/settings";
import { FALLBACK_SETTINGS } from "@/lib/settings-fallback";
import { logWhatsAppRagAudit, type WhatsAppRagAuditRecord } from "@/lib/whatsapp-rag-audit";
import { getWhatsAppRagContext, fetchStructuredData, type StructuredDataResult, type WhatsAppIntent } from "@/lib/whatsapp-rag";
import { extractSearchKeywords } from "@/lib/whatsapp-keywords";
import { validatePricesInResponse, type ValidationResult } from "@/lib/whatsapp-price-validation";
import { classifyIntent, type ClassifiedIntent } from "@/lib/whatsapp-intent-classifier";

let cachedServiceClient: any = null;
function getServiceClient() {
  if (cachedServiceClient) return cachedServiceClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cachedServiceClient = createClient(url, key);
  return cachedServiceClient;
}

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

const WHATSAPP_OPENAI_MODEL = process.env.WHATSAPP_OPENAI_MODEL?.trim() || "gpt-4.1-mini";
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION?.trim() || "v22.0";
const WHATSAPP_REPLY_TO_ALL = (process.env.WHATSAPP_REPLY_TO_ALL?.trim() || "true") !== "false";
const WHATSAPP_RAG_ENABLED = (process.env.WHATSAPP_RAG_ENABLED?.trim() || "true") !== "false";
const WHATSAPP_RAG_CONFIDENCE_THRESHOLD = Number(process.env.WHATSAPP_RAG_CONFIDENCE_THRESHOLD ?? 0.55) || 0.55;
const WHATSAPP_SESSION_TURNS = Math.max(1, Number(process.env.WHATSAPP_SESSION_TURNS ?? 4) || 4);
const WHATSAPP_STRUCTURED_DATA_ENABLED = (process.env.WHATSAPP_STRUCTURED_DATA_ENABLED?.trim() || "true") !== "false";
const WHATSAPP_PROMPT_VERSION = "whatsapp-rag-v2";
const MAX_REPLY_CHARS = 1200;
const MAX_INPUT_CHARS = 3000;

export const maxDuration = 60;

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

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;

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

function buildWhatsAppAssistantPrompt(
  settings: AssistantSettings,
  knowledgeContext: string,
  liveData: StructuredDataResult = { materials: '', products: '', orderStatus: '', orderResults: [], totalMatches: 0, materialPrices: [], productPrices: [] },
) {
  const businessName = settings.businessName?.trim() || FALLBACK_SETTINGS.businessName;
  const businessDescription = settings.businessDescription?.trim() || FALLBACK_SETTINGS.businessDescription;
  const businessHours = settings.businessHours?.trim() || settings.workingHours?.trim() || FALLBACK_SETTINGS.businessHours;
  const supportAvailability = settings.supportAvailabilityMessage?.trim() || FALLBACK_SETTINGS.supportAvailabilityMessage;
  const autoReply = settings.autoReplyMessage?.trim() || FALLBACK_SETTINGS.autoReplyMessage;
  const supportPhone = settings.whatsappSupportNumber?.trim() || settings.primaryPhone?.trim() || FALLBACK_SETTINGS.whatsappSupportNumber;
  const orderPhone = settings.whatsappOrderNumber?.trim() || settings.whatsappNumber?.trim() || FALLBACK_SETTINGS.whatsappOrderNumber;

  const liveDataSection: string[] = []

  if (liveData.materials) {
    liveDataSection.push('[MATERIAL PRICING FROM DATABASE]')
    liveDataSection.push(liveData.materials)
    liveDataSection.push('')
  }

  if (liveData.products) {
    liveDataSection.push('[PRODUCT PRICING FROM DATABASE]')
    liveDataSection.push(liveData.products)
    liveDataSection.push('')
  }

  if (liveData.orderStatus) {
    liveDataSection.push('[ORDER STATUS FROM DATABASE]')
    liveDataSection.push(liveData.orderStatus)
    liveDataSection.push('')
  }

  if (liveData.orderStatus) {
    liveDataSection.push('For order status, ONLY report what is shown in [ORDER STATUS FROM DATABASE]. Never guess or invent order status or IDs.')
  }

  if (liveDataSection.length > 0) {
    liveDataSection.push('STRICT RULE: For prices, materials, and stock status — ONLY use the values above.')
    liveDataSection.push('If the database returned no matching data, say "Let me check and confirm" — never invent prices.')
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

export async function generateWhatsAppReply(
  messageText: string,
  settings: AssistantSettings,
  knowledgeContext: string,
  history: Array<ChatCompletionMessageParam> = [],
  liveData: StructuredDataResult = { materials: '', products: '', orderStatus: '', orderResults: [], totalMatches: 0, materialPrices: [], productPrices: [] },
): Promise<GeneratedWhatsAppReply> {
  const client = getOpenAI()
  if (!client) {
    throw new Error("Missing OpenAI API key.");
  }

  const systemPrompt = buildWhatsAppAssistantPrompt(settings, knowledgeContext, liveData);
  const customerMessage = messageText.slice(0, MAX_INPUT_CHARS);

  // Estimate prompt token count (rough: 4 chars ≈ 1 token) and cap max_tokens
  const promptText = [systemPrompt, ...history.map((m) => m.content ?? ''), customerMessage].join(' ');
  const estimatedPromptTokens = Math.ceil(promptText.length / 4);
  const modelContextLimit = 128000; // gpt-4.1-mini context window
  const maxTokens = Math.min(180, Math.max(50, modelContextLimit - estimatedPromptTokens - 50));

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
  }
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
  }
) {
  if (!supabase) return;

  const { error } = await supabase.from("whatsapp_messages").insert({
    user_id: entry.userId,
    sender: entry.sender,
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

export async function saveSession(
  supabase: ReturnType<typeof getServiceClient>,
  from: string,
  userMessage: string,
  assistantReply: string,
) {
  if (!supabase || !from) return;
  try {
    const { error } = await supabase.rpc('save_whatsapp_session', {
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

function truncatePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const serialized = JSON.stringify(payload);
  if (serialized.length <= MAX_PAYLOAD_BYTES) return payload;
  // Truncate to 100KB by cutting the string and ensuring valid JSON
  const truncated = serialized.slice(0, MAX_PAYLOAD_BYTES - 50) + ',"_truncated":true}';
  try { return JSON.parse(truncated); } catch { return { _truncated: true }; }
}

async function insertWebhookEvent(
  supabase: ReturnType<typeof getServiceClient>,
  payloadHash: string,
  payload: Record<string, unknown>,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("whatsapp_webhook_events").insert({
    payload_hash: payloadHash,
    sender: null,
    payload: truncatePayload(payload),
    signature_verified: true,
    received_at: new Date().toISOString(),
    ...overrides,
  }).select("id").maybeSingle();
  if (error) console.error("[whatsapp] DB insert error:", error);
  return data ?? null;
}

type IncomingMessageParams = {
  supabase: ReturnType<typeof getServiceClient>
  payloadHash: string
  payload: Record<string, unknown>
  from: string
  text: string
  eventRecord: { id: string } | null
  requestStartedAt: number
}

export async function processIncomingMessage(params: IncomingMessageParams) {
  const { supabase, payloadHash, payload, from, text, eventRecord, requestStartedAt } = params

  const processingSpan = Sentry.startInactiveSpan({
    op: 'whatsapp.process',
    name: `msg from ${from?.slice(-4)}`,
  });

  try {
    // Sender allow-list: only reply if sender phone exists in profiles
    let senderRecognized = false;
    let userId: string | null = null;
    if (supabase) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, whatsapp_messages_sent")
          .eq("phone_number", from)
          .maybeSingle();
        senderRecognized = !!profile;
        userId = profile?.id ?? null;
      } catch (error) {
        console.error("[whatsapp] Failed to lookup profile:", error);
      }
    }

    // Load conversation history for context-aware replies
    let sessionHistory: Array<ChatCompletionMessageParam> = [];
    if (supabase) {
      try {
        const { data: session } = await supabase
          .from("whatsapp_sessions")
          .select("messages")
          .eq("phone_number", from)
          .maybeSingle();
        if (session?.messages && Array.isArray(session.messages)) {
          sessionHistory = (session.messages as Array<Record<string, unknown>>)
            .filter((m) =>
              typeof m === 'object' &&
              m !== null &&
              typeof m.role === 'string' &&
              (m.role === 'user' || m.role === 'assistant') &&
              typeof m.content === 'string'
            )
            .slice(-(WHATSAPP_SESSION_TURNS * 2)) as unknown as Array<ChatCompletionMessageParam>;
        }
      } catch (error) {
        console.error("[whatsapp] Failed to load session, continuing with empty history:", error);
      }
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

    // Intent classification: use regex for unambiguous intents (saves GPT call)
    const regexIntent = detectWhatsAppIntent(text);
    const skipGptClassifier = regexIntent === 'greeting' || regexIntent === 'contact';
    const [classified] = skipGptClassifier
      ? [{ intent: regexIntent, keywords: [] as string[] }]
      : await Promise.all([
          classifyIntent(text).catch(() => ({ intent: 'general' as const, keywords: [] as string[] })),
        ]);

    // Declare state variables early (used by both out_of_scope and normal flow)
    let didSendReply = false
    let finalReply = "";
    let finalReplyKind: 'model' | 'fallback' | 'error' = 'fallback';
    let fallbackReason: string | null = null;
    let generatedReply: GeneratedWhatsAppReply | null = null;
    let generationLatencyMs: number | null = null;
    let auditRecord: WhatsAppRagAuditRecord | null = null;
    let structuredData: StructuredDataResult = { materials: '', products: '', orderStatus: '', orderResults: [], totalMatches: 0, materialPrices: [], productPrices: [] };

    // Handle out-of-scope messages immediately — no RAG, no GPT, no structured data
    if (classified.intent === 'out_of_scope') {
      finalReply = formatBulletReply([
        `Hi, thanks for reaching out.`,
        `I can only assist with 3D printing and custom manufacturing questions.`,
        `Please let me know if you have a 3D printing-related query.`,
      ])
      finalReplyKind = 'fallback'
      fallbackReason = 'out_of_scope'
      auditRecord = {
        webhook_event_id: eventRecord?.id ?? null,
        sender: from,
        user_id: userId,
        question_text: text,
        retrieval_mode: 'none',
        retrieval_confidence: 0,
        retrieval_sources: [],
        response_kind: 'fallback',
        response_text: finalReply,
        response_metadata: {
          model: WHATSAPP_OPENAI_MODEL,
          promptTokens: null,
          completionTokens: null,
          totalTokens: null,
          finishReason: null,
          replyToAll: WHATSAPP_REPLY_TO_ALL,
          senderRecognized,
          sendStatus: 'pending',
          classifiedIntent: 'out_of_scope',
        },
        fallback_reason: 'out_of_scope',
        model_name: null,
        prompt_version: WHATSAPP_PROMPT_VERSION,
        latency_ms: null,
        retrieval_latency_ms: null,
        generation_latency_ms: null,
        session_history_length: sessionHistory.length,
        structured_data_matches: 0,
      }
      // Send out_of_scope reply and finish
      try {
        await sendWhatsAppMessage(from, finalReply)
        didSendReply = true
        auditRecord.response_metadata = { ...auditRecord.response_metadata, sendStatus: 'sent' }
      } catch (error) {
        auditRecord.response_metadata = { ...auditRecord.response_metadata, sendStatus: 'failed' }
        console.error('[whatsapp] Failed to send out_of_scope reply:', error)
      } finally {
        auditRecord.latency_ms = Date.now() - requestStartedAt
        await logWhatsAppRagAudit(auditRecord).catch(() => {})
      }
      // Mark event as processed (no structured data to attach)
      if (supabase && eventRecord?.id) {
        try {
          await supabase.from('whatsapp_webhook_events').update({
            processed_at: new Date().toISOString(),
            reply_sent: didSendReply,
            payload: { ...payload, classifiedIntent: 'out_of_scope' },
          }).eq('id', eventRecord.id)
        } catch {
          // Best-effort: event stays unprocessed but WhatsApp won't retry (200 already sent)
        }
      }
      return
    }

    // Merge GPT keywords with regex-extracted keywords (deduped)
    const gptKeywords = classified.keywords
    const regexKeywords = extractSearchKeywords(text)
    const combinedKeywords = [...new Set([...gptKeywords, ...regexKeywords])]

    // Query live database for structured data using combined keywords
    if (WHATSAPP_STRUCTURED_DATA_ENABLED && supabase && combinedKeywords.length > 0) {
      structuredData = await fetchStructuredData(combinedKeywords, classified.intent, from).catch((error) => {
        console.error("[whatsapp] Structured data query failed:", error);
        return { materials: '', products: '', orderStatus: '', orderResults: [], totalMatches: 0, materialPrices: [], productPrices: [] };
      });
    }

    await logWhatsAppMessage(supabase, {
      userId,
      sender: from,
      direction: "incoming",
      messageText: text,
      automated: false,
      triggerEvent: "incoming_whatsapp_message",
      responded: WHATSAPP_REPLY_TO_ALL || senderRecognized,
      responseTimeMinutes: null,
    });

    // Use AI model when there's grounded data to work with:
    // RAG context above threshold, OR live structured data from DB
    const hasGroundedRag = Boolean(knowledgeContext) && ragConfidence >= WHATSAPP_RAG_CONFIDENCE_THRESHOLD;
    const hasLiveData = structuredData.totalMatches > 0;
    const shouldUseModel = (WHATSAPP_REPLY_TO_ALL || senderRecognized)
      && (hasGroundedRag || hasLiveData);

    if (shouldUseModel) {
      const generationStartedAt = Date.now();
      generatedReply = await generateWhatsAppReply(text, businessSettings, knowledgeContext, sessionHistory, structuredData).catch((error) => {
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
      fallbackReason = fallbackReason ?? (WHATSAPP_RAG_ENABLED ? (shouldUseModel ? 'model_generation_failed' : 'low_confidence') : 'rag_disabled');
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
      model_name: generatedReply?.model ?? (shouldUseModel ? WHATSAPP_OPENAI_MODEL : null),
      prompt_version: WHATSAPP_PROMPT_VERSION,
      latency_ms: null,
      retrieval_latency_ms: retrievalLatencyMs,
      generation_latency_ms: generationLatencyMs,
      session_history_length: sessionHistory.length,
      structured_data_matches: structuredData.totalMatches,
    };

    // Validate prices in GPT response against live DB data
    let validationResult: ValidationResult | null = null
    if (finalReplyKind === 'model' && structuredData.totalMatches > 0) {
      const knownPrices = [
        ...structuredData.materialPrices,
        ...structuredData.productPrices,
      ]
      if (knownPrices.length > 0) {
        validationResult = await validatePricesInResponse(finalReply, knownPrices)
        if (!validationResult.valid) {
          const originalReply = finalReply
          finalReply = validationResult.safeResponse
          auditRecord.response_text = finalReply
          auditRecord.fallback_reason = 'price_hallucination'
          auditRecord.response_metadata = {
            ...auditRecord.response_metadata,
            validationValid: false,
            mentionedPrices: validationResult.mentionedPrices,
            hallucinatedPrices: validationResult.hallucinatedPrices,
            originalResponseText: originalReply,
          }
        } else {
          auditRecord.response_metadata = {
            ...auditRecord.response_metadata,
            validationValid: true,
            mentionedPrices: validationResult.mentionedPrices,
          }
        }
      }
    }

    try {
      await sendWhatsAppMessage(from, finalReply);
      didSendReply = true
      auditRecord.response_metadata = {
        ...auditRecord.response_metadata,
        sendStatus: 'sent',
      }

      await logWhatsAppMessage(supabase, {
        userId,
        sender: from,
        direction: "outgoing",
        messageText: finalReply,
        automated: true,
        triggerEvent: "openai_reply",
        responded: true,
        responseTimeMinutes: (Date.now() - requestStartedAt) / 60000,
      });

      // Save conversation history for context on next message
      // (uses pgRPC with SELECT FOR UPDATE to avoid race conditions)
      await saveSession(supabase, from, text, finalReply);

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
      // Save session even on send failure so context isn't lost
      await saveSession(supabase, from, text, finalReply);
      console.error('[whatsapp] Failed to send outbound WhatsApp message:', error);
    } finally {
      auditRecord.latency_ms = Date.now() - requestStartedAt;
      await logWhatsAppRagAudit(auditRecord).catch((error) => {
        console.error("[whatsapp] Failed to log RAG audit:", error);
      });
    }

    // Mark as processed
    if (supabase && eventRecord?.id) {
      const { error: updateError } = await supabase
        .from("whatsapp_webhook_events")
        .update({
          processed_at: new Date().toISOString(),
          reply_sent: didSendReply,
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[whatsapp] Async processing error:", errorMessage);

    Sentry.withScope((scope) => {
      scope.setTag('handler', 'processIncomingMessage');
      scope.setExtra('sender', from);
      scope.setExtra('eventId', eventRecord?.id);
      scope.setExtra('text', text?.slice(0, 200));
      Sentry.captureException(error);
    });

    // Record failure for retry queue
    if (supabase && eventRecord?.id) {
      try {
        await supabase.rpc('increment_webhook_retry', {
          p_event_id: eventRecord.id,
          p_error: errorMessage.slice(0, 1000),
        });
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
    // Validate all environment variables at runtime — fails fast on misconfiguration
    try { getEnv(); } catch (e) {
      return res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Configuration error' });
    }

    const webhookSpan = Sentry.startInactiveSpan({
      op: 'whatsapp.webhook',
      name: 'POST /api/whatsapp',
    });

    try {
      const rawBody = await readRawBody(req);
      const signature = first(req.headers["x-hub-signature-256"]);
      const secret = process.env.WHATSAPP_WEBHOOK_SECRET;

      if (!verifyMetaSignature(rawBody, signature, secret)) {
        return res.status(403).send("Invalid signature");
      }

      const ipLimit = await rateLimitCheck(`whatsapp:${getClientIp(req)}`, 60, 20);
      if (!ipLimit.success) {
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

      let payload: any
      try { payload = JSON.parse(rawBody) }
      catch { return res.status(200).json({ success: true }) }

      const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
      const from = message?.from
      const msgType = message?.type

      // Extract text from supported message types
      let text: string | undefined
      let mediaInfo: string | null = null
      if (msgType === 'text') {
        text = message?.text?.body
      } else if (msgType === 'image') {
        text = message?.image?.caption || undefined
        mediaInfo = `[Image ID: ${message?.image?.id || 'unknown'}]`
      } else if (msgType === 'document') {
        text = message?.document?.caption || undefined
        mediaInfo = `[Document: ${message?.document?.filename || 'unknown'}]`
      } else if (msgType === 'audio' || msgType === 'video' || msgType === 'sticker') {
        mediaInfo = `[${msgType}]`
      }

      if (!message || !from) {
        await insertWebhookEvent(supabase, payloadHash, payload, { sender: from ?? null, processed_at: new Date().toISOString() }).catch(() => {})
        return res.status(200).json({ success: true })
      }

      // Handle unsupported media types (audio, video, sticker) with a direct reply
      if (msgType && msgType !== 'text' && msgType !== 'image' && msgType !== 'document' && !text) {
        const mediaReply = `Thanks for your ${msgType}. I can only assist with text, images, and documents. Please describe what you need in text.`
        await insertWebhookEvent(supabase, payloadHash, payload, { sender: from, processed_at: new Date().toISOString() }).catch(() => {})
        try {
          const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
          const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
          if (phoneNumberId && accessToken) {
            const apiVersion = process.env.WHATSAPP_API_VERSION || 'v22.0'
            await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ messaging_product: 'whatsapp', to: from, type: 'text', text: { body: mediaReply } }),
            })
          }
        } catch { /* best-effort */ }
        return res.status(200).json({ success: true })
      }

      // Media without caption — use guided fallback
      if (mediaInfo && !text) {
        // Store the event with media info, then process as a guided reply
        text = mediaInfo
      }

      // Fallback if no text could be extracted at all (shouldn't reach here)
      if (!text || typeof text !== "string") {
        await insertWebhookEvent(supabase, payloadHash, payload, { sender: from, processed_at: new Date().toISOString() }).catch(() => {})
        return res.status(200).json({ success: true })
      }

      // Phone-based rate limit
      const phoneLimit = await rateLimitCheck(`whatsapp_phone:${from}`, 60, 10)
      if (!phoneLimit.success) {
        return res.status(429).json({ success: false, error: "Too many messages. Please wait before sending another." })
      }

      // Write the event record immediately (async path will use this ID)
      const eventRecord = await insertWebhookEvent(supabase, payloadHash, payload, { sender: from }).catch(() => null)

      // === RETURN 200 IMMEDIATELY, PROCESS ASYNC ===
      const requestStartedAt = Date.now()
      res.status(200).json({ success: true })

      const workKey = `webhook-${payloadHash.slice(0, 12)}`;
      const workPromise = processIncomingMessage({ supabase, payloadHash, payload, from, text: text!, eventRecord, requestStartedAt }).catch((error) => {
        console.error("[whatsapp] Async processing failed:", error)
        Sentry.captureException(error, {
          tags: { handler: 'webhook_async' },
          extra: { sender: from },
        });
      }).finally(() => {
        pendingWorkMap.delete(workKey);
      });
      pendingWorkMap.set(workKey, workPromise);

      // Await processing to prevent Vercel from terminating the function
      // before async work completes. WhatsApp has a 20-second timeout for
      // the 200 response — we already sent it above.
      await workPromise;
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
