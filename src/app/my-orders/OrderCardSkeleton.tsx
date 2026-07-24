export function OrderCardSkeleton() {
  return (
    <div className="order-list-card animate-pulse" aria-hidden="true">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="h-4 w-28 rounded-md bg-gray-200" />
            <div className="h-5 w-20 rounded-full bg-gray-200" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-20 rounded bg-gray-100" />
            <div className="h-3 w-px bg-gray-200" />
            <div className="h-3 w-24 rounded bg-gray-100" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="h-6 w-16 rounded bg-gray-200" />
          <div className="h-4 w-12 rounded-full bg-gray-100" />
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
