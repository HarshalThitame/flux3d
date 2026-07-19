# Flux3D — Phase 0 Security Findings Report

> **Sprint:** Flux3D Enterprise Security Hardening — Phase 0
> **Date:** 2026-07-19
> **Goal:** Stop financial exposure before enabling production payments.

This report documents the security findings identified **before** code changes were applied. Each finding includes the file path, current behavior, security impact, exploit scenario, and required fix.

---

## 1. Shop Order Creation — Client-Controlled Pricing

**File:** `src/app/api/3d-shop/orders/create/route.ts`

**Current behavior:**
The API accepts the following values directly from the browser:

- `items[].unitPrice`
- `subtotal`
- `discountAmount`
- `shippingCharge`
- `totalAmount`
- `couponCode` (validated only for existence/active dates, not discount amount)

The server does verify the totals against the submitted values, but it still uses the client-submitted `unitPrice` as a basis, and only after the fact compares it to the SKU price. The client is therefore a co-author of the final order price.

**Security impact:**
Browser can set arbitrary prices, discounts, and shipping. The server-side verification is a guard, not a replacement.

**Exploit scenario:**
A malicious customer intercepts the checkout request and sends `unitPrice: 1`, `subtotal: 1`, `totalAmount: 1`. If the server tolerates the comparison, the order is created at ₹1 for products priced at ₹1000.

**Required fix:**
- Accept only: `productId`, `skuId`, `quantity`, `selectedOptions`, `couponCode`, `shippingAddressId`.
- Resolve unit price, subtotal, discount, shipping, and tax from the database and business settings.
- Reject any client-supplied financial totals.
- Store an immutable `order_price_snapshot` on the order.
- Do not increment coupon usage until payment is confirmed.

---

## 2. Coupon / Offer Discount Not Server-Calculated

**File:** `src/app/api/3d-shop/orders/create/route.ts`

**Current behavior:**
`validateCouponCode` and `validateOfferId` only return whether the coupon/offer is active and whether it grants free shipping. The actual discount amount is computed from the client-submitted `discountAmount`.

**Security impact:**
Customer can combine a valid coupon code with a fabricated discount amount.

**Exploit scenario:**
Attacker applies a 10% off coupon but sends `discountAmount: 9999`. Server validates the coupon as active and uses the submitted discount.

**Required fix:**
- Coupon validation must compute the actual discount amount from the coupon rule and the subtotal.
- Return a normalized coupon result: `discountType`, `discountValue`, `calculatedDiscount`, `maxDiscount`, `freeShipping`.
- Add protection against race conditions on coupon usage (e.g., reservation or conditional increment).

---

## 3. Shipping Cost Controlled by Client

**File:** `src/app/api/3d-shop/orders/create/route.ts`

**Current behavior:**
Shipping is recalculated on the server only if the coupon/offer does not grant free shipping. However, the final comparison is against the client-supplied `totalAmount`, which includes the client-controlled `shippingCharge`. There is no `shipping_rules` table; shipping is a simple threshold function from settings.

**Security impact:**
Shipping cost is ultimately accepted from the client. No pincode, weight, or restricted-area validation exists.

**Exploit scenario:**
Attacker sends `shippingCharge: 0` even though the order is below the free-shipping threshold.

**Required fix:**
- Create a `shipping_rules` table with state/pincode/weight/Min-Order-Value rules.
- Server calculates shipping from the rules.
- Validate delivery availability and pincode against the shipping address.

---

## 4. Custom 3D Quote Accepts Client Financial Fields

**File:** `src/app/instant-quote/actions.ts`

**Current behavior:**
`createOrderAction` accepts a full `priceBreakdown` object and individual fields such as:

- `materialCost`
- `machineCost`
- `postProcessingCharges`
- `overheadPercentage`
- `marginPercentage`
- `cartDiscountPercent`
- `deliveryCharge`
- `grandTotal`

These values are normalized but then used directly in the order.

**Security impact:**
The customer chooses the quote price. No `quote_versions` table exists to enforce an approval workflow.

**Exploit scenario:**
Attacker edits the request to set `materialCost: 0`, `marginPercentage: 0`, `grandTotal: 0`, and places a free order.

**Required fix:**
- Accept only the uploaded file path, material, color, infill, layer height, quantity, supports, post-processing level, notes, and address.
- Server validates file path ownership and recalculates all costs from the material database and business settings.
- Create a `quote_versions` table with status workflow (`draft` → `pending_review` → `approved` → `accepted`).
- Block payment until the quote status is `approved`.

---

## 5. Payment Status Can Be Updated Directly by Admin

**File:** `src/app/api/3d-shop/admin/orders/[orderId]/route.ts`

**Current behavior:**
The admin PATCH endpoint accepts `payment_status` directly and writes it to `shelf_orders` without any payment verification, state-machine check, or permission differentiation.

**Security impact:**
An admin (or attacker using a leaked admin session) can mark any order as `paid`, bypassing the gateway.

