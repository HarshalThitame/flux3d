import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { FALLBACK_SETTINGS } from "@/lib/settings-fallback";
import crypto from "node:crypto";
import { Readable } from "node:stream";

// --- Mocks ---

const chatCompletionsCreate = vi.fn();
const upsertMock = vi.fn();
const rpcMock = vi.fn();

// Per-table maybeSingle results — tests set these up before calling handler
const sessionData: { value: Record<string, unknown> | null } = { value: null };
const profileData: { value: Record<string, unknown> | null } = { value: null };

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: chatCompletionsCreate,
      },
    };
  },
}));

function makeBuilder(table: string) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gt: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    limit: vi.fn(() => builder),
    upsert: upsertMock,
    insert: vi.fn(() => {
      const insertBuilder: Record<string, unknown> = {
        select: vi.fn(() => ({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: { id: "test-event-id" }, error: null }),
        })),
      };
      return insertBuilder;
    }),
    maybeSingle: vi.fn(() => {
      if (table === "profiles") {
        return Promise.resolve({ data: profileData.value, error: null });
      }
      if (table === "whatsapp_sessions") {
        return Promise.resolve({ data: sessionData.value, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    }),
    then: undefined,
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        then: vi.fn(() => Promise.resolve()),
      })),
    })),
  };
  return builder;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => makeBuilder(table)),
    rpc: rpcMock,
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitCheck: vi.fn(() =>
    Promise.resolve({
      success: true,
      limit: 20,
      remaining: 19,
      reset: Date.now() + 60000,
    }),
  ),
}));

vi.mock("@/lib/settings", () => ({
  getCachedBusinessSettings: vi.fn(() => Promise.resolve(FALLBACK_SETTINGS)),
}));

vi.mock("@/lib/whatsapp-rag", () => ({
  getWhatsAppRagContext: vi.fn(() =>
    Promise.resolve({
      context: "",
      sources: [],
      mode: "none",
      confidence: 0,
    }),
  ),
  fetchStructuredData: vi.fn(() =>
    Promise.resolve({
      materials: "",
      products: "",
      orderStatus: "",
      orderResults: [],
      totalMatches: 0,
      materialPrices: [],
      productPrices: [],
    }),
  ),
}));

vi.mock("@/lib/whatsapp-rag-audit", () => ({
  logWhatsAppRagAudit: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/whatsapp-intent-classifier", () => ({
  classifyIntent: vi.fn(() =>
    Promise.resolve({ intent: "general", keywords: [] }),
  ),
}));

// --- Helpers ---

const TEST_SECRET = "test-webhook-secret";

function createWebhookPayload(from: string, text: string) {
  return JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "test-account-id",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                phone_number_id: "test-phone-id",
                display_phone_number: "15550000000",
              },
              contacts: [{ profile: { name: "Test User" }, wa_id: from }],
              messages: [
                {
                  from,
                  id: `test-msg-${Date.now()}`,
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  text: { body: text },
                  type: "text",
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
  });
}

