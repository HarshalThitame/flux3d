# FINAL IMPLEMENTATION PLAN
## Product Dimensions + Multi-Image Variants (Enterprise Grade)

Based on your answers, here is the finalized, production-ready plan.

---

## Your Requirements (Confirmed)

| # | Requirement | Decision |
|---|------------|----------|
| 1 | Dimensions at **variant option value level** | e.g., "Large" → 25×20×30 cm. All SKUs with "Large" auto-inherit. |
| 2 | **Both** option-level AND SKU-level images | Color gallery (all Red variants) + specific SKU gallery (Red-Large). |
| 3 | **Pure physical dimensions only** | Length × Width × Height, Weight, Volume. No 3D-printing meta. |
| 4 | **Build both together** | One consolidated feature branch. |
| 5 | **Enterprise-grade unit system** | Metric + Imperial with automatic conversion and display. |

---

## 1. DATABASE SCHEMA (PostgreSQL)

### New Table: `shelf_variant_option_dimensions`
Stores dimensions per option value (e.g., "Size: Large").

```sql
CREATE TABLE public.shelf_variant_option_dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.shelf_products(id) ON DELETE CASCADE,
  option_name TEXT NOT NULL,           -- "Size"
  option_value TEXT NOT NULL,          -- "Large"
  dimensions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, option_name, option_value)
);
```

**`dimensions` JSONB shape (validated by Zod):**
```typescript
{
  length_mm: number | null,     // stored in millimeters (base unit)
  width_mm: number | null,
  height_mm: number | null,
  weight_g: number | null,      // stored in grams (base unit)
  volume_cc: number | null,     // auto-calculated: (L × W × H) / 1000
  dimension_unit: 'mm' | 'cm' | 'inch',   // display unit preference
  weight_unit: 'g' | 'kg' | 'oz' | 'lb'   // display unit preference
}
```

### New Table: `shelf_variant_option_images`
Stores images per option value (e.g., "Color: Red").

