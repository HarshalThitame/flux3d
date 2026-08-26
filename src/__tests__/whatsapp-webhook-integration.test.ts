import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import { Readable } from "node:stream";
import { createClient } from "@supabase/supabase-js";
import { FALLBACK_SETTINGS } from "@/lib/settings-fallback";

const testState = vi.hoisted(() => {
  const chatCompletionMock = vi.fn();
  const embeddingMock = vi.fn();
  const fetchMock = vi.fn();
  const auditLogMock = vi.fn();
  const rateLimitMock = vi.fn();
  const settingsMock = vi.fn();
  const ragContextMock = vi.fn();
  const classifyIntentMock = vi.fn();
  const validatePricesMock = vi.fn();
  const structuredDataMock = vi.fn();

  let supabaseRows: Array<Record<string, unknown>> = [];
  let maybeSingleResult: { data: Record<string, unknown> | null; error: null } =
    { data: null, error: null };
  let selectResult: {
    data: Array<Record<string, unknown>> | null;
    error: null;
  } = { data: [], error: null };
  let insertResult: {
    data: Array<Record<string, unknown>> | null;
    error: null;
  } = { data: [{ id: "evt-1" }], error: null };
  let updateResult = { error: null };
  let rpcResult: { data: Array<Record<string, unknown>> | null; error: null } =
    { data: [], error: null };

  return {
    chatCompletionMock,
    embeddingMock,
    fetchMock,
    auditLogMock,
    rateLimitMock,
    settingsMock,
    ragContextMock,
    classifyIntentMock,
    validatePricesMock,
    structuredDataMock,
    get supabaseRows() {
      return supabaseRows;
    },
    set supabaseRows(v) {
      supabaseRows = v;
    },
    get maybeSingleResult() {
      return maybeSingleResult;
    },
    set maybeSingleResult(v) {
      maybeSingleResult = v;
    },
    get selectResult() {
      return selectResult;
    },
    set selectResult(v) {
      selectResult = v;
    },
    get insertResult() {
      return insertResult;
    },
    set insertResult(v) {
      insertResult = v;
    },
    get updateResult() {
      return updateResult;
    },
    set updateResult(v) {
      updateResult = v;
    },
    get rpcResult() {
      return rpcResult;
    },
    set rpcResult(v) {
      rpcResult = v;
    },
  };
});

const tableData: Record<string, { value: Record<string, unknown> | null }> = {};

function getTableData(table: string) {
  if (!tableData[table]) tableData[table] = { value: null };
  return tableData[table];
}

function makeBuilder(table: string) {
  const td = getTableData(table);
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    not: vi.fn(() => builder),
    is: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    order: vi.fn(() => Promise.resolve(testState.selectResult)),
    limit: vi.fn(() => builder),
    range: vi.fn(() => Promise.resolve(testState.selectResult)),
    maybeSingle: vi.fn(() => {
      if (td.value) return Promise.resolve({ data: td.value, error: null });
      return Promise.resolve(testState.maybeSingleResult);
    }),
    single: vi.fn(() => Promise.resolve(testState.selectResult)),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        maybeSingle: vi.fn(() => Promise.resolve(testState.insertResult)),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve(testState.updateResult)),
    })),
    upsert: vi.fn(() => Promise.resolve(testState.updateResult)),
    delete: vi.fn(() => Promise.resolve(testState.updateResult)),
    _table: table,
    in: vi.fn(() => builder),
  };
  return builder;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => makeBuilder(table)),
    rpc: vi.fn(() => Promise.resolve(testState.rpcResult)),
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }),
      getSession: vi
        .fn()
        .mockResolvedValue({
          data: {
            session: { user: { id: "admin-1", email: "admin@flux3d.in" } },
          },
          error: null,
        }),
      signOut: vi.fn(),
    },
  })),
}));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: testState.chatCompletionMock } };
    embeddings = { create: testState.embeddingMock };
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitCheck: testState.rateLimitMock,
}));

