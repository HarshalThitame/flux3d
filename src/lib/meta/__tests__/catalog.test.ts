import { describe, expect, it } from 'vitest'
import { computeCatalogItemHash, toCatalogRetailerId } from '../catalog'

describe('toCatalogRetailerId', () => {
  it('keeps ids within Meta’s 100-char limit unchanged', () => {
    expect(toCatalogRetailerId('SKU-1')).toBe('SKU-1')
    const ninetyNine = 'A'.repeat(99)
    expect(toCatalogRetailerId(ninetyNine)).toBe(ninetyNine)
    const exactlyHundred = 'A'.repeat(100)
    expect(toCatalogRetailerId(exactlyHundred)).toBe(exactlyHundred)
  })

  it('shortens ids longer than 100 chars deterministically', () => {
    const long = 'RGB-LOTUS-FLOWER-TABLE-LAMP-3D-PRINTED-AMBIENT-LAMP-WITH-16-COLORS-REMOTE-SMART-HOME-SUPPORT-MODERN-DECOR-LAMP-FOR-LIVING-ROOM-BEDROOM-MT46D0VD-1'
    const short = toCatalogRetailerId(long)
    expect(short.length).toBeLessThanOrEqual(100)
    // Deterministic across calls
    expect(toCatalogRetailerId(long)).toBe(short)
    // Different suffixes must not collide
    expect(short).not.toBe(long)
  })

  it('produces distinct shortened ids for distinct long ids', () => {
    const a = toCatalogRetailerId('X'.repeat(145) + 'AAAA')
    const b = toCatalogRetailerId('X'.repeat(145) + 'BBBB')
    expect(a).not.toBe(b)
  })

  it('handles empty and short edge cases', () => {
    expect(toCatalogRetailerId('')).toBe('')
  })
})

describe('computeCatalogItemHash', () => {
  it('drops undefined fields so they do not affect the payload hash', () => {
    const base = {
      id: 'SKU-1',
      title: 'Vase',
      price: '100.00 INR',
      availability: 'in stock' as const,
      condition: 'new' as const,
      link: 'https://flux3d.in/3d-shop/product/vase?sku=SKU-1',
    }
    const withUndefined = { ...base, description: undefined }
    expect(computeCatalogItemHash(base)).toBe(computeCatalogItemHash(withUndefined))
  })

  it('changes when the payload changes', () => {
    const item = {
      id: 'SKU-1',
      title: 'Vase',
      price: '100.00 INR',
      availability: 'in stock' as const,
      condition: 'new' as const,
      link: 'https://flux3d.in/3d-shop/product/vase?sku=SKU-1',
    }
    const changed = { ...item, price: '200.00 INR' }
    expect(computeCatalogItemHash(item)).not.toBe(computeCatalogItemHash(changed))
  })
})