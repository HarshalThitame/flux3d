import type { OrderStatus, QuoteStatus, UserRole } from '@/lib/admin/types'

type StatusBadgeProps = {
  status: OrderStatus | QuoteStatus | UserRole | string | null | undefined
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const label = typeof status === 'string' && status.trim().length > 0 ? status : 'Unknown'
  const normalized = label.toLowerCase()
  const classes =
    normalized === 'approved' || normalized === 'completed' || normalized === 'admin'
      ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
      : normalized === 'printing' || normalized === 'reviewed' || normalized === 'operator'
        ? 'border-sky-400/20 bg-sky-400/10 text-sky-100'
        : normalized === 'pending'
          ? 'border-amber-400/20 bg-amber-400/10 text-amber-100'
          : normalized === 'rejected' || normalized === 'paused'
            ? 'border-rose-400/20 bg-rose-400/10 text-rose-100'
            : 'border-white/10 bg-white/[0.04] text-[#d7ddf2]'

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium capitalize ${classes}`}>
      {label}
    </span>
  )
}
