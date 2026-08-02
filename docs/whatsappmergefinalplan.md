# WhatsApp ↔ Website Account Linking — Implementation Plan (Flux3D)

Enterprise-grade, file-by-file plan to ship the identity-linking feature on top of Flux3D's
existing WhatsApp Cloud API + Supabase + Resend stack. Status: **buildable on the current stack** —
all required infra (Cloud API number, webhook, QStash async pipeline, Resend EMS, order flow,
auto-provisioned WhatsApp customer users) already exists.

> Non-code prerequisite: Meta **Authentication message template** must be approved before the
> WhatsApp-OTP path of Direction B can ship. Direction B ships email-only first, so this is not a
> blocker for an initial release.

---

## 0. Current state of the repo (what already exists)

| Area | Status | Key files / facts |
|---|---|---|
| WhatsApp channel | Live | Cloud API integrated; webhook at `src/pages/api/whatsapp.ts`; async via QStash → `/api/whatsapp/process`; `sendWhatsAppText()`/`sendWhatsAppTemplate()` in `src/lib/whatsapp/messages.ts`; `whatsapp_messages`, `whatsapp_order_sessions` tables. |
| WhatsApp guest customers | Auto-provisioned as real `auth.users` | `getOrCreateWhatsappCustomer()` (`src/lib/whatsapp/customer.ts`) creates a user with synthetic email `wa+<phone>@flux3d.in`, random password, `whatsapp_auto_provisioned: true`. Lookup is by `profiles.phone_number`. **A "guest" is a real (synthetic) auth user — not a free-floating order.** |
| WhatsApp orders | Live via `shelf_orders` | `placeShopOrder({ source: 'whatsapp' })` → `shelf_orders` (`src/lib/shop/place-order.ts`). `order_source` column exists. |
| `orders` (custom 3D) | Separate table | Top-level `phone` column; `user_id NOT NULL` (website orders). Not WhatsApp-driven. |
| Website auth | Supabase Auth | `auth.users` + `profiles` (email, full_name, phone_number, email_verified, is_admin, email_bounced…). No `phone_verified`, no `whatsapp_opt_in`. |
| Email infrastructure | Full EMS on Resend | `email_logs`(CHECK-constrained `email_type`) + `email_events` + automation rules + seeded HTML templates + variables registry; producer = `enqueueEmail()` (`src/lib/email/producer.ts`). Existing types: `welcome, email_verification, password_reset, order_placed_customer, …`. A new type must be registered across ~8 files. |
| Email magic links | Pattern exists | `auth/admin.generateLink()` used for verification & password reset (`src/app/auth/actions.ts:199,304`). **Not reused** for linking (returns a Supabase auth link, not a custom deep link). |
| Background jobs | QStash | `@upstash/qstash` already in use for email enqueue. |
| Rate limiting | Upstash Redis | `rateLimitCheck` (`src/lib/rate-limit.ts`) — reuse for OTP/throttle. |
| Frontend | App Router | `src/app/profile/page.tsx` + `ProfileClient.tsx`, `requireUser(`(`@lib/auth/server`), server actions (`src/app/auth/actions.ts`). |
| Admin | App Router | `src/app/admin/*` + nav config in `src/lib/admin/nav-config.ts`. |
| Env | `src/lib/env.ts` (zod) | WhatsApp keys already present; `.env.example` needs new keys. |
| Tooling | `npm run typecheck / lint / test / security:audit` | vitest + playwright present. |

**Architectural decision vs. the generic plan:** The generic plan assumes `orders.user_id` is nullable and guest orders "float free." In this codebase `shelf_orders.user_id` is `NOT NULL` and WhatsApp guests already own a (synthetic) `auth.users` row. So "linking" really means:

> **Reassign the WhatsApp-verified phone (and its orders) from the synthetic `auth.users`/`profiles` to a real website account, prove ownership via magic link / OTP, record consent, and retire the synthetic user.**

`profiles.email_bounced` already exists (do not email bounced addresses).

