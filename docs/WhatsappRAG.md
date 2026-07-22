# WhatsApp + GPT + RAG Implementation Analysis

Date: July 21, 2026

Analysis of the existing codebase against the WhatsApp + GPT + RAG (Supabase) implementation plan.

---

## Step 1 — WhatsApp Webhook Setup

| Requirement | Status | Location |
|---|---|---|
| Webhook URL at `/api/whatsapp` | ✅ Done | `src/pages/api/whatsapp.ts:314` |
| `hub.verify_token` verification | ✅ Done | Lines 319-333 |
| Extract `from`, `text.body`, `message_id` | ✅ Done | Lines 398-403 |
| HMAC-SHA256 signature verification | ✅ Done | Lines 52-66 — timing-safe comparison |
| IP-based rate limiting (20/60s) | ✅ Done | Lines 346-353 |
| Phone-based rate limiting (10/60s) | ✅ Done | Lines 406-409 |
| Idempotency via `payload_hash` | ✅ Done | Lines 355-369 — `whatsapp_webhook_events` table |
| **Async processing (queue / setImmediate)** | ❌ Not done | Lines 385-589 — processes inline with `await`; WhatsApp will retry on timeout |

---

## Step 2 — Intent Classification

| Requirement | Status | Location |
|---|---|---|
| GPT-based intent classification | ❌ Not implemented | No GPT call for classification exists |
| JSON output: `{ "intent", "keywords" }` | ❌ Not implemented | |
| Intent used to route RAG queries | ❌ Not implemented | RAG runs on every message regardless of intent |
| Regex-based intent fallback | ✅ Done | `detectWhatsAppIntent()` at `src/pages/api/whatsapp.ts:118-131` — 7 intents (`pricing`, `shipping`, `order`, `materials`, `contact`, `greeting`, `general`) |

---

## Step 3 — RAG with Supabase

| Requirement | Status | Location |
|---|---|---|
| **Layer A — Structured SQL queries** (products, prices, stock, orders) | ❌ Not implemented | RAG only searches `whatsapp_knowledge_chunks`. No queries against `shelf_products`, `orders`, or any transactional tables. The knowledge base is 17 static text chunks — no live product/price/stock data. |
| **Layer B — Vector similarity search** | ✅ Done | `searchDatabaseKnowledge()` in `src/lib/whatsapp-rag.ts:202-217` via `match_whatsapp_knowledge_chunks` RPC |
| `text-embedding-3-small` embeddings | ✅ Done | `WHATSAPP_EMBEDDING_MODEL` default |
| HNSW index on embeddings | ✅ Done | Migration `20260720192809_add_whatsapp_knowledge_hnsw_index.sql` |
| In-memory cosine similarity fallback | ✅ Done | `scoreCorpus()` at lines 184-200 with priority boost |
| Seed corpus fallback (when DB empty) | ✅ Done | `loadSeedCorpus()` at lines 238-262 |

**Key gap:** No structured querying of live transactional data. The RAG only retrieves from a static knowledge base chunk store. For pricing questions, GPT receives semantic context but no authoritative price records from the database.

---

## Step 4 — GPT Prompt Assembly

| Requirement | Status | Location |
|---|---|---|
| System prompt with business info | ✅ Done | `buildWhatsAppAssistantPrompt()` at `src/pages/api/whatsapp.ts:190-223` |
| `[DB_DATA]` section with structured query results | ❌ Not implemented | No structured DB data injected |
| `[CONTEXT]` section with RAG chunks | ✅ Done | Line 213: `"Relevant Flux3D knowledge base:\n${knowledgeContext}"` |
| Strict rules against guessing prices/materials | ⚠️ Partial | Line 207: asks for file/material/qty before quoting unless KB confirms — but no DB data to ground it |
| "I don't have that" for empty knowledge | ✅ Done | Lines 214-215 |
| Reply in user's language | ✅ Done | Implicit via GPT |
| End with "Would you like to place an order?" | ❌ Not implemented | No such instruction in prompt |
| Max 1200 chars | ✅ Done | Line 203 + `trimReply()` |

---

## Step 5 — Session / Conversation Memory

| Requirement | Status | Location |
|---|---|---|
| Conversation history passed to GPT | ❌ Not implemented | `generateWhatsAppReply()` lines 243-256 sends only `[system, user]` — no history |
| `sessions` table with messages JSONB | ❌ Not implemented | No such table exists |
| Load last 6–8 turns into prompt | ❌ Not implemented | |
| Clear old sessions after 24h | ❌ Not implemented | |
| `whatsapp_messages` table stores history | ✅ Done | Migration `20260720000000` — but **not fed back into the AI prompt** |