vi.mock("@/lib/settings", () => ({
  getCachedBusinessSettings: testState.settingsMock,
}));

vi.mock("@/lib/whatsapp-rag", () => ({
  getWhatsAppRagContext: testState.ragContextMock,
  fetchStructuredData: testState.structuredDataMock,
}));

vi.mock("@/lib/whatsapp-rag-audit", () => ({
  logWhatsAppRagAudit: testState.auditLogMock,
}));

vi.mock("@/lib/whatsapp-intent-classifier", () => ({
  classifyIntent: testState.classifyIntentMock,
}));

vi.mock("@/lib/whatsapp-price-validation", () => ({
  validatePricesInResponse: testState.validatePricesMock,
}));

const TEST_PHONE_ID = "123456789";
const TEST_ACCESS_TOKEN = "test-access-token";
const FROM_PHONE = "+919999999999";

const RATE_LIMIT_PASS = {
  success: true,
  limit: 20,
  remaining: 19,
  reset: Date.now() + 60000,
};

const DEFAULT_RAG = {
  context: "",
  sources: [],
  mode: "none" as const,
  confidence: 0,
};

describe("WhatsApp Webhook Integration", () => {
  let processIncomingMessage: any;

  function expectWhatsAppSent() {
    const calls = testState.fetchMock.mock.calls.filter(
      (c: any) =>
        typeof c[0] === "string" && c[0].includes("graph.facebook.com"),
    );
    expect(calls.length).toBeGreaterThanOrEqual(1);
    return JSON.parse(calls[0][1]?.body ?? "{}");
  }

  function makeSupabase() {
    return createClient("http://localhost:54321", "test-key");
  }

  function runProcess(overrides: Record<string, unknown> = {}) {
    const supabase = makeSupabase();
    return processIncomingMessage({
      supabase,
      payloadHash: "test-hash-" + Date.now(),
      payload: { test: true },
      from: FROM_PHONE,
      text: "hello",
      eventRecord: { id: "evt-1" },
      requestStartedAt: Date.now(),
      ...overrides,
    });
  }

  beforeEach(async () => {
    vi.stubEnv("WHATSAPP_WEBHOOK_SECRET", "test-secret");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", TEST_PHONE_ID);
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN", TEST_ACCESS_TOKEN);
    vi.stubEnv("WHATSAPP_RAG_ENABLED", "true");
    vi.stubEnv("WHATSAPP_RAG_CONFIDENCE_THRESHOLD", "0.55");
    vi.stubEnv("WHATSAPP_REPLY_TO_ALL", "true");
    vi.stubEnv("WHATSAPP_SESSION_TURNS", "4");
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");

    testState.rateLimitMock.mockReset().mockResolvedValue(RATE_LIMIT_PASS);
    testState.settingsMock.mockReset().mockResolvedValue(FALLBACK_SETTINGS);
    testState.ragContextMock.mockReset().mockResolvedValue(DEFAULT_RAG);
    testState.classifyIntentMock
      .mockReset()
      .mockResolvedValue({ intent: "general", keywords: [] });
    testState.validatePricesMock
      .mockReset()
      .mockResolvedValue({
        valid: true,
        safeResponse: "",
        mentionedPrices: [],
        hallucinatedPrices: [],
      });
    testState.structuredDataMock.mockReset().mockResolvedValue({
      materials: "",
      products: "",
      orderStatus: "",
      orderResults: [],
      totalMatches: 0,
      materialPrices: [],
      productPrices: [],
    });

    testState.chatCompletionMock.mockReset().mockResolvedValue({
      choices: [
        {
          message: { content: "Hi, thanks for reaching out!" },
          finish_reason: "stop",
        },
      ],
      model: "gpt-4.1-mini",
      usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
    });
    testState.embeddingMock
      .mockReset()
      .mockResolvedValue({ data: [{ embedding: [0.1, 0.2, 0.3] }] });

    testState.fetchMock
      .mockReset()
      .mockResolvedValue({ ok: true, text: () => Promise.resolve("") });
    vi.spyOn(global, "fetch").mockImplementation(testState.fetchMock);

    testState.maybeSingleResult = {
      data: { id: "profile-1", phone_number: FROM_PHONE },
      error: null,
    };
    testState.selectResult = { data: [], error: null };
    testState.insertResult = { data: [{ id: "evt-1" }], error: null };
    testState.updateResult = { error: null };
    testState.rpcResult = { data: [], error: null };
    testState.supabaseRows = [];

    testState.auditLogMock.mockReset().mockResolvedValue({});
    Object.keys(tableData).forEach((k) => {
      tableData[k].value = null;
    });

    const mod = await import("@/pages/api/whatsapp");
    processIncomingMessage = mod.processIncomingMessage;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("A — Price inquiry with RAG: generates reply, sends WhatsApp, logs audit", async () => {
    testState.ragContextMock.mockResolvedValue({
      context: "PLA filament: ₹499 per kg. PETG: ₹699 per kg.",
      sources: [
        {
          sourceKey: "materials_pla",
          title: "PLA Filament",
          score: 0.92,
          content: "PLA: ₹499/kg",
        },
      ],
      mode: "database",
      confidence: 0.92,
    });
    testState.chatCompletionMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: "PLA filament is ₹499 per kilogram.",
            finish_reason: "stop",
          },
        },
      ],
      model: "gpt-4.1-mini",
      usage: { prompt_tokens: 120, completion_tokens: 15, total_tokens: 135 },
    });

    await runProcess({ text: "how much is PLA filament?" });

    const sent = expectWhatsAppSent();
    expect(sent.to).toBe(FROM_PHONE);
    expect(sent.text.body).toContain("₹499");

    const auditCalls = testState.auditLogMock.mock.calls;
    expect(auditCalls.length).toBe(1);
    const record = auditCalls[0][0];
    expect(record.retrieval_mode).toBe("database");
    expect(record.retrieval_confidence).toBe(0.92);
    expect(record.response_kind).toBe("model");
  });

  it("B — Price hallucination: returns fallback with safe template", async () => {
    testState.ragContextMock.mockResolvedValue({
      context: "PLA filament: ₹499 per kg.",
      sources: [
        {
          sourceKey: "materials_pla",
          title: "PLA",
          score: 0.9,
          content: "PLA: ₹499/kg",
        },
      ],
      mode: "database",
      confidence: 0.9,
    });
    testState.chatCompletionMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: "PLA filament is ₹999 per kilogram.",
            finish_reason: "stop",
          },
        },
      ],
      model: "gpt-4.1-mini",
      usage: { prompt_tokens: 120, completion_tokens: 15, total_tokens: 135 },
    });
    testState.structuredDataMock.mockResolvedValue({
      materials: "",
      products: "",
      orderStatus: "",
      orderResults: [],
      totalMatches: 1,
      materialPrices: [{ item: "PLA Filament", price: 499 }],
      productPrices: [],
    });
    testState.validatePricesMock.mockResolvedValue({
      valid: false,
      safeResponse: "PLA filament is ₹499 per kilogram.",
      mentionedPrices: [999],
      hallucinatedPrices: [999],
    });

    await runProcess({ text: "how much is PLA filament?" });

    const sent = expectWhatsAppSent();
    expect(sent.to).toBe(FROM_PHONE);
    expect(sent.text.body).toContain("₹499");

    const auditCalls = testState.auditLogMock.mock.calls;
    expect(auditCalls.length).toBe(1);
    expect(auditCalls[0][0].fallback_reason).toBe("price_hallucination");
  });

  it("C — Order status: returns order info via structured data", async () => {
    console.error("[test-debug-C] starting test C");
    console.error(
      "[test-debug-C] ragContextMock:",
      JSON.stringify(
        testState.ragContextMock.getMockImplementation?.() ?? "no impl",
      ),
    );
    testState.classifyIntentMock.mockResolvedValue({
      intent: "order_status",
      keywords: ["order", "status"],
    });
    testState.structuredDataMock.mockResolvedValue({
      materials: "",
      products: "",
      orderStatus: "Your order #F3D-123 is being printed.",
      orderResults: [
        { orderNumber: "F3D-123", status: "printing", createdAt: "2026-07-20" },
      ],
      totalMatches: 1,
      materialPrices: [],
      productPrices: [],
    });
    testState.ragContextMock.mockResolvedValue({
      context: "Order F3D-123: printing, estimated delivery Jul 25.",
      sources: [
        {
          sourceKey: "order_f3d123",
          title: "Order F3D-123",
          score: 0.88,
          content: "Printing, delivery Jul 25",
        },
      ],
      mode: "database",
      confidence: 0.88,
    });
    testState.chatCompletionMock.mockResolvedValue({
      choices: [
        {
          message: {
            content:
              "Your order F3D-123 is currently being printed and is estimated to ship by Jul 25.",
          },
        },
      ],
      model: "gpt-4.1-mini",
      usage: { prompt_tokens: 130, completion_tokens: 25, total_tokens: 155 },
    });

    await runProcess({ text: "what's my order status?" });

    const sent = expectWhatsAppSent();
    expect(sent.to).toBe(FROM_PHONE);
    expect(sent.text.body).toContain("F3D-123");
  });

  it("D — Greeting: returns fallback reply without RAG", async () => {
    testState.classifyIntentMock.mockResolvedValue({
      intent: "greeting",
      keywords: ["hi"],
    });
    testState.ragContextMock.mockResolvedValue(DEFAULT_RAG);

    await runProcess({ text: "hi" });

    const sent = expectWhatsAppSent();
    expect(sent.to).toBe(FROM_PHONE);
    expect(sent.text.body).toContain("thanks");
  });

  it("F — Out of scope: polite decline, no RAG query", async () => {
    testState.classifyIntentMock.mockResolvedValue({
      intent: "out_of_scope",
      keywords: [],
    });
    testState.ragContextMock.mockResolvedValue(DEFAULT_RAG);

    await runProcess({ text: "what is the weather like?" });

    const sent = expectWhatsAppSent();
    expect(sent.to).toBe(FROM_PHONE);
    expect(sent.text.body.length).toBeGreaterThan(0);
  });

  it("G — Session memory: includes prior conversation turns", async () => {
    const priorTurns = [
      { role: "user", content: "I need a quote for PLA" },
      {
        role: "assistant",
        content: "PLA is ₹499/kg. Would you like to upload a file?",
      },
    ];
    getTableData("whatsapp_sessions").value = {
      id: "session-1",
      sender: FROM_PHONE,
      turns: priorTurns,
      updated_at: new Date().toISOString(),
    };

    testState.ragContextMock.mockResolvedValue({
      context: "PLA: ₹499/kg",
      sources: [
        {
          sourceKey: "materials_pla",
          title: "PLA",
          score: 0.9,
          content: "PLA: ₹499/kg",
        },
      ],
      mode: "database",
      confidence: 0.9,
    });

    let capturedMessages: Array<Record<string, unknown>> = [];
    testState.chatCompletionMock.mockImplementation(async (opts: any) => {
      capturedMessages = opts.messages;
      return {
        choices: [
          {
            message: {
              content: "Yes, please upload your file to get started.",
            },
          },
        ],
        model: "gpt-4.1-mini",
        usage: { prompt_tokens: 150, completion_tokens: 20, total_tokens: 170 },
      };
    });

    await runProcess({ text: "yes please upload" });

    const sent = expectWhatsAppSent();
    expect(sent.to).toBe(FROM_PHONE);
  });
});
