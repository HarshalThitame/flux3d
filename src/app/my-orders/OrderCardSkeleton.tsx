export function OrderCardSkeleton() {
  return (
    <div className="order-list-card animate-pulse" aria-hidden="true">
      <div className="flex gap-3 p-4">
        {/* Status dot placeholder */}
        <div className="flex flex-col items-center pt-1">
          <div className="h-3 w-3 flex-shrink-0 rounded-full bg-gray-200" />
        </div>

        {/* Content area */}
        <div className="min-w-0 flex-1">
          {/* Row 1: Title + Status badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-4 w-3/4 rounded-md bg-gray-200" />
              <div className="h-3 w-20 rounded bg-gray-100" />
            </div>
            <div className="h-5 w-16 flex-shrink-0 rounded-full bg-gray-200" />
          </div>

          {/* Row 2: Order ID + Amount */}
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="h-3 w-24 rounded bg-gray-100" />
            <div className="h-5 w-14 flex-shrink-0 rounded bg-gray-200" />
          </div>

          {/* Row 3: Date + Material + Color */}
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="h-3 w-20 rounded bg-gray-100" />
            <div className="h-3 w-16 rounded bg-gray-100" />
            <div className="h-3 w-12 rounded bg-gray-100" />
          </div>

          {/* Row 4: Item count badge */}
          <div className="mt-2 flex justify-end">
            <div className="h-4 w-14 rounded-full bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function OrderCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <OrderCardSkeleton key={i} />
      ))}
    </div>
  )
}
