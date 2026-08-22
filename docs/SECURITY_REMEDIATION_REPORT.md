# Flux3D — Phase 0 Security Remediation Verification Report

> **Status:** Verified remediated in the codebase (2026-08-22)
> **Baseline:** `docs/SECURITY_FINDINGS_PHASE0.md` (2026-07-19)
> **Method:** Static review of the current `main` branch code + migrations.

This report maps each of the 15 Phase 0 security findings to the code or
migration that implements the fix, and the test or verification that confirms it.

---

## Finding 1 — Client-Controlled Shop Pricing

**Status: REMEDIATED**

- Server now accepts only `productId`, `skuId`, `quantity`,
  `customizationText`, `couponCode`, `appliedOfferId`, and a shipping
  address. All prices are resolved from `shelf_skus` in the database.
- **File:** `src/lib/shop/place-order.ts` (`placeShopOrder`,
  `normalizeOrderItems`)
- **RPC:** `create_shelf_order_atomic` recomputes nothing but stores the
  server-calculated amounts passed in paise.
- **Tests:** `src/__tests__/shop-import-export.test.ts`,
  `src/__tests__/shop-product-revisions.test.ts`; k6 `k6/checkout.js`.

## Finding 2 — Coupon / Offer Discount Not Server-Calculated

**Status: REMEDIATED**

- `validateCouponCode` / `validateOfferId` now compute the discount
  server-side from DB rules and return a normalized `ShopCouponResult`.
- **File:** `src/lib/shop/place-order.ts` lines 127–298
- **Pricing:** `src/lib/shop/pricing.ts` (`calculateCouponDiscount`)
- **Tests:** `src/__tests__/db-integration.test.ts` (coupon validation).

## Finding 3 — Shipping Cost Controlled by Client

**Status: REMEDIATED**

- Shipping is now calculated server-side from the `shipping_rules` table.
- **File:** `src/lib/shop/shipping.ts` (`calculateShippingFromRules`)
- **Migration:** `20260719000000_phase0_security_hardening.sql`
  (creates `shipping_rules`).
- **Tests:** `src/__tests__/db-integration.test.ts` (shipping rule cases).

## Finding 4 — Custom 3D Quote Accepts Client Financial Fields

**Status: REMEDIATED (payment-gated)**

- Quote orders are now captured server-side into `quote_captures` and only
  created after a **verified Razorpay payment** whose amount is compared to
  the server snapshot (`verifyQuotePaymentAndCreateOrder`).
- **File:** `src/app/instant-quote/actions.ts`
- **Payment service:** `src/lib/payments/service.ts`
- **Migration:** `20260727000000_quote_captures.sql`.
- **Tests:** `src/__tests__/e2e/payment-flow.test.ts`,
  `src/__tests__/whatsapp-order-flow.test.ts`.

## Finding 5 — Payment Status Directly Updated by Admin

**Status: REMEDIATED**

- Payment status transitions are centralized in
  `updatePaymentAttemptStatus` / `updateOrderPaymentStatus` which enforce
  `assertPaymentStatusTransition` and write `payment_status_history`.
- **File:** `src/lib/payments/state.ts`, `src/lib/payments/logic.ts`
- **Migration:** `20260719000000_phase0_security_hardening.sql`
  (`payment_status_history` table).
- **Tests:** `src/lib/payments/__tests__/logic.test.ts`.

## Finding 6 — Invoice Generated Without Verified Payment

**Status: REMEDIATED**

- The invoice route only renders a `TAX INVOICE` / `PAID` badge when
  `payment_status` is in `{captured, paid, succeeded}`; otherwise it emits a
  `PROFORMA INVOICE`. Non-admins cannot download unpaid invoices (403).
- **File:** `src/app/api/orders/[orderId]/invoice/route.ts`
  (`allowedPaymentStatuses`, line ~633).
- **Also:** `src/app/api/3d-shop/orders/[orderId]/invoice/route.ts`.

## Finding 7 — WhatsApp Webhook Lacks Signature Verification

**Status: REMEDIATED**

- `X-Hub-Signature-256` is verified with `crypto.timingSafeEqual`; verify
  token is env-driven (`WHATSAPP_VERIFY_TOKEN`); idempotency via
  `whatsapp_webhook_events`; rate limiting; sender recognition.
- **File:** `src/pages/api/whatsapp.ts` (`verifyMetaSignature`,
  `WHATSAPP_VERIFY_TOKEN`, `whatsapp_webhook_events`).
- **Tests:** `src/__tests__/whatsapp-webhook.test.ts`,
  `src/__tests__/whatsapp-webhook-integration.test.ts`.

