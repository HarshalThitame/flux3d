# WhatsApp RAG Implementation — Session Summary

Date: July 21, 2026

## Overview

Over the course of this session, we built 5 production-grade modules for the Flux3D WhatsApp AI assistant, transforming a basic webhook into a full enterprise RAG pipeline with conversation memory, live database queries, hallucination guardrails, async processing, and GPT-based intent classification.

---

## Module 1 — Conversation Memory

**Problem:** Each WhatsApp message was processed independently — no context between turns.

**Solution:** Added `whatsapp_sessions` table (Supabase) storing message history per phone number.

- **Files:** `supabase/migrations/20260721200000_add_whatsapp_sessions.sql`, `src/pages/api/whatsapp.ts`
- Loads last 8 messages (4 turns) before each GPT call
- Saves user + assistant reply after each exchange
- Configurable via `WHATSAPP_SESSION_TURNS` env var (default 4)
- Self-limiting: max 10 stored entries, load slices to 8
- Graceful degradation: DB failure → empty history, message still processed
- Cleanup: `cleanup_whatsapp_sessions()` RPC + cron endpoint + GitHub Actions workflow

---

## Module 2 — Structured DB Queries (Layer A RAG)

**Problem:** RAG only searched static knowledge chunks (17 seed entries). No live product/material pricing from the database.

**Solution:** Added `fetchStructuredData()` that queries `materials` and `shelf_products` tables via ILIKE.

- **Files:** `src/lib/whatsapp-rag.ts` (extended), `src/lib/whatsapp-keywords.ts` (new)
- `extractSearchKeywords()` — parses message for known materials, numbers, intent terms
- `fetchStructuredData()` — runs parallel ILIKE queries on both tables
- Filters out zero-price entries before formatting
- Results injected into prompt as `[MATERIAL PRICING FROM DATABASE]` and `[PRODUCT PRICING FROM DATABASE]` sections with strict pricing guardrails
- Configurable via `WHATSAPP_STRUCTURED_DATA_ENABLED` env var

---

## Module 3 — Response Validation (Hallucination Guardrail)

**Problem:** GPT could hallucinate prices not present in the database.

**Solution:** Post-generation validation that cross-checks every `₹` amount in the GPT response against known DB prices.

- **Files:** `src/lib/whatsapp-price-validation.ts` (new), `src/pages/api/whatsapp.ts`
- Regex captures `₹499`, `₹2.80`, `₹1,200` with optional decimals
- Tolerance-based comparison (`Math.abs < 0.01`) avoids floating-point issues
- On hallucination: replaces reply with safe template listing all DB prices
- Audit trail: `validationValid`, `mentionedPrices`, `hallucinatedPrices`, `originalResponseText` in `response_metadata`
- `fallback_reason` set to `'price_hallucination'` for log analysis

---

## Module 4 — Async Processing

**Problem:** All processing was inline — GPT calls (~4s) delayed the webhook 200 response, risking WhatsApp retries and duplicate messages.

**Solution:** Split handler into sync validation + async message processing.

- **Files:** `src/pages/api/whatsapp.ts` (restructured)
- Sync path (~250ms): signature → rate limit → idempotency → parse → phone limit → insert event → `res.status(200).json()`
- Async path: profile lookup → session load → RAG → structured data → GPT → validation → send → audit
- `processIncomingMessage()` extracted as standalone function
- `maxDuration = 60` prevents Vercel timeout
- Test hook: `pendingAsyncWork` + `resetPendingAsyncWork()` for integration tests

---

## Module 5 — GPT-Based Intent Classification

**Problem:** Intent classification was regex-based (`detectWhatsAppIntent()`), limited to simple keyword matching.

**Solution:** Added `classifyIntent()` using `gpt-4o-mini` with `response_format: 'json_object'`.

