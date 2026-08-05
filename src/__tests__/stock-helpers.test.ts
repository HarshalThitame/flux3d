import { describe, expect, it } from 'vitest'
import {
  ALERT_TYPE_LABELS,
  STOCK_REASON_LABELS,
  getSkuStockStatus,
  getThreshold,
  type StockSkuRow,
} from '@/lib/shop/stock'

describe('getThreshold', () => {
  it('prefers reorder_point over low_stock_threshold', () => {
    const sku = { reorder_point: 8, low_stock_threshold: 5 } as Pick<
      StockSkuRow,
      'reorder_point' | 'low_stock_threshold'
    >
    expect(getThreshold(sku)).toBe(8)
  })

  it('falls back to low_stock_threshold', () => {
    const sku = { reorder_point: null, low_stock_threshold: 3 } as Pick<
      StockSkuRow,
      'reorder_point' | 'low_stock_threshold'
    >
    expect(getThreshold(sku)).toBe(3)
  })

  it('defaults to 5 when neither is set', () => {
    const sku = { reorder_point: null, low_stock_threshold: null } as Pick<
      StockSkuRow,
      'reorder_point' | 'low_stock_threshold'
    >
    expect(getThreshold(sku)).toBe(5)
  })

  it('ignores a zero reorder_point and falls back', () => {
    const sku = { reorder_point: 0, low_stock_threshold: 4 } as Pick<
      StockSkuRow,
      'reorder_point' | 'low_stock_threshold'
    >
    expect(getThreshold(sku)).toBe(4)
  })
})

describe('getSkuStockStatus', () => {
  it('marks unavailable SKUs first', () => {
    expect(getSkuStockStatus(100, 5, false)).toBe('unavailable')
    expect(getSkuStockStatus(0, 5, false)).toBe('unavailable')
  })

  it('marks zero stock as out of stock', () => {
    expect(getSkuStockStatus(0, 5, true)).toBe('out_of_stock')
  })

  it('marks stock at or below threshold as low stock', () => {
    expect(getSkuStockStatus(5, 5, true)).toBe('low_stock')
    expect(getSkuStockStatus(3, 5, true)).toBe('low_stock')
  })

  it('marks healthy stock as in stock', () => {
    expect(getSkuStockStatus(10, 5, true)).toBe('in_stock')
  })

  it('treats a null availability as available', () => {
    expect(getSkuStockStatus(10, 5, null)).toBe('in_stock')
    expect(getSkuStockStatus(0, 5, null)).toBe('out_of_stock')
  })
})

describe('label maps', () => {
  it('covers every movement reason type', () => {
    expect(STOCK_REASON_LABELS).toMatchObject({
      order_placed: expect.any(String),
      order_cancelled: expect.any(String),
      order_returned: expect.any(String),
      reservation_expired: expect.any(String),
      manual_adjust: expect.any(String),
      restock: expect.any(String),
      release: expect.any(String),
      system: expect.any(String),
    })
  })

  it('covers both alert types', () => {
    expect(ALERT_TYPE_LABELS).toMatchObject({
      low_stock: expect.any(String),
      out_of_stock: expect.any(String),
    })
  })
})
