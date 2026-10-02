# Shop pricing consistency

Cart, the cart drawer and checkout request a fresh server quote. The server
loads SKU prices, scheduled product price adjustments, coupons, automatic
offers, business delivery settings, regional rules and GST. All calculations
use integer paise. Coupon discounts apply first, then the automatic offer;
free-delivery eligibility uses the discounted merchandise amount.

Without a delivery destination, cart totals are labelled as estimates.
Checkout uses the selected delivery address. A price check failure displays
an error and prevents order placement. If pricing changes between review and
submission, the server returns HTTP 409 and checkout refreshes the quote for
the customer to review again.

Order creation saves the full breakdown together with stock and promotion
reservations in one transaction. The payment page, gateway order and payment
verification use this saved breakdown. Payment attempts preserve it. Changing
business settings after an order is created does not reprice that order.
Existing completed orders retain their history. Unpaid orders without a
reconciled versioned snapshot require review before a new payment can begin.

| Scenario (GST disabled unless stated) | Delivery | Payable total |
| --- | --- | --- |
| ₹400 merchandise, ₹50 fee below ₹500 | ₹50 | ₹450 |
| ₹550 merchandise minus ₹100 coupon, ₹500 delivery threshold | ₹50 | ₹500 |
| ₹1,000 merchandise minus ₹100 coupon then 10% offer, ₹500 threshold | ₹0 | ₹810 |
| ₹400 merchandise, ₹50 delivery, CGST 9% and SGST 9% | ₹50 | ₹522 |

Regional delivery charges, restrictions, minimum values and weight limits
remain authoritative. Free-shipping promotions waive the delivery fee, not
GST. Retries of the same checkout reuse its order and guest access token.
Cancellation releases its stock and promotion reservations once, with coupon
sources isolated even when two coupon tables contain the same code.

## Deployment sequence

Apply `supabase/migrations/20261002134620_shop_authoritative_pricing.sql`
to the configured Supabase project before deploying the application changes.
The application requires the new `create_shelf_order_priced` RPC and
`shop_promotion_reservations` table. The table and RPC permit service-role
access only. A missing migration prevents checkout; there is no fallback to
the previous inconsistent order calculator.

The migration has been executed against isolated PostgreSQL using PGlite and
the repository's existing stock RPC. Verified cases include exact saved
amounts, idempotent retries, promotion limits and rollback, cancellation,
same-code coupon isolation, incomplete snapshot rejection and RPC privileges.
That local verification does not replace a deployed test-mode checkout.

Live Supabase and Razorpay configuration is not available in this workspace,
so applying the migration to the live database and running a deployed payment
remain outstanding.

Run the targeted regressions with:

```sh
npx vitest run src/lib/shop/__tests__/authoritative-pricing.test.ts src/lib/shop/__tests__/financials.test.ts src/lib/shop/__tests__/pricing.test.ts src/lib/quote/__tests__/pricing-waterfall.test.ts src/__tests__/shop-cart-price-rules.test.ts src/lib/payments/__tests__/logic.test.ts src/lib/payments/__tests__/razorpay.test.ts src/lib/payments/__tests__/state.test.ts src/lib/shop/__tests__/invoice.test.ts
npx tsc --noEmit
```
