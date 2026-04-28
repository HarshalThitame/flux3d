import SkeletonBlock from '@/components/admin/SkeletonBlock'

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <SkeletonBlock className="h-28 w-full" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-40 w-full" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SkeletonBlock className="h-[420px] w-full" />
        <SkeletonBlock className="h-[420px] w-full" />
      </div>
    </div>
  )
}
