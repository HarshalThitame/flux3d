import Link from 'next/link'

export default function ProductNotFound() {
  return (
    <main className="px-4 pb-24 pt-6 md:px-8 lg:px-16 lg:pt-8">
      <div className="mx-auto grid min-h-[60vh] max-w-xl place-items-center">
        <div className="w-full rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] p-10 text-center shadow-[var(--shop-shadow-sm)]">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--shop-gold)]">404</p>
          <h1 className="mt-3 font-[var(--shop-font-heading)] text-2xl font-semibold text-[var(--shop-text-primary)]">
            This piece is no longer available
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--shop-text-secondary)]">
            The product you&apos;re looking for may have been moved or retired from the collection.
          </p>
          <Link
            href="/3d-shop"
            className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-[var(--shop-radius-lg)] bg-[var(--shop-gold)] px-6 text-sm font-semibold text-white shadow-[var(--shop-shadow-gold)] transition hover:bg-[var(--shop-gold-light)]"
          >
            Explore the collection
          </Link>
        </div>
      </div>
    </main>
  )
}
