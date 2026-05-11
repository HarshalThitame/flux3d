export default function SkeletonBlock({
  className,
}: {
  className: string
}) {
  return <div className={`animate-pulse rounded-xl bg-gray-200 ${className}`} />
}
