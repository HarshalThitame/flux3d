# 3D Shop Orders - Mobile Slim UI Plan

## Overview
Create a slim, modern mobile-only version of the 3D Shop Orders pages that mirrors the simplicity of the My Orders page while keeping essential shop-specific information.

## Research Findings

### My Orders Page (`/my-orders`) - Mobile Pattern
- **Simple card design** with 4 rows of info
- **Row 1:** File name + status badge
- **Row 2:** Order ID + Amount (₹)
- **Row 3:** Date · Material · Color
- **Row 4:** Item count badge
- **Left column:** Status dot indicator
- **No hero section, no metrics** - just a clean search + date filter bar
- Padding: `px-4 pb-24 pt-6`
- Animations: Simple `animate-slide-in-up`

### 3D Shop Orders Page - Current Mobile Pattern
- **Heavy hero section** with large typography, metrics, spend tracking
- **Sticky filter tabs** (All/Active/Delivered/Cancelled/Returns)
- **Complex cards** with fulfillment progress bars, product images, expandable items
- **Framer Motion animations** throughout
- Much more information-dense

## Implementation Plan

### Files to Create (2 new files)

#### 1. `/src/app/3d-shop/orders/ShopOrdersMobile.tsx`
**Purpose:** Slim mobile-only order list component

**Features:**
- Minimal card design similar to My Orders
- Shows: Product name, status badge, order number, date, item count, total amount, payment badge
- Simple filter dropdown (instead of sticky tabs)
- No hero section, no metrics, no expandable items
- Uses CSS variables and existing design tokens
- Loading skeleton (simplified)
- Empty state with CTA
- Error state

**Card Layout:**
```
┌─────────────────────────────────┐
│ ●  Product Name          Status │
│    #Order Number     [Payment]  │
│    Placed Date · 3 items   ₹199 │
└─────────────────────────────────┘
```

#### 2. `/src/app/3d-shop/order/[orderId]/ShopOrderDetailMobile.tsx`
**Purpose:** Slim mobile-only order detail component

**Features:**
- Compact hero with order number, status badges
- Horizontal scrollable metrics (Items, Total, Shipping, Destination)
- Simplified fulfillment timeline (compact grid)
- Slim item cards (thumbnail, name, variant, qty, price)
- Compact address section
- Payment info
- Sticky bottom action bar (Cancel/Return/Continue Shopping)
- No recommendations, no side-by-side layouts

**Layout:**
```
┌─────────────────────────────────┐
│ ← Back    Order Detail          │
│ #Order Number                   │
│ Status · Payment                │
├─────────────────────────────────┤
│ [→ Items  → Total  → Ship  →]  │
├─────────────────────────────────┤
│ Fulfillment Timeline (compact)  │
├─────────────────────────────────┤
│ Items Ordered (slim cards)      │
├─────────────────────────────────┤
│ Delivery Address                │
├─────────────────────────────────┤
│ Payment Info                    │
├─────────────────────────────────┤
│ [Sticky: Cancel · Track · Shop] │
└─────────────────────────────────┘
```

### Files to Modify (2 existing files)

#### 3. `/src/app/3d-shop/orders/page.tsx`
**Changes:**
- Add responsive rendering: mobile shows `ShopOrdersMobile`, desktop shows `ShopOrdersClient`
- Use CSS `hidden md:block` / `md:hidden` pattern for switching

#### 4. `/src/app/3d-shop/order/[orderId]/page.tsx`
**Changes:**
- Add responsive rendering: mobile shows `ShopOrderDetailMobile`, desktop shows `ShopOrderDetailClient`
- Use CSS `hidden md:block` / `md:hidden` pattern for switching

## Design Specifications

### Mobile Card Design
- **Padding:** `p-4`
- **Border radius:** `rounded-2xl`
- **Background:** `bg-white/88 backdrop-blur-xl`
- **Shadow:** `shadow-[var(--shadow-sm)]`
- **Typography:**
  - Product name: `text-sm font-bold`
  - Order number: `text-xs font-bold text-[var(--text-muted)]`
  - Date/items: `text-xs font-bold text-[var(--text-muted)]`
  - Total: `text-sm font-black text-[var(--brand-primary)]`
  - Status badge: `text-[10px] font-black`
  - Payment badge: `text-[10px] font-black`

### Mobile Detail Design
- **Page padding:** `px-4 pb-20 pt-5 md:px-8 md:pt-6 lg:px-16`
- **Section spacing:** `space-y-4`
- **Section cards:** `rounded-2xl border border-[var(--border-light)] bg-white/88 p-4 shadow-sm backdrop-blur-xl`
- **Section headers:** `text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand-primary)]` + `text-base font-bold`
- **Metrics:** Horizontal scroll, `min-w-[100px]` each, compact icons
- **Timeline:** Compact grid `grid-cols-4` on mobile, step icons `h-7 w-7`
- **Item cards:** `h-14 w-14` thumbnails, compact info layout
- **Sticky bottom bar:** Fixed position, full-width action buttons

## Responsive Breakpoints
- **Mobile:** `< 768px` (md breakpoint) - shows slim components
- **Tablet/Desktop:** `>= 768px` - shows full components

## Tradeoffs
- **Mobile-first**: Desktop keeps the rich experience
- **Progressive enhancement**: Mobile gets essential info, desktop gets full details
- **No data loss**: All info still accessible via "View Order" detail page
- **Performance**: Fewer animations, simpler components on mobile
- **Moderate card info**: Includes payment badge and total on card (not ultra-minimal)
- **Dropdown filter**: Simpler than tabs, matches My Orders pattern

## Implementation Order
1. Create `ShopOrdersMobile.tsx`
2. Create `ShopOrderDetailMobile.tsx`
3. Update `3d-shop/orders/page.tsx` with responsive switching
4. Update `3d-shop/order/[orderId]/page.tsx` with responsive switching
5. Test on mobile viewport