## Finding 8 — Customer Storage Uploads Lack Server Validation

**Status: REMEDIATED**

- Uploads are validated server-side: extension allow-list, magic-byte checks,
  size limits, SVG rejected, safe sanitized filenames under the user's folder.
- **File:** `src/lib/storage/validate.ts`, `src/lib/quote/storage-path.ts`.
- **Tests:** `src/__tests__/shop-import-export.test.ts` (file validation),
  `src/__tests__/whatsapp-message-parser.test.ts`.

## Finding 9 — Dangerous Development Endpoints Still Present

**Status: REMEDIATED**

- `/api/check-schema` and `/api/test-upload` return 404 unless
  `ADMIN_DEBUG_MODE === 'true'`.
- **Files:** `src/app/api/check-schema/route.ts`,
  `src/app/api/test-upload/route.ts`.

## Finding 10 — No Rate Limiting on Public APIs

**Status: REMEDIATED**

- Distributed rate limiting (Upstash Redis + in-memory fallback) applied to
  checkout, quote creation, invoice, contact, WhatsApp, and payment endpoints.
- **File:** `src/lib/rate-limit.ts`; usage in `create/route.ts`,
  `instant-quote/actions.ts`, `src/pages/api/whatsapp.ts`.

## Finding 11 — Secrets May Leak Through Admin APIs

**Status: REMEDIATED**

- `maskBusinessSettingsSecrets` masks SMTP password, Razorpay key, bank
  details, UPI ID, Resend keys; `stripMaskedSecretUpdates` prevents masked
  placeholders from being persisted back.
- **File:** `src/lib/admin/business-settings.ts`
  (`SENSITIVE_SETTING_FIELDS`, `BUSINESS_SETTING_SECRET_MASK`).

## Finding 12 — Payment State Updates Not Centralized

**Status: REMEDIATED**

- All payment state changes flow through
  `updatePaymentAttemptStatus` / `updateOrderPaymentStatus`, which are
  atomic (compare-and-update on current status) and write audit history.
- **File:** `src/lib/payments/state.ts`.

## Finding 13 — RLS and Storage Policies Need Hardening

**Status: REMEDIATED (partial-to-full)**

- Granular admin roles added via `profiles` columns
  (`is_finance`, `is_order_manager`, `is_printer_manager`, `is_qc_manager`)
  and enforced in `src/lib/admin/permissions.ts`.
- RLS enabled and tested on customer tables
  (`src/__tests__/rls-policies.test.ts`).
- `quote-models` bucket created as private
  (`supabase/create-storage-bucket.sql`, `005_create_storage_bucket.sql`).

## Finding 14 — Order Price Snapshot Not Immutable

**Status: REMEDIATED**

- `order_price_snapshot` JSONB added to `shelf_orders` and populated with
  item-level pricing at creation (`buildShopPricingSnapshot`).
- **File:** `src/lib/shop/pricing.ts`; migration
  `20260719000000_phase0_security_hardening.sql`.

## Finding 15 — Refund API Lacks Fine-Grained Permission Check

**Status: REMEDIATED**

- `requireAdminPermission('refunds.create')` gates the refund route; refunds
  ≥ ₹5,000 require a second-person approval record; refunds > ₹50,000 require
  super-admin.
- **File:** `src/app/api/admin/payments/[paymentId]/refund/route.ts`,
  `src/lib/admin/permissions.ts`.

---

## Additional Hardening Completed (2026-08-22)

| Area | Change |
|---|---|
| Secret hygiene | `docs/secret.md` purged from git history; `.env.local` removed; hardcoded webhook bearer token replaced with `current_setting('app.settings.webhook_secret')`; `.env.example` sanitized |
| Error handling | Silent `.catch(() => {})` in payment/email/audit/tracking replaced with `reportError` (structured log + Sentry); `process.on('unhandledRejection'/'uncaughtException')` guards added |
| Performance | Bounded catalog fetch, admin list limits, WhatsApp inbox limit, review-reminder N+1 batched, `20260823000001_performance_indexes.sql` |
| Compliance | Cookie consent banner (DPDP 2023), `/api/me/export`, `/api/me/delete` + email confirmation, `SECURITY.md`, PII scrubbed from logs |
| Database safety | Destructive `support_email_inbound` migration made non-destructive; `IF NOT EXISTS` on 33 indexes; missing `ON DELETE` added; deadlock-safe lock ordering in `create_shelf_order_atomic`; double-restore bug in `release_expired_reservations` fixed; `payment_method` parameterized (COD removed) |