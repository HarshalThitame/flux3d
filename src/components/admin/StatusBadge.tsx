import type { OrderStatus, QuoteStatus, UserRole } from '@/lib/admin/types'
import { getOrderStatusClasses } from '@/lib/orders'

type StatusBadgeProps = {
  status: OrderStatus | QuoteStatus | UserRole | string | null | undefined
}

const statusIcons: Record<string, string> = {
  pending: '⏳',
  confirmed: '✅',
  printing: '🖨',
  shipped: '📦',
  delivered: '✅',
  completed: '🎉',
  cancelled: '❌',
  admin: '👑',
  operator: '🔧',
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const rawLabel = typeof status === 'string' && status.trim().length > 0 ? status : 'Unknown'
  const normalized = rawLabel.toLowerCase()
  const label = typeof status === 'string' ? rawLabel.replace(/[-_]+/g, ' ') : rawLabel
  const classes =
    normalized === 'admin'
      ? 'border-emerald-400/20 bg-emerald-50 text-emerald-600'
      : normalized === 'operator'
        ? 'border-cyan-200 bg-cyan-50 text-cyan-600'
        : normalized === 'paused'
          ? 'border-rose-200 bg-rose-50 text-rose-600'
          : ['pending', 'confirmed', 'printing', 'shipped', 'delivered', 'completed', 'cancelled'].includes(normalized)
            ? getOrderStatusClasses(normalized as OrderStatus)
            : 'border-[#6d28d9]/10 bg-gray-100 text-[#6F7192]'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${classes}`}>
      {statusIcons[normalized] && <span className="text-[9px]">{statusIcons[normalized]}</span>}
      {label}
    </span>
  )
}