**Exploit scenario:**
A normal admin marks a COD order as `paid` without receiving any money. Invoice generation then issues a paid invoice.

**Required fix:**
- Remove `payment_status` from the generic PATCH endpoint.
- Create a centralized `updatePaymentStatus()` function that enforces the payment state machine.
- Only verified gateway webhooks or a finance-permission manual override may set `paid`.
- Manual override requires a `reason` and writes to `payment_status_history`.

---

## 6. Invoice Generated Without Verified Payment

**File:** `src/app/api/orders/[orderId]/invoice/route.ts`

**Current behavior:**
The invoice route always renders a `PAID` badge and a `TAX INVOICE` layout. It does not inspect `payment_status`. It recalculates totals from the order row, not from an immutable snapshot.

**Security impact:**
A customer can download a paid-looking invoice for an unpaid order.

**Exploit scenario:**
Attacker creates a custom quote with a manipulated price, never pays, and downloads the invoice PDF to use as a fake receipt.

**Required fix:**
- If `payment_status` is not `paid`, generate a `PROFORMA INVOICE` only (no paid badge).
- If `payment_status` is `paid`, generate a `TAX INVOICE` / `PAYMENT RECEIPT` with the gateway payment reference.
- Use an immutable order/price snapshot stored at creation time.
- Add a separate invoice number sequence.

---

## 7. WhatsApp Webhook Lacks Signature Verification

**File:** `src/pages/api/whatsapp.ts`

**Current behavior:**
- The `hub.verify_token` is hardcoded as `flux3d_verify`.
- POST requests are not checked against `X-Hub-Signature-256`.
- No duplicate event store, no rate limiting, no sender validation.
- Any incoming message triggers an OpenAI call and an outbound WhatsApp message.

**Security impact:**
Anyone can forge a webhook, trigger arbitrary OpenAI usage, and send arbitrary messages to any phone number.

**Exploit scenario:**
Attacker sends a crafted POST to `/api/whatsapp` with a fake message. The server calls OpenAI and sends the response to the attacker-controlled number, burning tokens and enabling spam.

**Required fix:**
- Verify `X-Hub-Signature-256` using a webhook secret from the environment.
- Move the verification token to an environment variable.
- Add a `whatsapp_webhook_events` table for idempotency and duplicate rejection.
- Add rate limiting and sender allow-list.
- Remove arbitrary outbound reply unless the sender is recognized.

---

## 8. Customer Storage Uploads Lack Server Validation

**File:** `src/lib/quote/supabase-storage.ts`

**Current behavior:**
The browser uploads files directly to Supabase Storage. Only extension and size are checked. MIME types are not validated, magic bytes are not checked, and SVG/script files are not specifically blocked. The bucket is created as non-public in the base schema, but the upload path logic is client-driven.

**Security impact:**
A customer can upload a malicious file (e.g., renamed executable, SVG XSS) or overwrite another user's path if they know the path structure.

**Exploit scenario:**
Attacker uploads a `.svg` file containing `<script>` to a shared/public bucket. Any admin or customer who previews the file executes the script.

**Required fix:**
- Route all uploads through a server-side API that validates extension, MIME type, and magic bytes.
- Generate safe filenames (UUID + extension) and store them under the authenticated user's folder.
- Reject SVG uploads entirely.
- Enforce strict storage RLS policies and make the bucket private.
- Provide signed URLs for authorized viewing.

---

## 9. Dangerous Development Endpoints Still Present

**Files:**

- `src/app/api/check-schema/route.ts`
- `src/app/api/test-upload/route.ts`

**Current behavior:**
Both endpoints are protected by `requireAdminRequest`, but they expose internal diagnostic information (raw table names, storage paths, error codes, stack traces). They are not gated by a production debug flag.

**Security impact:**
Information disclosure, schema leakage, and potential service-role key exposure through stack traces.

**Exploit scenario:**
A compromised admin token or an admin with excessive access can call these endpoints to enumerate the database and storage internals.

**Required fix:**
- Gate these endpoints behind an explicit `ADMIN_DEBUG_MODE=true` environment variable.
- Return 404/403 when debug mode is disabled.
- Redact any secret material from responses.

---

## 10. No Rate Limiting on Public APIs

**Files:**

- `src/app/api/3d-shop/orders/create/route.ts`
- `src/app/api/contact/route.ts`
- `src/app/instant-quote/actions.ts`
- `src/pages/api/whatsapp.ts`
- `src/app/api/payments/razorpay/create-order/route.ts`

**Current behavior:**
No IP-based, user-based, or endpoint-based rate limiting exists.

**Security impact:**
Open to brute-force coupon enumeration, order-spam, credential stuffing, webhook flooding, and inventory exhaustion.

**Exploit scenario:**
Attacker scripts checkout requests to exhaust limited SKU stock or to probe coupon codes.

**Required fix:**
- Implement a distributed rate limiter (Redis/Upstash compatible) with per-IP, per-user, and per-endpoint windows.
- Return `429 Too Many Requests`.
- Apply rate limiting to checkout, quote creation, upload, login, webhook, and contact endpoints.

