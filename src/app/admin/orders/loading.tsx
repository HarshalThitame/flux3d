import SkeletonBlock from '@/components/admin/SkeletonBlock'

export default function AdminOrdersLoading() {
  return (
    <div className="space-y-6">
      <SkeletonBlock className="h-6 w-32" />
      <SkeletonBlock className="h-10 w-72" />
      <SkeletonBlock className="h-5 w-96" />
      <div className="grid gap-4 md:grid-cols-2">
        <SkeletonBlock className="h-40" />
        <SkeletonBlock className="h-40" />
      </div>
      <SkeletonBlock className="h-52" />
    </div>
  )
}
