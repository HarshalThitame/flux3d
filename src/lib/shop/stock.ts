// ============================================================================
// 3D Shop Stock Management — server-side helpers
// ============================================================================
// Shared types, status classification, and query builders for the admin
// Stock Management workspace (/admin/3d-shop/stock).
// ============================================================================

import type { StockAlertSeverity, StockAlertType, StockMovementReasonType } from '../../../types/database'

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'unavailable' | 'no_skus'

export type StockSkuRow = {
  id: string
  product_id: string
  sku_code: string
  variant_combination: Record<string, string | boolean>
  price: number
  compare_at_price: number | null
  stock_quantity: number
  reserved_quantity: number
  low_stock_threshold: number | null
  reorder_point: number | null
  weight_grams: number | null
  variant_image_url: string | null
  is_available: boolean | null
  pre_order_eta: string | null
  product_name: string | null
  category_name: string | null
  product_thumbnail: string | null
  is_archived: boolean | null
  stock_status: StockStatus
  available_quantity: number
}

export type StockOverview = {
  totalSkus: number
  totalProducts: number
  unitsOnHand: number
  unitsReserved: number
  stockValue: number
  lowStockCount: number
  outOfStockCount: number
  unavailableCount: number
  activeReservations: number
  expiringSoonReservations: number
  openAlerts: number
  alertProducts: number
}

export type StockReservationRow = {
  id: string
  sku_id: string
  product_id: string
  order_id: string
  order_number: string | null
  quantity: number
  status: 'active' | 'converted' | 'expired' | 'cancelled'
  reserved_at: string
  expires_at: string
  converted_at: string | null
  cancelled_at: string | null
  sku_code: string | null
  variant_combination: Record<string, string | boolean>
  product_name: string | null
  product_thumbnail: string | null
  total_amount: number | null
  payment_status: string | null
}

export type StockMovementRow = {
  id: string
  sku_id: string
  product_id: string
  quantity_delta: number
  previous_quantity: number
  new_quantity: number
  reason_type: StockMovementReasonType
  reference_id: string | null
  actor_id: string | null
  actor_name: string | null
  note: string | null
  created_at: string
  sku_code: string | null
  product_name: string | null
  product_thumbnail: string | null
}

export type StockAlertRow = {
  id: string
  sku_id: string
  product_id: string
  alert_type: StockAlertType
  severity: StockAlertSeverity
  message: string
  status: 'open' | 'acknowledged' | 'resolved'
  stock_at_alert: number
  notified_at: string | null
  acknowledged_at: string | null
  resolved_at: string | null
  created_at: string
  sku_code: string | null
  variant_combination: Record<string, string | boolean>
  product_name: string | null
  product_thumbnail: string | null
}

// ============================================================================
// Status classification
// ============================================================================

export function getThreshold(sku: Pick<StockSkuRow, 'reorder_point' | 'low_stock_threshold'>): number {
  const reorderPoint = sku.reorder_point
  if (reorderPoint !== null && reorderPoint !== undefined && reorderPoint > 0) {
    return reorderPoint
  }
  return sku.low_stock_threshold ?? 5
}

export function getSkuStockStatus(
  stockQuantity: number,
  threshold: number,
  isAvailable: boolean | null
): StockStatus {
  if (isAvailable === false) return 'unavailable'
  if (stockQuantity <= 0) return 'out_of_stock'
  if (stockQuantity <= threshold) return 'low_stock'
  return 'in_stock'
}

export const STOCK_REASON_LABELS: Record<StockMovementReasonType, string> = {
  order_placed: 'Order placed',
  order_cancelled: 'Order cancelled',
  order_returned: 'Order returned',
  reservation_expired: 'Reservation expired',
  manual_adjust: 'Manual adjustment',
  restock: 'Restock',
  release: 'Reservation released',
  system: 'System',
}

export const ALERT_TYPE_LABELS: Record<StockAlertType, string> = {
  low_stock: 'Low stock',
  out_of_stock: 'Out of stock',
}

// ============================================================================
// Query builders
// ============================================================================

export function buildStockSkuSelect() {
  return `
    s.id,
    s.product_id,
    s.sku_code,
    s.variant_combination,
    s.price,
    s.compare_at_price,
    s.stock_quantity,
    s.reserved_quantity,
    s.low_stock_threshold,
    s.reorder_point,
    s.weight_grams,
    s.variant_image_url,
    s.is_available,
    s.pre_order_eta,
    p.name as product_name,
    p.thumbnail_url as product_thumbnail,
    p.is_archived,
    c.name as category_name
  `
}

export function buildStockSkuEmbed() {
  return `
    shelf_skus(
      id, product_id, sku_code, variant_combination, price, compare_at_price,
      stock_quantity, reserved_quantity, low_stock_threshold, reorder_point,
      weight_grams, variant_image_url, is_available, pre_order_eta,
      product:shelf_products(name, thumbnail_url, is_archived, category:shelf_categories(name))
    )
  `
}
