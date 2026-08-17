import type { BusinessSettings } from '@/lib/admin/business-settings'

const INR_SYMBOL = '₹'
const SYMBOL_BY_CURRENCY: Record<string, string> = {
  INR: INR_SYMBOL,
  USD: '$',
  EUR: '€',
  GBP: '£',
}

export function resolveCurrencySymbol(settings: Pick<BusinessSettings, 'currency' | 'currencySymbol'>): string {
  const currency = String(settings.currency ?? '').trim().toUpperCase()
  const stored = String(settings.currencySymbol ?? '').trim()

  if (currency) {
    const symbol = SYMBOL_BY_CURRENCY[currency]
    if (symbol) return symbol
  }

  if (stored && stored !== '?') return stored

  return currency ? (SYMBOL_BY_CURRENCY[currency] ?? '₹') : INR_SYMBOL
}

export function formatMoney(value: number, settings: Pick<BusinessSettings, 'currency' | 'currencySymbol'>): string {
  const symbol = resolveCurrencySymbol(settings)
  return `${symbol}${Math.round(Number(value ?? 0)).toLocaleString('en-IN')}`
}
