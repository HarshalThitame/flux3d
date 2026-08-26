import Link from 'next/link'
import { assuranceItems } from '@/lib/pricing-content'
import Reveal from '@/components/Reveal'

export default function PricingHero({ lowestRate }: { lowestRate: number | null }) {
  return (
    <section className="lux-band-ivory relative overflow-hidden px-6 pb-16 pt-32 md:pb-20 md:pt-40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64"
        style={{ background: 'radial-gradient(60% 100% at 50% 0%, rgba(201,169,98,0.10), transparent 70%)' }}
      />
      <div className="relative mx-auto max-w-[1200px]">
        <Reveal>
          <nav aria-label="Breadcrumb" className="mb-8 text-xs font-medium text-[var(--lux-text-muted)]">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/" className="transition hover:text-[var(--lux-gold)]">Home</Link>
              </li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-[var(--lux-text-primary)]">Pricing</li>
            </ol>
          </nav>

          <p className="lux-eyebrow mb-5">Transparent pricing</p>
          <h1 className="lux-heading-1 max-w-3xl">
            Pricing engineered before{' '}
            <span className="text-[var(--lux-gold)]">production starts.</span>
          </h1>
          <p className="lux-body mt-6 max-w-2xl text-base md:text-lg">
            Live material rates per gram, geometry-driven machine time, and an itemised quote you
            approve before anything is printed. No hidden charges — ever.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/instant-quote" className="lux-btn-primary justify-center text-center sm:justify-start">
              Get instant quote
            </Link>
            <Link href="/materials" className="lux-btn-secondary justify-center text-center sm:justify-start">
              Explore materials
            </Link>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <dl className="mt-14 grid grid-cols-1 gap-y-8 border-t border-[var(--lux-border-light,#E7E5E0)] pt-8 sm:grid-cols-3">
            <div>
              <dd className="[font-family:var(--lux-font-display)] text-3xl font-semibold text-[var(--lux-text-primary)] md:text-4xl">
                {lowestRate !== null ? `₹${lowestRate.toFixed(2)}` : '—'}
                <span className="ml-1.5 text-base font-normal text-[var(--lux-text-muted)]">/ gram</span>
              </dd>
              <dt className="mt-1 block text-[11px] uppercase tracking-[0.18em] text-[var(--lux-text-muted)]">
                Starting rate · live materials
              </dt>
            </div>
            <div className="sm:border-l sm:border-[var(--lux-border-light,#E7E5E0)] sm:px-6">
              <dd className="[font-family:var(--lux-font-display)] text-3xl font-semibold text-[var(--lux-text-primary)] md:text-4xl">
                4
              </dd>
              <dt className="mt-1 block text-[11px] uppercase tracking-[0.18em] text-[var(--lux-text-muted)]">
                Quote inputs · rate locked before print
              </dt>
            </div>
            <div className="sm:border-l sm:border-[var(--lux-border-light,#E7E5E0)] sm:px-6">
              <ul className="space-y-1.5">
                {assuranceItems.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm font-medium text-[var(--lux-text-secondary)]">
                    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 shrink-0 text-[var(--lux-gold)]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </dl>
        </Reveal>
      </div>
    </section>
  )
}
