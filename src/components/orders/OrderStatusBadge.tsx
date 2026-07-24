import { getOrderStatusClasses, getOrderStatusLabel, type OrderStatus } from '@/lib/orders'

const sizeClasses = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
}

const dotSizeClasses = {
  sm: 'w-1 h-1',
  md: 'w-1.5 h-1.5',
  lg: 'w-2 h-2',
}

export function OrderStatusBadge({
  status,
  size = 'md',
  showDot = true,
  className = '',
}: {
  status: OrderStatus
  size?: 'sm' | 'md' | 'lg'
  showDot?: boolean
  className?: string
}) {
  const baseClasses = getOrderStatusClasses(status)
  const label = getOrderStatusLabel(status)

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium capitalize ${baseClasses} ${sizeClasses[size]} ${className}`}
    >
      {showDot && (
        <span className={`rounded-full bg-current ${dotSizeClasses[size]}`} />
      )}
      <span>{label}</span>
    </span>
  )
}