**Biggest gap — every message is stateless.** The AI has no memory of previous conversation turns. The admin inbox can reconstruct conversations, but the AI itself cannot reference earlier messages.

---

## Step 6 — Response Validation Layer

| Requirement | Status | Location |
|---|---|---|
| `validateResponse(gptResponse, dbData)` function | ❌ Not implemented | No such function exists |
| Detect hallucinated prices via regex | ❌ Not implemented | |
| Fallback to safe template on mismatch | ❌ Not implemented | |
| Post-generation guardrail | ❌ Not implemented | Only `trimReply()` and prompt-level instructions exist |

---

## Step 7 — Sending the Response

| Requirement | Status | Location |
|---|---|---|
| `sendWhatsAppMessage()` via Meta Graph API | ✅ Done | `src/pages/api/whatsapp.ts:77-108` — v22.0, `fetch()` based |
| WhatsApp List / Button messages for products | ❌ Not implemented | Only plain text messages |

---

## Step 8 — Supabase Table Design

| Table | Status | Details |
|---|---|---|
| `products` (price, material, stock) | ❌ Not as described | No `products` table with price/material/color/weight/stock. There is `shelf_products` for 3D shop but not integrated with WhatsApp RAG. |
| `orders` | ✅ Done | `orders` + `shelf_orders` exist |
| `documents` (with embeddings) | ✅ Done | `whatsapp_knowledge_chunks` with `vector(1536)` |
| `sessions` (messages JSONB) | ❌ Not implemented | |
| `inquiry_logs` | ✅ Done | `whatsapp_rag_answer_audits` — even more detailed than plan |

---

## Full Data Flow (Actual vs. Plan)

```
Customer Message
    ↓
1. Webhook receives → validates signature → rate checks → idempotency check
    ↓
2. detectWhatsAppIntent() → regex classification (plan: GPT-based classification)
    ↓
3. getWhatsAppRagContext() → vector search on knowledge_chunks only
   (plan: structured DB query + vector search — two layers)
    ↓
4. Confidence ≥ 0.55? → generateWhatsAppReply() with RAG context in system prompt
   (plan: [DB_DATA] + [CONTEXT] + [USER_MESSAGE])
    ↓
5. No validation layer (plan: validateResponse() against DB data)
    ↓
6. sendWhatsAppMessage() → Meta API
   (plan: interactive messages for product lists)
    ↓
7. log to whatsapp_messages + whatsapp_rag_answer_audits
    ↓
8. No session memory saved/loaded (plan: store + load last 6-8 turns)
```

---

## Summary

| Category | Completion |
|---|---|
| Webhook + message pipeline | ≈90% — missing async processing (inline await) |
| Intent classification | ≈10% — regex-only for fallback; no GPT classification |
| RAG retrieval | ≈60% — vector search solid, but no Layer A structured DB queries |
| Prompt assembly | ≈50% — good system prompt, no `[DB_DATA]` injection |
| Session memory | ≈0% — totally stateless |
| Response validation | ≈0% — no hallucination guardrails |
| Message sending | ≈70% — text only; no interactive message types |
| Admin UI | ≈85% — inbox + knowledge CRUD + audit logs well built |
| Testing | ≈30% — basic RAG tests exist; no webhook integration tests |

### Biggest Missing Pieces (Priority Order)

1. **No conversation memory** — each message is stateless; AI cannot reference earlier turns. File: `src/pages/api/whatsapp.ts:243-256` — messages array is `[system, user]` only.

2. **No structured DB queries** — RAG only searches static knowledge, not live products/prices/stock data. File: `src/lib/whatsapp-rag.ts` queries only `whatsapp_knowledge_chunks`.

3. **No response validation** — hallucinated prices could reach customers. No `validateResponse()` function exists.

4. **No GPT-based intent classification** — intent is not used to route RAG queries; regex fallback only. File: `src/pages/api/whatsapp.ts:118-131`.

5. **No interactive message types** — no lists or buttons for product selection. File: `src/pages/api/whatsapp.ts:77-108` — only `type: "text"`.

6. **Sync pipeline not used** — seed data sync (`syncWhatsAppKnowledgeChunks()`) is available via admin API but not triggered on deploy/startup automatically.