- **Files:** `src/lib/whatsapp-intent-classifier.ts` (new), `src/pages/api/whatsapp.ts`
- Returns `{ intent, keywords }` with 8 intents (including `out_of_scope`)
- Falls back to `{ general, [] }` if GPT unavailable (no API key, network error, malformed JSON)
- GPT keywords merged with regex keywords (deduped) for structured data queries
- `out_of_scope` intent triggers polite decline with full audit trail
- Regex `detectWhatsAppIntent()` preserved inside `buildGuidedFallbackReply()` for GPT-free fallback
- Configurable via `WHATSAPP_CLASSIFIER_MODEL` env var (default `gpt-4o-mini`)

---

## Infrastructure & Operations

| Task | Status |
|---|---|
| **Supabase migrations** | All 3 pending migrations pushed (5 WhatsApp tables total) |
| **Vercel env vars** | 8 missing vars added (31 total on production) |
| **`.env.example`** | Updated with `WHATSAPP_RAG_CONFIDENCE_THRESHOLD` |
| **`VERCEL_SETUP.md`** | Updated with all WhatsApp/OpenAI setup instructions |
| **Cron cleanup** | GitHub Actions workflow for stale session cleanup |
| **Admin diagnostics** | `/api/admin/whatsapp-test` checks all tables + env vars |

---

## Test Statistics

```
Typecheck: 0 errors
Tests:     207 passed, 0 failed, 4 skipped (2 pre-existing e2e)
Files:     18 passed, 2 failed (pre-existing e2e)
```

## File Inventory

### New Files
| File | Purpose |
|---|---|
| `src/lib/whatsapp-keywords.ts` | Keyword extraction for structured DB queries |
| `src/lib/whatsapp-price-validation.ts` | Hallucination guardrail |
| `src/lib/whatsapp-intent-classifier.ts` | GPT-based intent classification |
| `src/__tests__/whatsapp-structured-data.test.ts` | Tests for fetchStructuredData + prompt injection |
| `src/__tests__/whatsapp-price-validation.test.ts` | Tests for validatePricesInResponse |
| `src/__tests__/whatsapp-intent-classifier.test.ts` | Tests for classifyIntent |
| `src/app/api/cron/cleanup-whatsapp-sessions/route.ts` | Cron endpoint for session cleanup |
| `src/app/api/admin/whatsapp-sessions/stats/route.ts` | Admin stats for active sessions |
| `.github/workflows/cleanup-whatsapp-sessions.yml` | Daily cleanup workflow |
| `supabase/migrations/20260721200000_add_whatsapp_sessions.sql` | Sessions table |
| `supabase/migrations/20260721220000_add_session_history_length_and_cleanup.sql` | Audit column + cleanup RPC |
| `supabase/migrations/20260721230000_add_structured_data_matches.sql` | Audit column for structured data |
| `docs/RAG1.md` | This summary |

### Modified Files
| File | Changes |
|---|---|
| `src/pages/api/whatsapp.ts` | Async processing, conversation memory, structured data, price validation, GPT intent |
| `src/lib/whatsapp-rag.ts` | Extended `StructuredDataResult` with price arrays, refactored `fetchStructuredData` |
| `src/__tests__/whatsapp-conversation-memory.test.ts` | Added `pendingAsyncWork` await, intent classifier mock |
| `src/__tests__/whatsapp-rag-audit.test.ts` | Added `structured_data_matches` to test payload |
| `src/lib/whatsapp-rag-audit.ts` | Added `structured_data_matches` to type + insert |
| `types/database.ts` | Added `WhatsAppSessionRow`, `structured_data_matches` field |
| `.env.example` | Added `WHATSAPP_RAG_CONFIDENCE_THRESHOLD`, `WHATSAPP_SESSION_TURNS`, `WHATSAPP_STRUCTURED_DATA_ENABLED`, `WHATSAPP_CLASSIFIER_MODEL` |
| `VERCEL_SETUP.md` | Complete rewrite with all WhatsApp/OpenAI vars and setup guide |
| `src/app/api/admin/whatsapp-test/route.ts` | Added sessions table + structured data checks |
