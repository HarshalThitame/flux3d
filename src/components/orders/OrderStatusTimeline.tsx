import { orderProgressStatuses, getOrderStatusLabel, type OrderStatus } from '@/lib/orders'

const statusIcons: Record<string, string> = {
  pending: '📋',
  confirmed: '✅',
  printing: '🖨️',
  shipped: '📦',
  delivered: '🚚',
  completed: '🎉',
}

function getStatusIndex(status: OrderStatus): number {
  if (status === 'cancelled') return -1
  return orderProgressStatuses.indexOf(status as Exclude<OrderStatus, 'cancelled'>)
}

export function OrderStatusTimeline({ currentStatus }: { currentStatus: OrderStatus }) {
  const currentIndex = getStatusIndex(currentStatus)
  const isCancelled = currentStatus === 'cancelled'

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-slate-50 px-4 py-3">
        <span className="text-lg">{statusIcons.cancelled}</span>
        <div>
          <div className="text-sm font-semibold text-slate-700">Order Cancelled</div>
          <div className="text-xs text-slate-500">This order has been cancelled</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Mobile: Horizontal scrollable timeline */}
      <div className="md:hidden">
        <div className="flex items-center gap-0 overflow-x-auto pb-2">
          {orderProgressStatuses.map((status, index) => {
            const isCompleted = index < currentIndex
            const isCurrent = index === currentIndex
            const label = getOrderStatusLabel(status)
            const icon = statusIcons[status] ?? '○'

            return (
              <div
                key={status}
                className="flex flex-shrink-0 items-center"
              >
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                      isCompleted
                        ? 'bg-gradient-to-br from-[#6d28d9] to-[#7c3aed] text-white shadow-md shadow-[#6d28d9]/30'
                        : isCurrent
                          ? 'bg-gradient-to-br from-[#6d28d9] to-[#7c3aed] text-white ring-4 ring-[#6d28d9]/20 shadow-lg shadow-[#6d28d9]/40 animate-pulse-glow'
                          : 'border-2 border-gray-200 bg-white text-gray-400'
                    }`}
                  >
                    {isCompleted ? '✓' : icon}
                  </div>
                  <span
                    className={`whitespace-nowrap text-[10px] font-medium transition-colors ${
                      isCompleted || isCurrent ? 'text-[#6d28d9]' : 'text-gray-400'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {index < orderProgressStatuses.length - 1 && (
                  <div className="mx-1 mb-5 h-0.5 w-6 flex-shrink-0">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        index < currentIndex
                          ? 'bg-gradient-to-r from-[#6d28d9] to-[#7c3aed]'
                          : 'bg-gray-200'
                      }`}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Desktop: Vertical timeline */}
      <div className="hidden md:block">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center">
            {orderProgressStatuses.map((status, index) => {
              const isCompleted = index < currentIndex
              const isCurrent = index === currentIndex
              const icon = statusIcons[status] ?? '○'

              return (
                <div key={status} className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
                      isCompleted
                        ? 'bg-gradient-to-br from-[#6d28d9] to-[#7c3aed] text-white shadow-md shadow-[#6d28d9]/30'
                        : isCurrent
                          ? 'bg-gradient-to-br from-[#6d28d9] to-[#7c3aed] text-white ring-4 ring-[#6d28d9]/20 shadow-lg shadow-[#6d28d9]/40'
                          : 'border-2 border-gray-200 bg-white text-gray-400'
                    }`}
                  >
                    {isCompleted ? '✓' : icon}
                  </div>
                  {index < orderProgressStatuses.length - 1 && (
                    <div className="h-8 w-0.5">
                      <div
                        className={`h-full w-full rounded-full transition-all duration-500 ${
                          index < currentIndex
                            ? 'bg-gradient-to-b from-[#6d28d9] to-[#7c3aed]'
                            : 'bg-gray-200'
                        }`}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex flex-col justify-between py-1">
            {orderProgressStatuses.map((status, index) => {
              const isCompleted = index < currentIndex
              const isCurrent = index === currentIndex
              const label = getOrderStatusLabel(status)

              return (
                <div
                  key={status}
                  className={`flex flex-col gap-0.5 ${
                    index < orderProgressStatuses.length - 1 ? 'pb-8' : ''
                  }`}
                >
                  <span
                    className={`text-sm font-semibold transition-colors ${
                      isCompleted || isCurrent ? 'text-[#070b1d]' : 'text-gray-400'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