```sql
CREATE TABLE public.shelf_variant_option_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.shelf_products(id) ON DELETE CASCADE,
  option_name TEXT NOT NULL,           -- "Color"
  option_value TEXT NOT NULL,          -- "Red"
  image_url TEXT NOT NULL,
  alt_text TEXT,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### New Table: `shelf_sku_images`
Stores images per specific SKU combination (e.g., "Red + Large").

```sql
CREATE TABLE public.shelf_sku_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id UUID NOT NULL REFERENCES public.shelf_skus(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Add Column: `shelf_products.default_dimensions`
```sql
ALTER TABLE public.shelf_products ADD COLUMN default_dimensions JSONB DEFAULT NULL;
```
Fallback when no option-level dimension is defined.

### Indexes
```sql
CREATE INDEX idx_variant_option_dims_product ON public.shelf_variant_option_dimensions(product_id);
CREATE INDEX idx_variant_option_images_product ON public.shelf_variant_option_images(product_id);
CREATE INDEX idx_sku_images_sku_id ON public.shelf_sku_images(sku_id);
```

---

## 2. TYPE SYSTEM (TypeScript)

### New types in `src/lib/shop/admin-types.ts`

```typescript
export type DimensionUnit = 'mm' | 'cm' | 'inch'
export type WeightUnit = 'g' | 'kg' | 'oz' | 'lb'

export type ProductDimensions = {
  length_mm: number | null
  width_mm: number | null
  height_mm: number | null
  weight_g: number | null
  volume_cc: number | null
  dimension_unit: DimensionUnit
  weight_unit: WeightUnit
}

export type ShopVariantOptionDimension = {
  id: string
  product_id: string
  option_name: string
  option_value: string
  dimensions: ProductDimensions
  created_at: string | null
  updated_at: string | null
}

export type ShopVariantOptionImage = {
  id: string
  product_id: string
  option_name: string
  option_value: string
  image_url: string
  alt_text: string | null
  display_order: number
  is_primary: boolean
  created_at: string | null
}

export type ShopSkuImage = {
  id: string
  sku_id: string
  image_url: string
  alt_text: string | null
  display_order: number
  is_primary: boolean
  created_at: string | null
}
```

---

## 3. UNIT CONVERSION ENGINE

### New utility file: `src/lib/shop/dimensions.ts`

**Core conversion functions (enterprise-grade precision):**

```typescript
// Length: mm is base unit
const LENGTH_FACTORS = { mm: 1, cm: 10, inch: 25.4 }

// Weight: g is base unit
const WEIGHT_FACTORS = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 }

export function convertLength(value_mm: number | null, toUnit: DimensionUnit): number | null {
  if (value_mm == null) return null
  return value_mm / LENGTH_FACTORS[toUnit]
}

export function convertWeight(value_g: number | null, toUnit: WeightUnit): number | null {
  if (value_g == null) return null
  return value_g / WEIGHT_FACTORS[toUnit]
}

export function formatDimensions(
  dims: ProductDimensions,
  displayUnit?: DimensionUnit,
  weightDisplayUnit?: WeightUnit
): string {
  // Returns "25 × 20 × 30 cm · 350 g"
}

export function computeVolume(length_mm: number, width_mm: number, height_mm: number): number {
  return (length_mm * width_mm * height_mm) / 1000  // cubic centimeters
}
```

**Why this matters for enterprise:**
- Shipping APIs (ShipRocket, Delhivery) require dimensions in cm + weight in kg.
- International customers expect inches/lbs.
- Product specs need consistent display formatting.

---

## 4. API ROUTES

### `POST /api/3d-shop/admin/products/[id]/variant-dimensions`
Batch create/update dimensions for option values.

**Payload:**
```json
{
  "dimensions": [
    { "option_name": "Size", "option_value": "Small (10cm)", "dimensions": { "length_mm": 100, "width_mm": 80, "height_mm": 120, "weight_g": 45, "dimension_unit": "mm", "weight_unit": "g" } },
    { "option_name": "Size", "option_value": "Medium (15cm)", "dimensions": { "length_mm": 150, "width_mm": 120, "height_mm": 180, "weight_g": 120, "dimension_unit": "mm", "weight_unit": "g" } },
    { "option_name": "Size", "option_value": "Large (25cm)", "dimensions": { "length_mm": 250, "width_mm": 200, "height_mm": 300, "weight_g": 350, "dimension_unit": "mm", "weight_unit": "g" } }
  ]
}
```

**Logic:**
1. Upsert into `shelf_variant_option_dimensions` using `ON CONFLICT (product_id, option_name, option_value) DO UPDATE`.
2. Auto-calculate `volume_cc` server-side.
3. Mark `updated_at`.

### `GET /api/3d-shop/admin/products/[id]/variant-dimensions`
Returns all dimensions for the product.

### `DELETE /api/3d-shop/admin/products/[id]/variant-dimensions`
Delete specific dimension entries by IDs.

---

### `POST /api/3d-shop/admin/products/[id]/variant-images`
Upload and attach images to option values.

**Payload:** FormData with `option_name`, `option_value`, `imageFile`, `alt_text`, `display_order`.

**Logic:**
1. Upload to Supabase Storage (`shop-images` bucket, path: `shop/products/{productId}/variants/{optionName}/{timestamp}-{filename}`).
2. Insert into `shelf_variant_option_images`.
3. If `is_primary=true`, unset primary on other images for same option value.

### `PATCH /api/3d-shop/admin/products/[id]/variant-images/[imageId]`
Update alt text, display order, or primary flag.

### `DELETE /api/3d-shop/admin/products/[id]/variant-images/[imageId]`
Remove image from storage + database.

---

### `POST /api/3d-shop/admin/skus/[id]/images`
Upload images to a specific SKU.

**Payload:** FormData with `imageFile`, `alt_text`, `display_order`.

**Storage path:** `shop/products/{productId}/skus/{skuId}/{timestamp}-{filename}`.

### `PATCH /api/3d-shop/admin/skus/[id]/images/[imageId]`
Update SKU image metadata.

### `DELETE /api/3d-shop/admin/skus/[id]/images/[imageId]`
Remove SKU image.

---

## 5. ADMIN UI CHANGES

### A. New Section: `DimensionsSection.tsx`
**Placement:** Between `BasicInfoSection` and `MediaGallerySection`.

**UI Components:**
1. **Default Product Dimensions** — L, W, H, Weight inputs. Unit selector dropdown (Metric / Imperial).
2. **Auto-calculate Volume** — Read-only field showing `volume_cc`, computed live.
3. **Variant Option Dimensions Grid** — When variant options exist, show a table:
   | Option | Value | Length | Width | Height | Weight |
   |--------|-------|--------|-------|--------|--------|
   | Size   | Small | 10     | 8     | 12     | 45g    |
   | Size   | Large | 25     | 20    | 30     | 350g   |
   
   Inline editable cells. Tab to navigate.
4. **Bulk Apply** — "Apply default dimensions to all unset values" button.

### B. Enhanced: `VariantOptionsSection.tsx`
**Additions:**
1. **Per-Value Dimension Badge** — Each option value shows a small dimension chip (e.g., "📐 25×20×30cm") if dimensions are set. Click to edit inline.
2. **Per-Value Image Gallery** — "🖼️ Manage Images" button next to each option value (especially for Color swatches).
   - Opens a modal with drag-drop upload zone.
   - Gallery grid with drag-to-reorder.
   - Alt text input per image.
   - Star icon to set primary image.
   - Trash icon to delete.
3. **Preset Templates Integration** — When using product templates, pre-fill dimensions if the template includes them.

### C. Enhanced: `SkuManagerSection.tsx`
**Additions:**
1. **Multi-Image Gallery Column** — Replace single `SkuImageUpload` with a gallery thumbnail strip.
   - Shows first 3 images as small thumbnails.
   - "+N more" badge if >3.
   - Click opens full gallery modal.
2. **Inherited Dimension Display** — Each SKU row shows computed dimensions (inherited from option values + product default). Hover shows the inheritance chain.
3. **Image Removal** — Add a small "×" on each thumbnail to remove.
4. **Bulk Actions** — Add "Set dimensions for selected SKUs" to bulk toolbar.

### D. Updated: `editor-context.tsx`
**State additions:**
```typescript
interface EditorState {
  // ... existing ...
  variantDimensions: ShopVariantOptionDimension[]
  variantOptionImages: ShopVariantOptionImage[]
  skuImages: Record<string, ShopSkuImage[]>   // keyed by sku_id
}
```

**New actions:**
- `setVariantDimensions(dims)`
- `addVariantOptionImage(optionName, optionValue, file)`
- `removeVariantOptionImage(imageId)`
- `reorderVariantOptionImages(optionName, optionValue, newOrder)`
- `addSkuImage(skuId, file)`
- `removeSkuImage(imageId)`
- `reorderSkuImages(skuId, newOrder)`
- `updateSkuImageAlt(imageId, altText)`

---

## 6. STOREFRONT BEHAVIOR

### Product Page Gallery (WooCommerce-Style)
**Image display priority (top to bottom):**
1. If a **specific SKU** is selected AND has `shelf_sku_images` → show SKU images first.
2. If a **variant option** is selected (e.g., "Red") AND has `shelf_variant_option_images` → show option images next.
3. Fall back to **product-level** `image_urls` gallery.

**Dynamic behavior:**
- Customer clicks "Red" color swatch → gallery instantly swaps to Red images.
- Customer then picks "Large" size → if Red-Large has SKU-specific images, append them.
- Customer clears selection → revert to product gallery.
- Primary image from each tier becomes the thumbnail/hero image.

### Product Specifications Panel
**New tab/section on product page:**
```
📐 Specifications
─────────────────
Dimensions (Large):    25 × 20 × 30 cm  (9.8 × 7.9 × 11.8 in)
Weight (Large):        350 g  (12.3 oz)
Volume:                15,000 cm³
Material:              PLA
Finish:                Matte
```

**Dynamic updates:**
- When customer changes Size variant, specs panel updates live.
- Unit toggle: "Show in: [Metric] [Imperial]"
- If no dimensions set for selected variant, show "Contact us for exact dimensions" fallback.

---

## 7. MIGRATION & BACKWARD COMPATIBILITY

### Migration File
`supabase/migrations/20260810000000_product_dimensions_and_variant_galleries.sql`

Contains:
1. Create 3 new tables.
2. Add `default_dimensions` to `shelf_products`.
3. Create indexes.
4. **Data migration:** Convert existing `variant_image_url` on `shelf_skus` into a single entry in `shelf_sku_images` with `is_primary=true` and `display_order=0`.
5. Add triggers for `updated_at`.

### Backward Compatibility
- `variant_image_url` on `shelf_skus` is **deprecated but NOT dropped immediately**.
- Storefront reads from new tables first; falls back to `variant_image_url` if no `shelf_sku_images` exist.
- Admin UI migrates transparently — old single upload becomes gallery with one image.
- After 30 days / stable release, a follow-up migration can drop `variant_image_url`.

---

## 8. FILE-LEVEL IMPLEMENTATION CHECKLIST

### Phase 1: Database & Types
- [ ] `supabase/migrations/20260810000000_product_dimensions_and_variant_galleries.sql`
- [ ] `src/lib/shop/admin-types.ts` — add `ProductDimensions`, `ShopVariantOptionDimension`, `ShopVariantOptionImage`, `ShopSkuImage`
- [ ] `src/lib/shop/dimensions.ts` — conversion engine + formatting

### Phase 2: API Layer
- [ ] `src/app/api/3d-shop/admin/products/[id]/variant-dimensions/route.ts` (GET, POST, DELETE)
- [ ] `src/app/api/3d-shop/admin/products/[id]/variant-images/route.ts` (GET, POST, PATCH, DELETE)
- [ ] `src/app/api/3d-shop/admin/skus/[id]/images/route.ts` (GET, POST, PATCH, DELETE)

### Phase 3: Admin Editor State
- [ ] `src/app/admin/3d-shop/_components/product-editor/editor-context.tsx` — add new state + actions

### Phase 4: Admin Editor UI
- [ ] `src/app/admin/3d-shop/_components/product-editor/sections/DimensionsSection.tsx` — NEW
- [ ] `src/app/admin/3d-shop/_components/product-editor/sections/VariantOptionsSection.tsx` — ADD dimension editor + image gallery
- [ ] `src/app/admin/3d-shop/_components/product-editor/sections/SkuManagerSection.tsx` — ADD multi-image gallery + dimension display
- [ ] `src/app/admin/3d-shop/_components/product-editor/sections/MediaGallerySection.tsx` — minor updates for integration

### Phase 5: Storefront
- [ ] `src/app/shop/[slug]/page.tsx` or gallery component — update gallery swap logic
- [ ] `src/components/shop/ProductSpecs.tsx` — NEW specifications panel
- [ ] `src/lib/shop/queries.ts` — update product fetch to include dimensions + variant images

### Phase 6: Templates & Defaults
- [ ] `src/lib/shop/templates.ts` — add `default_dimensions` to each template

### Phase 7: Testing & Polish
- [ ] Test dimension inheritance (product → option → SKU)
- [ ] Test image gallery swap on variant selection
- [ ] Test unit conversion accuracy
- [ ] Test migration of existing `variant_image_url` data

---

## 9. ESTIMATED COMPLEXITY

| Component | Effort | Risk |
|-----------|--------|------|
| Database schema + migration | Low | Low |
| Unit conversion engine | Low | Low |
| API routes (3 routes) | Medium | Low |
| Editor context state expansion | Medium | Medium |
| DimensionsSection UI | Medium | Low |
| VariantOptionsSection enhancements | High | Medium |
| SkuManagerSection multi-image | High | Medium |
| Storefront gallery swap logic | High | High |
| Specs panel + unit toggle | Medium | Low |
| **TOTAL** | **High (8-12 hours)** | **Manageable** |

---

## 10. ENTERPRISE FEATURES INCLUDED

| Feature | Why It's Enterprise-Grade |
|---------|--------------------------|
| **Unit conversion engine** | Supports global markets (US, UK, EU, India) |
| **3-tier inheritance** | Reduces admin workload — set once at option level, applies to all SKUs |
| **JSONB dimensions** | Extensible — add `diameter`, `inner_diameter` later without migration |
| **Separate image tables** | Referential integrity, indexed queries, no orphaned data |
| **Alt text per image** | SEO + WCAG accessibility compliance |
| **Drag-to-reorder** | Intuitive admin UX matching Shopify/Magento |
| **Backward-compatible migration** | Zero downtime, existing products unaffected |
| **Auto-volume calculation** | Feeds directly into shipping cost APIs |
| **Primary image flag** | Controls hero/thumbnail image per variant |

---

**Ready to proceed?** Confirm and I'll begin implementation immediately — starting with the database migration and type system, then building outward to the UI.