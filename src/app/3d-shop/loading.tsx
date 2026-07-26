import Navbar from '@/components/Navbar'

export default function ShopLoading() {
  return (
    <div className="min-h-screen bg-[var(--shop-bg-base)]">
      <Navbar transparent />
      <main className="px-4 pt-5 md:px-8 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="h-[58vh] rounded-3xl bg-[var(--shop-bg-muted)]" />
          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="aspect-square rounded-2xl bg-[var(--shop-bg-muted)]" />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
