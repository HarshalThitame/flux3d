# 3D Shop Luxury Redesign Plan

## Objective
Modernize the entire 3D Shop module with a **premium, luxury boutique aesthetic** and integrate an **actual interactive 3D model viewer** for products.

## Design Direction
- **Style:** Light, airy, high-end boutique (Option D)
- **Palette:**
  - Background: warm ivory `#FDFCF8`
  - Primary accent: champagne gold `#C9A962`
  - Secondary accent: rich indigo `#4338CA`
  - Text: deep charcoal `#1C1917` / warm stone `#44403C`
- **Typography:** `Playfair Display` serif for headings, clean sans-serif for body
- **Motion:** Smooth, elegant scroll reveals via `framer-motion`; no jarring transitions
- **Surface:** Soft shadows, rounded corners, subtle gold borders, frosted glass accents

## Phase 1 — Data & Admin Foundation
1. Add `model_url TEXT` column to `shelf_products` table.
2. Update TypeScript types: `ShopProduct`, `ShopPublicProduct`, `ProductForm`.
3. Update public data fetchers to return `model_url`.
4. Update admin API endpoints to accept and persist `model_url`.
5. Create a dedicated 3D model upload API (`/api/3d-shop/admin/models/upload`) supporting GLB/GLTF, STL, OBJ, 3MF up to 50MB.
6. Add a 3D model upload/replace/remove section to the admin product editor.

## Phase 2 — 3D Viewer Infrastructure
1. Build a model-loader utility (`src/lib/shop/model-loader.ts`) that:
   - Fetches a model by URL
   - Detects format by extension or response headers
   - Loads GLB/GLTF via `GLTFLoader`, STL via `STLLoader`, OBJ via `OBJLoader`, 3MF via `3MFLoader`
   - Computes a reasonable camera framing box
2. Build `ProductModelViewer` component using `@react-three/fiber` + `drei`:
   - Light studio environment (ivory background)
   - Gold accent lighting
   - Auto-rotate, orbit controls, zoom, fullscreen expand
   - Dimension readout overlay
   - Loading and error states
3. Build `ProductModelModal` as a premium glass-bordered modal for card-level previews.
4. Build `ProductModelCanvas` for inline detail-page preview.
5. Integrate 3D preview into product cards (gold badge + modal) and product detail page (inline interactive section).

## Phase 3 — Luxury UI Redesign
1. Create `src/app/shop-luxury.css` with the full boutique token system.
2. Import `Playfair Display` in `src/app/layout.tsx` and expose it as a CSS variable.
3. Create `ShopShell` wrapper component that applies the `shop-luxury` class to all shop routes.
4. Update every shop page to use `ShopShell`:
   - `/3d-shop` (home)
   - `/3d-shop/product/[slug]` (product detail)
   - `/3d-shop/category/[slug]` (category browser)
   - `/3d-shop/search` (search results)
   - `/3d-shop/cart`
   - `/3d-shop/checkout`
   - `/3d-shop/wishlist`
   - `/3d-shop/orders`
   - `/3d-shop/orders/[id]`
   - `/3d-shop/order-success`
5. Redesign core components with luxury tokens:
   - `ProductCard`
   - `ShopProductDetailClient`
   - `ShopHomePage`
   - `ShopCategoryBrowser`
   - `ShopSearchResults`
   - `RecentlyViewedRow`
   - `ProductRecommendations`
   - `ShopVariantControls`
   - `QuantityStepper`
   - `NotifyMeForm`
6. Apply luxury tokens to transaction pages:
   - `ShopCartPageClient`
   - `ShopCheckoutClient`
   - `ShopWishlistClient`
   - `ShopOrdersClient` / `ShopOrdersMobile`
   - `ShopOrderDetailClient` / `ShopOrderDetailMobile`
   - `ShopOrderSuccessPage`
7. Finished remaining small components:
   - `ReviewModal` — gold star rating, gold submit button, luxury tokens
   - `QuickAddModal` — gold "Add to Cart", luxury tokens
   - `WishlistButton` — updated tokens and shadow
   - `ShopCartPromotions` (`ShopCouponInput`, `ShopAppliedOffer`) — gold coupon success, gold apply button
   - `ShopCartDrawer` — gold "Start Shopping"/"Proceed to Checkout", luxury tokens
   - `ShopCartNavButton` — updated tokens, gold badge
8. Updated all semantic colors across shop pages:
   - Emerald (success/in-stock) → gold
   - Violet (current/active) → indigo
   - Yellow (review prompt) → gold
   - Red (errors/destructive) → rose (kept for semantic clarity)
   - Status timeline dots (packed/shipped/delivered) kept as semantic indicators
9. Updated order detail pages (`ShopOrderDetailClient`, `ShopOrderDetailMobile`) — gold progress steps, luxury gradient header, hover border → gold
10. Updated `FeaturedProductsAd` — gold gradient header, gold button, gold badges, luxury card styling

## Phase 4 — Build & Quality Assurance
1. Run `npx tsc --noEmit` after every batch of changes.
2. Run `npx next build` and confirm all routes compile.
3. Visually verify key flows:
   - Home page → product detail with 3D viewer
   - Add to cart → cart → checkout
   - Wishlist → orders
4. Test the 3D model upload pipeline end-to-end via the admin editor.
5. Populate `model_url` for sample products to validate the viewer.

## Key Files
- `src/app/shop-luxury.css` — boutique design tokens
- `src/app/layout.tsx` — font import
- `src/components/shop/ShopShell.tsx` — shop wrapper
- `src/components/shop/ProductCard.tsx` — luxury product card
- `src/components/shop/ProductModelViewer.tsx` — 3D viewer
- `src/lib/shop/model-loader.ts` — model URL parser
- `src/components/shop/ShopProductDetailClient.tsx` — detail page
- `src/app/3d-shop/page.tsx` — home page
- `supabase/migrations/20260726100000_add_shelf_product_model_url.sql` — DB migration
- `src/app/api/3d-shop/admin/models/upload/route.ts` — 3D upload API
- `src/app/admin/3d-shop/_components/ShopProductEditor.tsx` — admin editor

## Current Status
- Foundation, 3D viewer, major redesign, and all remaining small components are complete.
- All old CSS tokens (`--text-primary`, `--bg-base`, `--border-brand`, `--brand-primary`, etc.) have been replaced with `--shop-*` luxury tokens across every shop component and page.
- Semantic colors (emerald, violet, yellow) mapped to gold/indigo for luxury consistency.
- `npx tsc --noEmit` and `npx next build` pass with zero errors.
- Remaining: populate `model_url` for existing products and visually verify end-to-end flows.