Monorepo routing note: the webhook stays in **Pages Router** (`src/pages/api/whatsapp.ts`); all new customer-facing UI uses **App Router** (`src/app/...`), matching the existing split.

---

## 1. Non-code prerequisites (do before coding)

1. **Meta:** confirm the WhatsApp Business number is on **Cloud API** (it is) and **business verification is complete** (required for >250 recipients/24h and for Authentication templates). Check WhatsApp Manager → Account quality.
2. **Meta:** create & submit an **Authentication message template** for Direction-B OTP:
   - Body: `{{1}} is your Flux3D verification code. For your security, do not share it. It expires in 15 minutes.`
   - Category: **Authentication**. Add a one-tap/Copy-Code button if supported. Approval is usually minutes → 24h.
   - **Without this, keep Direction B to email-only (Phase 1 scope).**
3. **Resend:** confirm `resend_api_key` / `resend_sender_email` are in `business_settings` (they are) and Resend is sending. No new ESP config is expected for the magic link.
4. **Env:** add to `.env.example` (and optionally `src/lib/env.ts` — I recommend **not** gating the email-only path behind a flag):
   - `WHATSAPP_AUTH_TEMPLATE_NAME` — Meta Authentication template name (Direction B WhatsApp-OTP path only).

---

## 2. Decisions / deviations baked into this plan

- **Email magic link is the default for Direction B** (matches v2 of the plan). WhatsApp OTP is **conditional** on: opt-in checkbox ticked **and** `WHATSAPP_AUTH_TEMPLATE_NAME` set **and** template approved.
- **Merge target is `shelf_orders`** (actual WhatsApp orders). A Phase-5 follow-up can extend to the custom `orders` table.
- **Merge is a single SQL function** `account_linking_merge_to_user(p_target_user_id, p_phone)` so it is atomic, idempotent, and admin-callable.
- **Tokens** use `nanoid` (already a dependency) for 128-bit+ entropy; OTP codes use `crypto.randomInt` (Node 22), 6 digits.
- **Phone canonicalization** is **E.164 digits-only** (strip `+`, spaces, `-`). This is a deliberate repo-wide canonical form (see "Tech debt" note in §8).
- **Direction A is opt-in / on-demand** (customer asks) rather than a forced post-order prompt, so it never depends on the 24h service window. Direction B is self-serve from the profile page.

---

## 3. Database changes — one new migration

File: `supabase/migrations/<YYYYMMDDHHMMSS>_account_linking.sql`

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. profiles extensions (phone verified + WhatsApp opt-in + canonical phone)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS phone_canonical TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_phone_canonical
  ON public.profiles(phone_canonical) WHERE phone_canonical IS NOT NULL;

-- 2. link_requests (single-use tokens)
CREATE TABLE IF NOT EXISTS public.link_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  initiated_from TEXT NOT NULL CHECK (initiated_from IN ('whatsapp','web')),
  method TEXT NOT NULL CHECK (method IN ('email_magic_link','whatsapp_otp')),
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- set once matched to a website account
  target_phone TEXT NOT NULL,        -- canonical E.164 digits-only
  target_email TEXT,                 -- set for Direction A / email path
  otp_code_hash TEXT,                -- Direction B WhatsApp OTP
  expires_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_link_requests_token ON public.link_requests(token);
CREATE INDEX IF NOT EXISTS idx_link_requests_target_phone ON public.link_requests(target_phone);
CREATE INDEX IF NOT EXISTS idx_link_requests_expires_at ON public.link_requests(expires_at);
-- One pending request per phone (prevents stacking duplicate prompts)
CREATE UNIQUE INDEX IF NOT EXISTS uq_link_requests_active_phone
  ON public.link_requests(target_phone)
  WHERE confirmed_at IS NULL AND expires_at > NOW();

