import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "node:crypto";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { rateLimitCheck } from "@/lib/rate-limit";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
      to,
      text: {
        body: message,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(`WhatsApp send failed: ${response.status} ${text}`);
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
    const secret = process.env.META_APP_SECRET;

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
      if (supabase) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("phone_number", from)
          .maybeSingle();
        senderRecognized = !!profile;
      }

      if (senderRecognized) {
        const completion = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content:
                "You are Flux3D AI assistant for a 3D printing business in Mumbai. Help customers with pricing, materials, and orders.",
            },
            {
              role: "user",
              content: text,
            },
          ],
        });

        const aiReply =
          completion.choices[0]?.message?.content ||
          "Sorry, I could not process that.";

        await sendWhatsAppMessage(from, aiReply);
      }

      // Mark as processed
      if (supabase && eventRecord?.id) {
        const { error: updateError } = await supabase
          .from("whatsapp_webhook_events")
          .update({
            processed_at: new Date().toISOString(),
            reply_sent: senderRecognized,
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
