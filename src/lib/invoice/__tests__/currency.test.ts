import { describe, expect, it } from 'vitest'
import { formatMoney, resolveCurrencySymbol } from '../currency'
import type { BusinessSettings } from '@/lib/admin/business-settings'

describe('resolveCurrencySymbol', () => {
  it('returns ₹ for INR even when stored symbol is corrupted', () => {
    const settings = { currency: 'INR', currencySymbol: '?' } as BusinessSettings
    expect(resolveCurrencySymbol(settings)).toBe('₹')
  })

  it('returns ₹ for INR when symbol is empty', () => {
    const settings = { currency: 'INR', currencySymbol: '' } as BusinessSettings
    expect(resolveCurrencySymbol(settings)).toBe('₹')
  })

  it('returns ₹ for INR when symbol is missing', () => {
    const settings = { currency: 'INR' } as BusinessSettings
    expect(resolveCurrencySymbol(settings)).toBe('₹')
  })

  it('returns the proper symbol for USD/EUR/GBP', () => {
    expect(resolveCurrencySymbol({ currency: 'USD', currencySymbol: '?' } as BusinessSettings)).toBe('$')
    expect(resolveCurrencySymbol({ currency: 'EUR', currencySymbol: '?' } as BusinessSettings)).toBe('€')
    expect(resolveCurrencySymbol({ currency: 'GBP', currencySymbol: '?' } as BusinessSettings)).toBe('£')
  })

  it('falls back to the stored symbol for unknown currencies', () => {
    expect(resolveCurrencySymbol({ currency: 'XYZ', currencySymbol: '~' } as BusinessSettings)).toBe('~')
  })

  it('defaults to ₹ when no currency info is available', () => {
    expect(resolveCurrencySymbol({} as BusinessSettings)).toBe('₹')
  })
})

describe('formatMoney', () => {
  it('formats INR amounts with the rupee symbol and en-IN grouping', () => {
    const settings = { currency: 'INR', currencySymbol: '?' } as BusinessSettings
    expect(formatMoney(1250, settings)).toBe('₹1,250')
    expect(formatMoney(1234567, settings)).toBe('₹12,34,567')
  })

  it('rounds fractional amounts', () => {
    const settings = { currency: 'INR', currencySymbol: '₹' } as BusinessSettings
    expect(formatMoney(99.5, settings)).toBe('₹100')
    expect(formatMoney(99.4, settings)).toBe('₹99')
  })

  it('handles zero and negative amounts safely', () => {
    const settings = { currency: 'INR', currencySymbol: '₹' } as BusinessSettings
    expect(formatMoney(0, settings)).toBe('₹0')
    expect(formatMoney(-5, settings)).toBe('₹-5')
  })
})