-- 3. consent_log (DPDP evidence)
CREATE TABLE IF NOT EXISTS public.consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT,
  consent_type TEXT NOT NULL
    CHECK (consent_type IN ('whatsapp_messaging','data_processing','marketing','account_linking')),
  granted BOOLEAN NOT NULL,
  method TEXT NOT NULL
    CHECK (method IN ('checkbox_web','whatsapp_reply','button_click')),
  ip_address INET,
  details JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_consent_log_phone ON public.consent_log(phone_number);
CREATE INDEX IF NOT EXISTS idx_consent_log_user_id ON public.consent_log(user_id);

-- 4. email_logs: extend the CHECK for the new account_link_confirmation type
ALTER TABLE public.email_logs DROP CONSTRAINT IF EXISTS email_logs_email_type_check;
ALTER TABLE public.email_logs ADD CONSTRAINT email_logs_email_type_check
  CHECK (email_type IN ('welcome','email_verification','password_reset','order_placed_customer',
    'order_placed_admin','model_validation_pass','model_validation_fail','production_started',
    'order_shipped','delivery_confirmation','payment_receipt','payment_failed','refund_issued',
    'contact_notification','account_link_confirmation'));

-- 5. RLS: link_requests + consent_log are service-role managed (like whatsapp_order_sessions)
ALTER TABLE public.link_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "link_requests_service_role_full_access"
  ON public.link_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "consent_log_service_role_full_access"
  ON public.consent_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. Atomic merge RPC (reassigns shelf_orders by phone to a real account; single UPDATE, idempotent)
