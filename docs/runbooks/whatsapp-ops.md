# WhatsApp / Meta Commerce Ops Runbook — Flux3D

Enterprise runbook for operating the WhatsApp Cloud API, message templates, Flows,
and the Meta Commerce catalog. Companion to `VERCEL_SETUP.md`.

## Table of Contents
1. [Quick reference — scripts](#1-quick-reference)
2. [Architecture](#2-architecture)
3. [Message templates](#3-message-templates)
4. [WhatsApp Flows (address form)](#4-whatsapp-flows)
5. [Phone number verification](#5-phone-number-verification)
6. [Monitoring & diagnostics](#6-monitoring)
7. [Troubleshooting matrix](#7-troubleshooting)

---

## 1. Quick reference

All scripts read credentials from `.env.local` (gitignored). Set these once:

| Env var | Value (Flux3D prod) |
|---|---|
| `WHATSAPP_WABA_ID` | `1464389558768847` |
| `WHATSAPP_PHONE_NUMBER_ID` | `1099569106574377` |
| `WHATSAPP_ACCESS_TOKEN` | system-user token |
| `WHATSAPP_VERIFY_TOKEN` | webhook verify token |
| `WHATSAPP_WEBHOOK_SECRET` | app secret |
| `META_APP_ID` | `1687599535712574` |
| `META_BUSINESS_ID` | `967448766213920` |
| `META_CATALOG_ID` | `1770810297426550` |

| Command | Purpose |
|---|---|
| `npm run whatsapp:diagnose` | Full infra health check (single command) |
| `npm run whatsapp:templates` | Reconcile message templates (idempotent) |
| `npm run whatsapp:create-flow` | Create + publish the delivery address Flow |
| `npm run whatsapp:verify-phone` | Re-verify the phone number (fixes EXPIRED) |
| `npm run whatsapp:rag:sync` | Re-sync RAG knowledge base |
| `npm run whatsapp:audit` | Template usage audit — flags approved-but-silent templates |
| `npm run whatsapp:test-templates` | Live-send all 5 HSM templates to `TEST_PHONE` |

---

## 2a. Template notification architecture (outbox)

All customer-facing HSM notifications flow through a durable outbox:

```
lifecycle event (payment captured / shipped / delivered / linked)
  └─ src/lib/whatsapp/notifications.ts  sendTemplateReliably()
      ├─ dedupe gate     whatsapp_template_outbox.idempotency_key UNIQUE
      ├─ QStash enqueue  {outboxId} → POST /api/whatsapp/notify (3 retries)
      └─ inline fallback direct Cloud API send when outbox/QStash unavailable
            └─ consumer: send via Cloud API → mark row sent/failed
                         → mirror into whatsapp_messages (meta_message_id
                           links webhook sent/delivered/read/failed ticks)
```

Semantics:
- **Deduped lifecycle keys**: `order_shipped:{orderNumber}`, `order_delivered:{orderNumber}`,
  `order_confirmed:{orderId}` — re-firing an event never double-messages a customer.
- **No dedupe**: `payment_link` (admin re-sends are legitimate), `account_connected`.
- **Order confirmation fires on payment capture** (`payments/service.ts`, both capture
  paths), not on order placement — "confirmed" means paid.
- Payment links are **template-primary** (`flux3d_payment_link`, deliverable outside
  the 24h window) with session-text fallback for in-window delivery.
- If the outbox table is missing/unreachable the wrapper degrades to inline sends,
  so messaging never hard-depends on infra health.

Consumer: `src/app/api/whatsapp/notify` (QStash-signed; non-2xx triggers retry).
Table: `whatsapp_template_outbox` (migration `20260824000000`).

---

## 2. Architecture

```
Customer
  └─ WhatsApp <-> https://flux3d.in/api/whatsapp (Cloud API webhook, Pages Router)
      ├─ parseWhatsAppMessage()  -> text / list / button / product / flow_response
      ├─ handleOrderFlow()       -> WhatsApp ordering state machine (src/lib/whatsapp/order-flow.ts)
      ├─ handleAccountLinkWhatsApp() -> Direction-A account linking
      └─ RAG assistant (OpenAI embeddings + Supabase pgvector)
```

- **Webhook**: `src/pages/api/whatsapp.ts` (GET = verify, POST = messages + statuses)
- **Async processing**: QStash → `/api/whatsapp/process`
- **Templates**: `src/lib/whatsapp/notifications.ts` reads `WHATSAPP_TEMPLATE_*` env vars
- **Address flow**: `sendAddressFlow()` in `order-flow.ts`; falls back to text prompt if flow not published
- **Ordering gate**: `WHATSAPP_ORDERING_ENABLED` (default `true`)

---

## 3. Message templates

Template names are stored in env vars (NOT hardcoded), so renaming in Meta only
requires updating the env var — no code change.

| Env var | Template | Category | Body variables |
|---|---|---|---|
| `WHATSAPP_TEMPLATE_ORDER_SHIPPED` | `flux3d_order_shipped` | UTILITY | `{{1}}` order #, `{{2}}` courier, `{{3}}` tracking |
| `WHATSAPP_TEMPLATE_ORDER_DELIVERED` | `flux3d_order_delivered` | UTILITY | `{{1}}` order # |
| `WHATSAPP_TEMPLATE_ORDER_CONFIRMATION` | `flux3d_order_confirmation` | UTILITY | `{{1}}` order #, `{{2}}` amount |
| `WHATSAPP_TEMPLATE_PAYMENT_LINK` | `flux3d_payment_link` | UTILITY | `{{1}}` order #, `{{2}}` link |
| `WHATSAPP_TEMPLATE_CONNECTED` | `flux3d_account_linked` | UTILITY | `{{1}}` name, `{{2}}` order count |
| `WHATSAPP_AUTH_TEMPLATE_NAME` | `flux3d_auth_otp` | AUTHENTICATION | `{{1}}` OTP code |

### Creating templates via API

```bash
npm run whatsapp:templates
```

The script is **idempotent**: it lists existing templates and skips any that already
exist. Only missing templates are created. Env vars in `.env.local` are updated
automatically.

> **Auth template note:** Authentication templates require the WABA to have the
> `AUTHENTICATION` category permission, which the API token may not have. If
> `flux3d_auth_otp` fails with "does not have permission to create message template",
> create it manually in **WhatsApp Manager → Message Templates → Create → Authentication**:
> body `{{1}} is your Flux3D verification code. For your security, do not share it.`

### Meta template rules (avoid rejection)

- No variable at the **start or end** of the body text
- Parameter-to-word ratio must stay under Meta's limit (add context text around vars)
- UTILITY > MARKETING for faster approval and no opt-in requirement
- Use realistic example values for each variable

---

## 4. WhatsApp Flows

The delivery address form is a WhatsApp Flow defined in
`src/lib/whatsapp/flows/delivery-address-flow.json`. It collects:
`full_name`, `line1`, `line2` (optional), `city`, `state` (dropdown), `pincode`.

### Create / publish

```bash
npm run whatsapp:create-flow
```

The script:
1. Creates the flow (DRAFT) — **no endpoint_uri** (this is a static terminal flow:
   the footer uses `on-click-action: complete`, so data returns via the `nfm_reply`
   webhook; it does NOT do `data_exchange`)
2. Validates the JSON (`validation_errors` must be empty)
3. Publishes it
4. Writes `WHATSAPP_ADDRESS_FLOW_ID` to `.env.local`

### Static vs dynamic flows (public key / endpoint)

- **This flow is static.** It does NOT need an endpoint, encryption public key, or
  `data_api_version`, because it never calls a server mid-flow.
- **Do NOT add `endpoint_uri`** to `create-address-flow.mjs` unless the flow JSON is
  converted to a dynamic (`data_exchange`) flow. That would additionally require:
  1. Generating an RSA key pair (`openssl genrsa -out private.pem 2048` → `openssl rsa -pubout`)
  2. Uploading the public key in **WhatsApp Business Manager → Flows settings**
     (the `/flows_config` Graph API endpoint returns 404 on this tenant)
  3. Implementing AES/RSA decrypt+encrypt in the endpoint handler
- `sendWhatsAppFlow()` in `src/lib/whatsapp/messages.ts` already sends `mode: 'published'`
  with no endpoint parameters — correct for a static flow.

### Integrity block (`139000 / 4233020`)

**"Integrity requirements not met"** means Meta has NOT granted Flows to the account,
OR verification state hasn't propagated. Confirm all of these are green first:

- Business verification: `verified` (check via `npm run whatsapp:diagnose`)
- WABA review: `APPROVED`
- Phone `code_verification_status`: `VERIFIED` (fix EXPIRED via `npm run whatsapp:verify-phone`)
- App privacy policy URL set (Meta Developer Portal → App → Settings → Basic)
- Phone display name approved

If all green but still blocked, the account lacks the **WhatsApp Flows** feature
(rollout is account-by-account). No API call overrides this. **Contact Meta support**
referencing error `139000 / subcode 4233020`, or wait 24–48h for propagation.

Until published, the bot **gracefully falls back** to text-based address collection
(see `sendAddressFlow()` in `order-flow.ts`).

---

## 5. Phone number verification

If `code_verification_status` is `EXPIRED`, messaging still works but **Flows may be
gated**. Re-verify:

```bash
npm run whatsapp:verify-phone
```

The script requests an SMS code to the registered number, prompts for the 6-digit
code, verifies it, and confirms the new status.

---

## 6. Monitoring

Run the full health check:

```bash
npm run whatsapp:diagnose
```

Exit code `0` = no failures, `1` = at least one FAIL. Produces a summary of:
business verification, WABA/phone status, template approval states, flow status,
and env wiring. Add to CI or a cron for proactive monitoring.

---

## 7. Troubleshooting matrix

| Symptom | Cause | Fix |
|---|---|---|
| `#131047` sending outside 24h window | No approved template | Create/approve UTILITY template |
| `Integrity requirements not met` (flow) | Flows not enabled / verification lag | `npm run whatsapp:diagnose`; contact Meta |
| `code_verification_status=EXPIRED` | Registration code lapsed | `npm run whatsapp:verify-phone` |
| Template rejected (leading/trailing var) | Meta rule violation | Add text around variables |
| Template reclassified to MARKETING | Meta auto-classifies promotional content | Rewrite body transactionally |
| `#131030` recipient not on WhatsApp | Invalid number | Check number formatting |
| Auth template permission denied | WABA lacks AUTHENTICATION permission | Create manually in WhatsApp Manager |

---

## 8. Pending manual actions (as of setup)

### 8.1 Meta support ticket — enable WhatsApp Flows

Flow publishing fails with `Blocked by Integrity / Integrity requirements not met`
(Graph error `139000`, subcode `4233020`) even though every verifiable gate is green.
Open a ticket in **WhatsApp Manager → Support** with:

> Subject: WhatsApp Flows publish blocked — "Integrity requirements not met" (139000/4233020)
>
> Body:
> Our WABA cannot publish Flows despite meeting all documented requirements:
> - WABA ID: `1464389558768847`
> - Phone Number ID: `1099569106574377` (+91 96230 23480, display name "Flux3D", quality GREEN)
> - Business Portfolio ID: `967448766213920` (verification_status: verified)
> - App ID: `1687599535712574` (privacy policy URL set)
> - Phone code_verification_status: VERIFIED
> - Flow ID: `1062060443034323` — valid JSON, `validation_errors: []`, static terminal flow
> - Publish attempt returns: `{"code":139000,"error_subcode":4233020,"error_user_msg":"Integrity requirements not met."}`
> Please enable WhatsApp Flows for this WABA or advise what integrity requirement is outstanding.

After Meta clears the gate, republish:
```bash
curl -X POST "https://graph.facebook.com/v22.0/1062060443034323/publish" \
  -H "Authorization: Bearer $WHATSAPP_ACCESS_TOKEN"
```

### 8.2 Auth (OTP) template — create manually

The system-user token lacks the AUTHENTICATION category permission
(error `10 / 2388185`). Create in **WhatsApp Manager → Message Templates → Create**:

- Name: `flux3d_auth_otp` (must match `WHATSAPP_AUTH_TEMPLATE_NAME` in Vercel when enabled)
- Category: **Authentication**
- Language: English (India) — `en_IN`
- Body: fixed Meta format; toggle **security recommendation** ON
- Button: **Copy code** (OTP type)

Then add to Vercel: `WHATSAPP_AUTH_TEMPLATE_NAME=flux3d_auth_otp`.
Until then the account-linking OTP path stays disabled and email magic-link is used.

### 8.3 Delete stale MARKETING templates (UI only)

API deletion is not permitted for these objects (Graph error `100/33`). In
**WhatsApp Manager → Message Templates**, delete:
- `flux3d_connected` (MARKETING, id `1065758336060003`)
- `flux3d_account_connected` (MARKETING, id `1079355534658418`)

### 8.4 Future: Business usernames & BSUID (tracked, no action yet)

Meta is rolling out WhatsApp Business usernames (customers reach the business via
`@handle`) with a privacy-preserving Business-Scoped User ID (BSUID) replacing
phone numbers in webhook payloads for username-initiated chats.

- **Username:** not yet available on this WABA ("Account not eligible" — Meta is
  rolling out usernames regionally). Retry in WhatsApp Manager → phone number →
  Profile after rollout reaches the account. Fallbacks when eligible:
  `@flux3dofficial`, `@flux3dindia`, `@getflux3d`, `@flux3dprints` (`@flux3d` is taken)
- **Impact if adopted:** the whole stack keys on E.164 phone numbers —
  `getOrCreateWhatsappCustomer`, `whatsapp_order_sessions` (keyed by phone),
  account linking, address collection, Shiprocket consignments. Webhooks from
  username-originated chats may carry a BSUID in `messages[0].from`.
- **Trigger to implement:** only after usernames are GA in India AND Meta documents
  the final webhook schema. Then: detect BSUID vs phone in `parseWhatsAppMessage`,
  map BSUID→phone where possible, and gate username-only flows behind a feature flag.
