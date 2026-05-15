import type { OrderStatus } from '@/lib/orders'

export const ADMIN_ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'printing',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
]

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  printing: 'Printing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export function statusPillClass(status: OrderStatus) {
  switch (status) {
    case 'pending':
      return 'border-transparent bg-yellow-100 text-yellow-800'
    case 'confirmed':
      return 'border-transparent bg-blue-100 text-blue-800'
    case 'printing':
      return 'border-transparent bg-purple-100 text-purple-800'
    case 'shipped':
      return 'border-transparent bg-cyan-100 text-cyan-800'
    case 'delivered':
    case 'completed':
      return 'border-transparent bg-emerald-100 text-emerald-800'
    case 'cancelled':
      return 'border-transparent bg-red-100 text-red-800'
  }
}

export function postProcessingLabel(value?: string | null) {
  const rawValue = value?.trim() ?? ''
  const normalized = rawValue.toLowerCase()
  if (!normalized || normalized === 'none') return 'None'
  if (normalized.includes('paint')) return 'Sanded + Painted'
  if (normalized.includes('sand')) return 'Sanded'
  return rawValue
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function formatMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0)
  const hasFraction = Math.abs(amount % 1) > 0.005
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(Number.isFinite(amount) ? amount : 0)
}

export function formatNumber(value: number | null | undefined, digits = 2) {
  const number = Number(value ?? 0)
  return Number.isFinite(number)
    ? number.toLocaleString('en-IN', { maximumFractionDigits: digits })
    : '0'
}

export function formatDate(value?: string | null) {
  const timestamp = new Date(value ?? '').getTime()
  if (Number.isNaN(timestamp)) return '—'
  return new Date(timestamp).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(value?: string | null) {
  const timestamp = new Date(value ?? '').getTime()
  if (Number.isNaN(timestamp)) return '—'
  return new Date(timestamp).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatTime(value?: string | null) {
  const timestamp = new Date(value ?? '').getTime()
  if (Number.isNaN(timestamp)) return '—'
  return new Date(timestamp).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function safeText(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

const COLOR_FALLBACKS: Record<string, string> = {
  black: '#111827',
  white: '#F8FAFC',
  clear: '#E5E7EB',
  grey: '#6B7280',
  gray: '#6B7280',
  silver: '#C0C0C0',
  red: '#EF4444',
  orange: '#F97316',
  yellow: '#EAB308',
  gold: '#FACC15',
  green: '#22C55E',
  blue: '#3B82F6',
  purple: '#A855F7',
  pink: '#EC4899',
  brown: '#92400E',
}

export function colorToCss(value?: string | null) {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return '#6B7280'
  if (normalized.startsWith('#') || normalized.startsWith('rgb') || normalized.startsWith('hsl')) {
    return normalized
  }
  return COLOR_FALLBACKS[normalized] ?? normalized
}

export function discountPercent(total: number, discount: number) {
  if (total <= 0 || discount <= 0) return 0
  return (discount / total) * 100
}