CREATE OR REPLACE FUNCTION public.account_linking_merge_to_user(
  p_target_user_id UUID,
  p_phone TEXT
) RETURNS TABLE(orders_attributed BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attributed BIGINT;
BEGIN
  -- Only reassign orders whose current owner is a DIFFERENT user.
  -- Matches shelf_orders.shipping_address->>'phone' after stripping non-digits.
  UPDATE public.shelf_orders
  SET user_id = p_target_user_id,
      order_source = COALESCE(order_source, 'whatsapp')
  WHERE (shipping_address->>'phone') IS NOT NULL
    AND replace(regexp_replace((shipping_address->>'phone')::text, '[^0-9]', '', 'g'), '', '') = p_phone
    AND user_id <> p_target_user_id;

  GET DIAGNOSTICS v_attributed = ROW_COUNT;
  RETURN QUERY SELECT v_attributed;
END;
$$;

REVOKE ALL ON FUNCTION public.account_linking_merge_to_user(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.account_linking_merge_to_user(uuid, text) TO service_role, authenticated;
```

**RLS gotcha addressed:** new `link_requests`/`consent_log` rows are written by the service role (bypasses RLS), so the `service_role` full-access policies are sufficient; no per-row `USING` policy needed for writes. The `profiles` `phone_canonical` column starts NULL, so the partial-select policy on `profiles` is unaffected.

---

## 4. Code changes (by feature area)

### 4.1 Shared library — `src/lib/account-linking/` (new, fully unit-testable)

Mirrors the `src/lib/whatsapp/` module style; depends only on `createAdminClient()` + `nanoid`/`crypto`:

- `src/lib/account-linking/types.ts` — `LinkRequest`, `AccountLinkingError`, `MergeResult`.
- `src/lib/account-linking/tokens.ts` — `generateToken()` (nanoid 32), `hashToken(token)`, `hashOtp(code)`, `canonicalPhone(phone)` (E.164 digits-only).
- `src/lib/account-linking/link-requests.ts` — `createLinkRequest()`, `createOtpForPhone()`, `verifyOtpForPhone(phone, code)`, `consumeLinkRequestByToken(token)` (single-use, expiry-checked), `lookupPendingByPhone()`.
- `src/lib/account-linking/merge.ts` — `mergeWhatsAppOrdersToAccount(targetUserId, phone)` → calls `account_linking_merge_to_user` RPC.
- `src/lib/account-linking/consent.ts` — `recordConsent(...)`, `withdrawConsent(phone)`.
- `src/lib/account-linking/email.ts` — `enqueueAccountLinkEmail(userId, email, customerName, confirmUrl, orderCount)` → `enqueueEmail({ emailType:'account_link_confirmation', ... })`.

### 4.2 Email type — add `account_link_confirmation` (full EMS registration)

Registering a new email type in this codebase touches exactly these files:

| File | Change |
|---|---|
| `types/database.ts:15-29` | add `'account_link_confirmation'` to `EmailType` |
| `src/lib/email/types.ts:164-177` | add `AccountLinkConfirmationPayload` + add to `EmailJobPayload` union |
| `src/lib/email/dispatcher.ts:197-297, 317-` | `payloadToVariables` switch + `buildSubject` switch |
| `src/lib/email/triggers.ts` | add `sendAccountLinkConfirmation(...)` |
| `src/lib/email/variables.ts:20-124` | `KNOWN_VARIABLES.account_link_confirmation` + `EMAIL_TYPE_META.account_link_confirmation` |
| `src/lib/email/rules-evaluator.ts:4-19` | `EMAIL_TYPE_TO_EVENT.account_link_confirmation = 'account_linking_requested'` |
| `src/lib/email/seed-system-templates.ts:60+` | HTML template (`{{confirm_url}}`, `{{order_count}}`, `{{customer_name}}`) + registration row near line 450 |
| `supabase/migrations/..._account_linking.sql` §3.4 | add value to the `email_logs.email_type` CHECK |

**`AccountLinkConfirmationPayload`** = `{ emailType:'account_link_confirmation', userId, recipient, customerName, confirmUrl, orderCount }`.

### 4.3 Direction A — WhatsApp → website (on-demand, via the bot)

Hook into `src/pages/api/whatsapp.ts` inside `processIncomingMessage` (the QStash async handler), **before** the `handleOrderFlow` block at line 536 so a link request never collides with the ordering state machine:

1. Add `link_account` detection in `detectWhatsAppIntent` (`src/pages/api/whatsapp.ts:157-168`) — regex `/(link|connect|account|save to account|connect account)/i`. **But** keep it separate from the existing `order` intent (which means "status of my order") — add a distinct `link_account` branch.
2. New handler module: `src/lib/whatsapp/account-link-flow.ts` — `handleAccountLinkWhatsApp({ from, text, supabase, userId })`. It reuses `sendWhatsAppText` (`src/lib/whatsapp/messages.ts`) and the existing `logWhatsAppMessageToDb`.
3. Two-turn flow (reuses the same per-phone session pattern as `whatsapp_order_sessions`, but in `link_requests`):
   - Turn 1 (intent detected): reply *"Sure — to link this WhatsApp number to your website account, please reply with the email you use to log in."* Set a lightweight in-DB pending state (or just rely on the next inbound message + the `link_requests` row).
   - Turn 2 (email received): canonicalize, look up `profiles` by email (admin). If found → `createLinkRequest({ initiated_from:'whatsapp', method:'email_magic_link', target_user_id, target_phone: canonicalPhone(from), target_email })` → `enqueueAccountLinkEmail(...)`. Count past `shelf_orders` for the phone for the preview. If not found → **same reply either way**: *"If that email is registered, we've sent a confirmation link to it — click it to link this order to your account."* (enumeration-safe).
   - Never reveal whether the email exists.
4. Reuses the existing async pipeline (QStash → `/api/whatsapp/process`) and `logWhatsAppRagAudit` path, so retries/auditing apply automatically.

### 4.4 Confirm screen + token consumption (shared by Direction A & B email path)

New App Router route `src/app/link/confirm/` (`page.tsx` Server Component reading `?token=` via `searchParams` + `actions.ts` server action):

- `consumeLinkRequestByToken(token)` — single-use, rejects already-confirmed / expired / tampered.
- Loads matched `profiles` (`target_user_id`).
- **Cross-account guard:** if the visitor is logged in and `session.user.id !== target_user_id` → show *"This link is for a different account"* + log the mismatch as a fraud signal (audit). If **not logged in** → force login with password first, then re-load the confirm page (the plan's "proves it's really their account").
- Preview: *"Link WhatsApp number +91 XXXXX43210 and import N past orders?"* explicit **Confirm** button.
- On confirm (`confirmLinkAction`):
  1. `SELECT phone FROM profiles WHERE id = target_user_id` → canonicalize.
  2. Call `account_linking_merge_to_user(target_user_id, canonical_phone)`.
  3. Update real `profiles`: `phone = wa_phone`, `phone_verified = true`, `phone_canonical = canonicalPhone(from)`, `whatsapp_opt_in = true`, `whatsapp_opt_in_at = NOW()` (opt-in was already captured on Direction B; on Direction A the magic-link click + confirm is sufficient consent + we log it).
  4. **Synthetic-user reconciliation:** update the now-retired synthetic `profiles`/`auth.users` — set `user_metadata.merged_into = <real_id>` and `profiles.status = 'suspended'` (decision (a) in §8). Log to `whatsapp_messages` for visibility.
  5. Record `consent_log` (`account_linking` granted, `whatsapp_messaging` granted for Direction A) via `recordConsent`.
  6. Mark `link_requests.confirmed_at = NOW()`.
- Uses `createServerSupabaseClient` + `createAdminClient` (admin for merge + profile updates that bypass per-row RLS where needed).

### 4.5 Direction B — website → WhatsApp (profile page, self-serve)

UI: extend `src/app/profile/ProfileClient.tsx` with a **"Connected accounts → WhatsApp"** card:

- Phone input (E.164) — reuse the existing address form's country-input component for consistency.
- Checkbox (unchecked by default, DPDP-compliant): `☑ "I agree to receive a verification message from Flux3D on WhatsApp."`
- Method toggle: default **Email**; **WhatsApp code** enabled only when the checkbox is ticked **and** `WHATSAPP_AUTH_TEMPLATE_NAME` is configured (checked at render via a server flag).
- Submit → server action `src/app/profile/account-link-action.ts` → `linkWhatsappAction(formData)`:
  - Authenticated ⇒ `userId` present (proof of website ownership).
  - Canonicalize phone; reject if that phone is already linked to a *different* account.
  - `createLinkRequest({ initiated_from:'web', method, target_phone, target_email })`.
  - **Email path (default):** `enqueueAccountLinkEmail(..., confirmUrl = /link/confirm?token=...)`. The user is already logged in, so on click the confirm page **auto-confirms** (no extra login) and redirects to the profile.
  - **WhatsApp OTP path (gated):** only if checkbox + template configured: `createOtpForPhone(phone)` (hash + store in `link_requests.otp_code_hash`), send via `sendWhatsAppTemplate(phone, { name: AUTH_TEMPLATE, language:'en', components:[{ type:'body', parameters:[{ text: code }] }] })`. Verify via a profile-page code-entry form → `verifyOtpForPhone` + `confirmLinkAction`.
  - `rateLimitCheck` per IP/phone/email on the action.
  - Record DPDP consent (`whatsapp_messaging` granted when checkbox ticked).
- Show linked phone (read-only) + "Change/Unlink" placeholder.

### 4.6 Background cleanup + throttling

- Add a `link_requests` TTL cleanup to the existing cron pattern (mirror `cleanup_whatsapp_order_sessions`). Simple `DELETE FROM link_requests WHERE expires_at < NOW() AND confirmed_at IS NULL`.
- OTP/throttle: reuse `rateLimitCheck` (Upstash Redis) per phone + per email on the link endpoints.

### 4.7 Admin tooling

- `src/app/admin/account-linking/page.tsx` — tables for `link_requests` (token, phone, email, method, status, timestamps) and `consent_log`; a manual **Merge** button per request (re-runs `account_linking_merge_to_user`); a **Withdraw consent** action.
- Register in `src/lib/admin/nav-config.ts`.
- Audit: log admin actions to `admin_audit_logs`. Note the SQL CHECK on `admin_audit_logs.target_type` is currently out of sync with the repo — it only contains `order, user, material, coupon, setting` (migration `20260515014155_user_data_layer.sql:307`), while `AdminAuditTargetType` in `types/database.ts:60` lists ~13 values. The new migration should expand the CHECK to the full current set **plus `link_request`**: `order, user, material, coupon, setting, payment, refund, printer, quote, manufacturing, admin_user, whatsapp_knowledge, link_request`.

---

## 5. Phased rollout (executable)

**Phase 0 — Foundation (no Meta approval needed)**
- Migration (§3) — apply locally + review.
- `src/lib/account-linking/*` (tokens, link-requests, merge, consent, email) + `__tests__/`.
- `account_link_confirmation` email type registration (§4.2) + seed template.
- `WHATSAPP_AUTH_TEMPLATE_NAME` env entry.
- **Verification:** `npm run typecheck && lint && test` green; migration applies; `account_linking_merge_to_user` tested on a sandbox DB.

**Phase 1 — Direction B (website-initiated), email-only (safe default)**
- Profile card (§4.5) with email magic-link only; WhatsApp-OTP path hidden behind checkbox+template gate.
- `/link/confirm` page + server actions (§4.4) — auto-confirm when already logged in.
- Consent logging (`account_linking`, `data_processing`).
- `rateLimitCheck` on the actions.
- **Verification:** logged-in user clicks magic link → orders from that WhatsApp phone appear under their account.

**Phase 2 — Direction A (WhatsApp-initiated, on-demand)**
- `src/lib/whatsapp/account-link-flow.ts` + webhook hook (§4.3).
- On-demand prompt, email capture, enumeration-safe reply, magic-link dispatch.
- Synthetic-user reconciliation on confirm (§4.4).
- **Verification:** WhatsApp customer types "link my account" → email captured → magic link → orders import.

**Phase 3 — Direction B, WhatsApp-OTP option (gated)**
- Only after Meta template approved + `WHATSAPP_AUTH_TEMPLATE_NAME` set + opt-in checkbox: OTP hash storage + `sendWhatsAppTemplate` + verify endpoint.
- **Verification:** checkbox-ticked user receives WhatsApp code, enters it, account links.

**Phase 4 — Hardening**
- TTL cleanup job (Phase-0 cron extension).
- Admin UI (§4.7) + `admin_audit_logs.target_type` extension.
- 24h-window guard documentation for any future proactive Direction-A prompt.
- Retention purge policy extension (`link_requests`/`consent_log`) aligned with the existing `whatsapp_data_retention` policy.

**Phase 5 — Optional (parity & polish)**
- Extend merge to the custom `orders` table (top-level `phone`).
- Google Sign-In auto-link (safe — Google verifies email).
- "Change/Unlink WhatsApp" action + re-link flow.

---

## 6. Security & compliance mapping

| Risk | Mitigation in this codebase |
|---|---|
| Merge on typed match | Never. Merge only after magic-link click (A) or OTP (B), both proven via the linked channel. `link_requests` single-use + 15-min TTL. |
| Email enumeration | Single enumeration-safe WhatsApp reply regardless of account existence; generic failure messages. |
| Token replay | Single-use token; 15-min expiry; `confirmed_at` set on consume. |
| OTP brute force | `rateLimitCheck` (Upstash Redis) per phone/email; 5 attempts → require a new OTP. |
| Cross-account | `/link/confirm` asserts `session.user.id === target_user_id`; mismatch → reject + log. |
| Guest data pre-consent | `link_requests.confirmed_at` NULL until explicit confirm; orders stay under the synthetic user until then. |
| WhatsApp opt-in (Meta policy) | Checkbox captures `whatsapp_opt_in` + `consent_log`; WhatsApp-OTP path **gated behind opt-in + approved Authentication template**. Email-only default never touches this. |
| DPDP (India) | `consent_log` (purpose, granted, timestamp, withdrawal); plain-language notice on the linking forms; right-to-access via Admin; retention purge. |
| Recycled phone | Optional Meta identity-hash binding — Phase-4 hardening; not needed for v1. |
| Synthetic-user orphaning | After merge, the synthetic `auth.users`/`profiles` is soft-retired (`status='suspended'`, `merged_into` set) and excluded from future lookups. |

---

## 7. DPDP specifics (Action items)

- **Notice:** add one line to the linking form: what phone/email is used for account linking + order history.
- **Consent:** **specific & affirmative** — the linking checkbox is purpose-gated, unchecked by default. Pre-checked boxes are invalid under DPDP.
- **Withdrawal:** "Stop WhatsApp messages" → `whatsapp_opt_in=false` + `consent_log(... granted=false, withdrawn_at=NOW())` + never send OTPs without re-opt-in.
- **Data access:** reuse the admin "what data do you have" path; linkage visible via `profiles.phone_canonical` + order attribution.
- **Audit trail:** `consent_log` is the evidence the DPDP Board asks for; `created_at` on `link_requests` is the token evidence.

---

## 8. Decisions / tech-debt (please confirm)

1. **Synthetic-user fate (blocking):** WhatsApp guests already have a real `auth.users` + `profiles` row (`wa+<phone>@flux3d.in`). After merging their orders to the website account, what happens to the synthetic user?
   - **(a) Soft-retire** (recommended): `profiles.status='suspended'`, set `user_metadata.merged_into = <real_id>`, keep the row. Cheapest, reversible, avoids FK cascade risk.
   - **(b) Hard-delete** the `auth.users` row (Supabase cascades `profiles` via `ON DELETE CASCADE`). Risk: if any `shelf_orders`/`addresses` still point to it we missed reassigning.
   - Plan assumes **(a)**. Confirm.
2. **`orders` (custom 3D-print) table:** confirm whether it should also be linked. It has a top-level `phone` column and `user_id NOT NULL`. Phased plan keeps Phases 1–4 to `shelf_orders` (actual WhatsApp orders); Phase 5 extends to `orders` if needed.
3. **Direction B confirm path:** email-magic-link confirms via `/link/confirm?token=` (my plan) — for B the user is already logged in so confirm is auto (no extra login). OK?
4. **Phone canonicalization:** adopting **E.164 digits-only** repo-wide is a small tech-debt cleanup (existing code stores mixed formats). Accept? I'll add a one-time `UPDATE profiles SET phone_canonical = digits(phone_number)` in the migration.
5. **Direction A trigger:** implemented **on-demand** (customer asks "link my account") rather than a forced post-order prompt, so it never depends on the 24h WhatsApp service window. OK?

---

## 9. Files touched (consolidated)

New:
- `supabase/migrations/<ts>_account_linking.sql`
- `src/lib/account-linking/{types,tokens,link-requests,merge,consent,email}.ts` + `__tests__/`
- `src/lib/whatsapp/account-link-flow.ts`
- `src/app/link/actions.ts`, `src/app/link/confirm/page.tsx`
- `src/app/profile/account-link-action.ts`
- `src/app/admin/account-linking/page.tsx`
- Email seed + `account_link_confirmation` registrations

Edited (existing):
- `types/database.ts`, `src/lib/email/{types,dispatcher,triggers,variables,rules-evaluator}.ts`, `src/lib/email/seed-system-templates.ts`
- `src/pages/api/whatsapp.ts` (hook in `processIncomingMessage`)
- `src/app/profile/page.tsx`, `src/app/profile/ProfileClient.tsx`
- `src/lib/admin/nav-config.ts`
- `src/lib/env.ts`, `.env.example`
- Possibly a follow-up migration to extend `admin_audit_logs.target_type` CHECK

---

## 10. Verification script (per phase)

- `npm run typecheck` (critical — the new email-type union is checked across the EMS)
- `npm run lint`
- `npm run test` (new unit tests + existing WhatsApp/email suites still green)
- `npm run security:audit`
- One Supabase sandbox run of `account_linking_merge_to_user(...)` against real `shelf_orders` rows (assert no rows move when `user_id = p_target_user_id`, all phone-matching rows reassign).
