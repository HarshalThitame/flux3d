# Plan: Shop Minimum Order Value — fully admin-manageable

User provided prod DB connection string (transient use only — NEVER committed). User also pasted a password in chat → recommend rotating after this work.

## Phase 1 — Database (production, via `supabase db query --db-url "<conn>"`)
1. Inspect current rules:
   `SELECT id, state, pincode_range_start, pincode_range_end, minimum_order_value, charge, restricted, is_active FROM public.shipping_rules ORDER BY state NULLS LAST;`
2. Apply schema change (same SQL as migration file):
   ```sql
   ALTER TABLE public.business_settings
     ADD COLUMN IF NOT EXISTS shop_min_order_value numeric(10,2) NOT NULL DEFAULT 0;
   ```
3. Clear rule-level ₹499 minimums (rule values override global):
   ```sql
   UPDATE public.shipping_rules SET minimum_order_value = 0;
   ```
   (Report before/after rows to user.)

## Phase 2 — Code: global setting plumbing
(As before)
- Migration file content: `20260823131447_add_shop_min_order_value.sql`
- `business-settings.ts`: type `shopMinimumOrderValue`, row mapper, column map (+ upsert defaults if present)
- `settings.ts` + `settings-fallback.ts`: map field, FALLBACK `shopMinimumOrderValue: 0`
- `shop/shipping.ts`: extend Pick type; effective min = rule value > 0 ? rule : global; enforce global on no-rules path; fail-open error paths unchanged

## Phase 3 — Code: full Shipping Rules admin management (CRUD)
New admin capability so pincode rules are editable without SQL:

1. **API** `src/app/api/admin/shipping-rules/route.ts`
   - GET (list), POST (create); `[ruleId]/route.ts` PATCH (edit), DELETE
   - Guard with `requireAdminRequest()`; validate fields: state?, pincode_range_start/end?, minimum_order_value ≥ 0, maximum_weight_grams ≥ 0, charge ≥ 0, restricted bool, is_active bool; `logAdminAction` audit entries
2. **UI** new "Shipping Rules" card on `/admin/settings/page.tsx`
   - Table of rules (state / pincode range / min order / charge / restricted / active) + Add/Edit modal + delete confirm
   - Loads via GET on mount; saves via POST/PATCH/DELETE
3. Keep existing Delivery Charges card + add third input "Shop Minimum Order Value (₹)" (hydrate/validate/PUT) and mirror field in `/admin/settings/business/page.tsx`.

## Phase 4 — Verify & ship
- `npx tsc --noEmit`; eslint touched files
- Manual smoke: set global min in admin → checkout below/above threshold; pincode rule override still wins
- Commit(s): `feat(settings): shop-wide delivery minimum + admin-managed shipping rules` (exclude .env, no secrets)
- Push to `origin master`

## Security notes
- Connection string used only in-memory/transient commands; never written to files or git
- Recommend: rotate the DB password afterwards (exposed in chat), and consider `supabase login` token instead
