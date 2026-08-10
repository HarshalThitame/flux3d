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
    case 'confirmed':
      return 'border-yellow-200 bg-yellow-50 text-yellow-700'
    case 'printing':
      return 'border-violet-200 bg-violet-50 text-violet-700'
    case 'shipped':
      return 'border-blue-200 bg-blue-50 text-blue-700'
    case 'delivered':
    case 'completed':
      return 'border-green-200 bg-green-50 text-green-700'
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

const HOUR = 60 * 60 * 1000

export function statusAgeMs(order: { status: OrderStatus; createdAt: string; statusTimestamps?: Partial<Record<OrderStatus, string>> | null }, now = Date.now()): number | null {
  const currentTimestamp = order.statusTimestamps?.[order.status]
  const startTimestamp = currentTimestamp ?? order.createdAt
  const startTime = new Date(startTimestamp).getTime()
  if (Number.isNaN(startTime)) return null
  return Math.max(0, now - startTime)
}

export function ageSlaLevel(status: OrderStatus, ageMs: number | null): 'ok' | 'warn' | 'overdue' {
  if (ageMs === null) return 'ok'
  const hours = ageMs / HOUR
  switch (status) {
    case 'pending':
    case 'confirmed':
      if (hours >= 48) return 'overdue'
      if (hours >= 24) return 'warn'
      return 'ok'
    case 'printing':
      if (hours >= 72) return 'overdue'
      if (hours >= 48) return 'warn'
      return 'ok'
    case 'shipped':
      if (hours >= 120) return 'overdue'
      if (hours >= 72) return 'warn'
      return 'ok'
    case 'delivered':
    case 'completed':
    case 'cancelled':
      return 'ok'
  }
}

export function ageSlaClass(level: 'ok' | 'warn' | 'overdue') {
  switch (level) {
    case 'ok':
      return 'border-green-200 bg-green-50 text-green-700'
    case 'warn':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'overdue':
      return 'border-red-200 bg-red-50 text-red-700'
  }
}

export function formatAge(ageMs: number | null) {
  if (ageMs === null) return '—'
  const minutes = Math.floor(ageMs / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days >= 1) return `${days}d ${hours % 24}h`
  if (hours >= 1) return `${hours}h ${minutes % 60}m`
  return `${minutes}m`
}

export function ageRowLeftBorderClass(level: 'ok' | 'warn' | 'overdue') {
  switch (level) {
    case 'warn':
      return 'border-l-amber-400'
    case 'overdue':
      return 'border-l-red-500'
    default:
      return 'border-l-transparent'
  }
}