function createMockReqRes(rawBody: string) {
  const signature =
    "sha256=" +
    crypto
      .createHmac("sha256", TEST_SECRET)
      .update(rawBody, "utf8")
      .digest("hex");

  const req = new (class extends Readable {
    headers: Record<string, string | string[] | undefined>;
    query: Record<string, string | string[] | undefined>;
    method: string;
    socket: { remoteAddress: string };

    constructor() {
      super();
      this.headers = {
        "x-hub-signature-256": signature,
        "x-forwarded-for": "127.0.0.1",
      };
      this.query = {};
      this.method = "POST";
      this.socket = { remoteAddress: "127.0.0.1" };
    }

    _read() {
      this.push(Buffer.from(rawBody, "utf8"));
      this.push(null);
    }
  })();

  const res: Record<string, unknown> = {
    statusCode: 200,
    status: vi.fn(function (this: Record<string, unknown>, code: number) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(),
    send: vi.fn(),
    end: vi.fn(),
  };

  return { req: req as any, res: res as any };
}

// --- Tests ---

describe("WhatsApp conversation memory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.WHATSAPP_WEBHOOK_SECRET = TEST_SECRET;
    process.env.WHATSAPP_PHONE_NUMBER_ID = "test-phone-id";
    process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
    process.env.WHATSAPP_RAG_ENABLED = "true";
    process.env.WHATSAPP_RAG_CONFIDENCE_THRESHOLD = "0.5";
    process.env.WHATSAPP_REPLY_TO_ALL = "true";
    process.env.WHATSAPP_SESSION_TURNS = "2";

    chatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: "Hello! How can I help?" } }],
      model: "gpt-4.1-mini",
      usage: { prompt_tokens: 50, completion_tokens: 10, total_tokens: 60 },
    });
    upsertMock.mockResolvedValue({ error: null });
  });

  describe("saveSession", () => {
    it("calls rpc with correct parameters", async () => {
      const { saveSession } = await import("@/pages/api/whatsapp");
      const mockSupabase = {
        rpc: rpcMock.mockResolvedValue({ error: null }),
      } as never;

      await saveSession(mockSupabase, "+919999999991", "Hello", "Hi there!");

      expect(rpcMock).toHaveBeenCalledWith("save_whatsapp_session", {
        p_phone: "+919999999991",
        p_user_message: "Hello",
        p_assistant_reply: "Hi there!",
        p_max_turns: expect.any(Number),
      });
    });

    it("returns early if supabase is null", async () => {
      const { saveSession } = await import("@/pages/api/whatsapp");
      await saveSession(null, "+919999999991", "Hello", "Hi");
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it("returns early if from is empty", async () => {
      const { saveSession } = await import("@/pages/api/whatsapp");
      const mockSupabase = {
        rpc: rpcMock,
      } as never;

      await saveSession(mockSupabase, "", "Hello", "Hi");
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it("handles rpc error gracefully", async () => {
      const { saveSession } = await import("@/pages/api/whatsapp");
      const mockSupabase = {
        rpc: rpcMock.mockRejectedValue(new Error("DB error")),
      } as never;

      await expect(
        saveSession(mockSupabase, "+919999999991", "Hello", "Hi"),
      ).resolves.not.toThrow();
    });
  });

  describe("history injection into generateWhatsAppReply", () => {
    it("injects history into the OpenAI messages array", async () => {
      const { generateWhatsAppReply } = await import("@/pages/api/whatsapp");

      const history: Array<ChatCompletionMessageParam> = [
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello! How can I help?" },
      ];

      await generateWhatsAppReply(
        "What is PETG?",
        FALLBACK_SETTINGS as never,
        "PETG knowledge",
        history,
      );

      expect(chatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: "system", content: expect.any(String) },
            { role: "user", content: "Hi" },
            { role: "assistant", content: "Hello! How can I help?" },
            { role: "user", content: "Customer message:\nWhat is PETG?" },
          ],
        }),
      );
    });

    it("works with empty history", async () => {
      const { generateWhatsAppReply } = await import("@/pages/api/whatsapp");
      await generateWhatsAppReply("Hello", FALLBACK_SETTINGS as never, "", []);
      expect(chatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: "system", content: expect.any(String) },
            { role: "user", content: "Customer message:\nHello" },
          ],
        }),
      );
    });

    it("preserves default empty history", async () => {
      const { generateWhatsAppReply } = await import("@/pages/api/whatsapp");
      await generateWhatsAppReply("Hello", FALLBACK_SETTINGS as never, "");
      expect(chatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: "system", content: expect.any(String) },
            { role: "user", content: "Customer message:\nHello" },
          ],
        }),
      );
    });

    it("adjusts max_tokens based on history length", async () => {
      const { generateWhatsAppReply } = await import("@/pages/api/whatsapp");

      const longHistory: Array<ChatCompletionMessageParam> = Array.from(
        { length: 8 },
        (_, i) => ({
          role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
          content: "A".repeat(500),
        }),
      );

      await generateWhatsAppReply(
        "Short message",
        FALLBACK_SETTINGS as never,
        "",
        longHistory,
      );

      const callArg = chatCompletionsCreate.mock.calls[0][0];
      expect(callArg.max_tokens).toBeGreaterThanOrEqual(50);
      expect(callArg.max_tokens).toBeLessThanOrEqual(180);
    });
  });

  describe("session loading from handler (integration)", () => {
    beforeEach(async () => {
      // Set RAG to return high-confidence context so OpenAI is called
      const ragModule = await import("@/lib/whatsapp-rag");
      vi.mocked(ragModule.getWhatsAppRagContext).mockResolvedValue({
        context: "Some relevant knowledge.",
        sources: [
          {
            sourceKey: "test",
            title: "Test",
            score: 0.95,
            content: "knowledge",
          },
        ],
        mode: "database",
        confidence: 0.95,
      });
      process.env.WHATSAPP_RAG_ENABLED = "true";
      process.env.WHATSAPP_RAG_CONFIDENCE_THRESHOLD = "0.5";
      profileData.value = null;
      sessionData.value = null;
      const { resetPendingAsyncWork } = await import("@/pages/api/whatsapp");
      resetPendingAsyncWork();
    });

    it("loads and injects history from whatsapp_sessions", async () => {
      sessionData.value = {
        messages: [
          { role: "user", content: "What is PLA?" },
          { role: "assistant", content: "PLA is a biodegradable filament." },
        ],
      };

      const handlerMod = await import("@/pages/api/whatsapp");
      const { default: handler } = handlerMod;
      const rawBody = createWebhookPayload("+919999999991", "And PETG?");
      const { req, res } = createMockReqRes(rawBody);
      await handler(req, res);
      await handlerMod.getPendingWorkForTest();

      expect(chatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            { role: "user", content: "What is PLA?" },
            { role: "assistant", content: "PLA is a biodegradable filament." },
            { role: "user", content: "Customer message:\nAnd PETG?" },
          ]),
        }),
      );
    });

    it("filters out malformed history entries", async () => {
      sessionData.value = {
        messages: [
          { role: "user", content: "Hi" },
          { role: "assistant", content: "Hello!" },
          { role: "system", content: "should be filtered - wrong role" },
          { role: "user", content: null },
          { role: "assistant", content: "Valid response" },
        ],
      };

      const handlerMod = await import("@/pages/api/whatsapp");
      const { default: handler } = handlerMod;
      const rawBody = createWebhookPayload("+919999999992", "Tell me more");
      const { req, res } = createMockReqRes(rawBody);
      await handler(req, res);
      await handlerMod.getPendingWorkForTest();

      // Only valid user/assistant entries with string content should pass
      const callArg = chatCompletionsCreate.mock.calls[0][0];
      const historyEntries = callArg.messages.filter(
        (m: ChatCompletionMessageParam) =>
          m.role !== "system" &&
          m.content !== "Customer message:\nTell me more",
      );
      expect(historyEntries).toEqual([
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello!" },
        { role: "assistant", content: "Valid response" },
      ]);
    });

    it("slices history to WHATSAPP_SESSION_TURNS * 2 entries", async () => {
      process.env.WHATSAPP_SESSION_TURNS = "2";

      const manyMessages = Array.from({ length: 10 }, (_, i) => ({
        role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
        content: `Message ${i + 1}`,
      }));

      sessionData.value = { messages: manyMessages };

      const handlerMod = await import("@/pages/api/whatsapp");
      const { default: handler } = handlerMod;
      const rawBody = createWebhookPayload("+919999999993", "Next question");
      const { req, res } = createMockReqRes(rawBody);
      await handler(req, res);
      await handlerMod.getPendingWorkForTest();

      // Should only have the last 4 messages (2 turns * 2)
      const callArg = chatCompletionsCreate.mock.calls[0][0];
      const historyEntries = callArg.messages.filter(
        (m: ChatCompletionMessageParam) =>
          m.role !== "system" &&
          m.content !== "Customer message:\nNext question",
      );
      expect(historyEntries).toHaveLength(4);
      expect(historyEntries[0]).toEqual({ role: "user", content: "Message 7" });
      expect(historyEntries[3]).toEqual({
        role: "assistant",
        content: "Message 10",
      });
    });

    it("handles missing session gracefully", async () => {
      const handlerMod = await import("@/pages/api/whatsapp");
      const { default: handler } = handlerMod;
      const rawBody = createWebhookPayload("+919999999994", "Hello!");
      const { req, res } = createMockReqRes(rawBody);
      await handler(req, res);
      await handlerMod.getPendingWorkForTest();

      const callArg = chatCompletionsCreate.mock.calls[0][0];
      const userMessages = callArg.messages.filter(
        (m: ChatCompletionMessageParam) => m.role === "user",
      );
      expect(userMessages).toHaveLength(1);
      expect(userMessages[0].content).toBe("Customer message:\nHello!");
    });

    it("uses empty history when session load fails", async () => {
      // Make the session query throw by setting invalid data
      sessionData.value = "not-an-object" as never;

      const handlerMod = await import("@/pages/api/whatsapp");
      const { default: handler } = handlerMod;
      const rawBody = createWebhookPayload("+919999999995", "Hello!");
      const { req, res } = createMockReqRes(rawBody);
      await handler(req, res);
      await handlerMod.getPendingWorkForTest();

      // Should still get a reply — history is empty
      const callArg = chatCompletionsCreate.mock.calls[0][0];
      const userMessages = callArg.messages.filter(
        (m: ChatCompletionMessageParam) => m.role === "user",
      );
      // Only the current user message, no history
      expect(userMessages).toHaveLength(1);
    });

    it("saves session after successful reply", async () => {
      rpcMock.mockResolvedValue({ error: null });

      const handlerMod = await import("@/pages/api/whatsapp");
      const { default: handler } = handlerMod;
      const rawBody = createWebhookPayload("+919999999996", "Hello world");
      const { req, res } = createMockReqRes(rawBody);
      await handler(req, res);
      await handlerMod.getPendingWorkForTest();

      expect(rpcMock).toHaveBeenCalledWith("save_whatsapp_session", {
        p_phone: "+919999999996",
        p_user_message: "Hello world",
        p_assistant_reply: expect.any(String),
        p_max_turns: expect.any(Number),
      });
    });
  });
});