---

## 11. Secrets May Leak Through Admin APIs

**File:** `src/app/api/admin/settings/business/route.ts`

**Current behavior:**
The admin settings endpoint stores and returns the entire `business_settings` row, including SMTP password, bank account details, UPI ID, Razorpay keys, etc. There is no masking on the way out.

**Security impact:**
An admin user or a compromised admin session can read all sensitive business secrets.

**Exploit scenario:**
A low-privilege admin user reads the settings JSON and extracts the SMTP password and bank account number.

**Required fix:**
- Never return actual secret values to the browser.
- Send `configured: true` and a masked placeholder for sensitive fields.
- Keep secrets server-only and log them redacted.

---

## 12. Payment State Updates Are Not Centralized

**Files:**

- `src/lib/payments/service.ts`
- `src/lib/payments/repository.ts`

**Current behavior:**
`updateInternalOrderPaymentState` and `updatePaymentAttempt` directly update the database tables. There is no single `updatePaymentStatus()` function that enforces the state machine and writes an audit row.

**Security impact:**
Multiple code paths can change payment status. A bug or a malicious admin update can transition a payment into an invalid state.

**Required fix:**
- Create a single `updatePaymentStatus()` function used by all payment flows.
- Validate every transition using `assertPaymentStatusTransition`.
- Write to `payment_status_history` with `payment_id`, `old_status`, `new_status`, `actor`, `reason`, `timestamp`.
- Customers cannot update; only gateway events or finance overrides may set `paid`.

---

## 13. RLS and Storage Policies Need Hardening

**Files:**

- `supabase/auth-schema.sql`
- `supabase/migrations/019_fix_storage_rls.sql`

**Current behavior:**
RLS is enabled on most tables, but there is no `admin_permissions` table for fine-grained financial access. The storage policies rely on `auth.uid()` path matching, which is correct, but the bucket must remain private and signed URLs should be used for access.

**Security impact:**
Without granular permissions, any admin can perform financial overrides. A public bucket allows direct file access if paths are guessed.

**Required fix:**
- Add `admin_permissions` / role flags to distinguish order managers, finance managers, and super-admins.
- Ensure `orders`, `order_items`, `quotes`, `uploads`, `payments`, and `customers` RLS policies are tested and enforce user isolation.
- Make `quote-models` bucket private and use signed URLs.

---

## 14. Order Price Snapshot Is Not Immutable

**File:** `src/app/api/3d-shop/orders/create/route.ts`

**Current behavior:**
The order snapshot stored in `payment_snapshot` is written after the order is created and contains a mix of client and server values. It is not an authoritative, immutable record.

**Security impact:**
Future disputes, refunds, or audits cannot trust the order's historical pricing.

**Required fix:**
- Add an `order_price_snapshot` JSON column.
- Store item-level snapshots (`sku_id`, `name`, `quantity`, `unit_price`, `line_total`), subtotal, discount, shipping, tax, total, and `calculated_at`.
- Never recalculate historical orders from current prices.

---

## 15. Refund API Lacks Fine-Grained Permission Check

**File:** `src/app/api/admin/payments/[paymentId]/refund/route.ts`

**Current behavior:**
Any admin user can initiate a refund if they can authenticate. There is no finance permission check or dual approval for large refunds.

**Security impact:**
A compromised admin account can refund arbitrary payments.

**Exploit scenario:**
Attacker with admin credentials issues a full refund to a friend's order.

**Required fix:**
- Require `refunds.create` or `finance` permission for refund initiation.
- For refunds above a threshold, require `refunds.approve` and a separate approval step.
- Record reason, actor, and approval in audit logs.

---

## Summary — Risk Matrix

| Finding | Severity | Area | Status Before Fix |
|---|---|---|---|
| 1. Client-controlled shop pricing | **Critical** | Checkout | Open |
| 2. Coupon discount not server-calculated | **Critical** | Pricing | Open |
| 3. Client-controlled shipping | **High** | Shipping | Open |
| 4. Client-controlled quote costs | **Critical** | Quotes | Open |
| 5. Direct admin payment_status update | **Critical** | Payments | Open |
| 6. Invoice without verified payment | **Critical** | Invoicing | Open |
| 7. WhatsApp webhook lacks verification | **High** | Webhooks | Open |
| 8. Storage uploads lack server validation | **High** | Storage | Open |
| 9. Dangerous dev endpoints | **Medium** | DevOps | Open |
| 10. No rate limiting | **High** | API | Open |
| 11. Secrets may leak via admin API | **Critical** | Secrets | Open |
| 12. No centralized payment status function | **High** | Payments | Open |
| 13. RLS / permissions not fine-grained | **High** | Database | Open |
| 14. No immutable price snapshot | **High** | Orders | Open |
| 15. Refund lacks permission check | **High** | Refunds | Open |

This report is the baseline for Phase 0 remediation. All fixes are documented in the final delivery report.
