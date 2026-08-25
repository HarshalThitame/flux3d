import Link from 'next/link'
import { heroStats } from '@/lib/services-content'
import Reveal from '@/components/Reveal'

export default function ServicesHero({ whatsappNumber }: { whatsappNumber: string }) {
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
              <li aria-current="page" className="text-[var(--lux-text-primary)]">Services</li>
            </ol>
          </nav>

          <p className="lux-eyebrow mb-5">3D Printing Services</p>
          <h1 className="lux-heading-1 max-w-3xl">
            Services engineered for{' '}
            <span className="text-[var(--lux-gold)]">premium output.</span>
          </h1>
          <p className="lux-body mt-6 max-w-2xl text-base md:text-lg">
            From functional prototypes to architectural maquettes, every Flux3D job follows one disciplined
            workflow — material fit, print strategy, finishing, QC, and dispatch across India.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/instant-quote" className="lux-btn-primary justify-center text-center sm:justify-start">
              Get instant quote
            </Link>
            <a
              href={`https://wa.me/${whatsappNumber}?text=Hi%20Flux3D!%20I%27d%20like%20to%20discuss%20a%203D%20printing%20project.`}
              target="_blank"
              rel="noopener noreferrer"
              className="lux-btn-secondary justify-center text-center sm:justify-start"
            >
              Talk to us on WhatsApp
            </a>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <dl className="mt-14 grid grid-cols-2 gap-y-8 border-t border-[var(--lux-border-light,#E7E5E0)] pt-8 md:grid-cols-4">
            {heroStats.map((stat, index) => (
              <div
                key={stat.label}
                className={`px-2 md:px-6 ${index > 0 ? 'md:border-l md:border-[var(--lux-border-light,#E7E5E0)]' : ''}`}
              >
                <dt className="order-2 mt-1 block text-[11px] uppercase tracking-[0.18em] text-[var(--lux-text-muted)]">
                  {stat.label}
                </dt>
                <dd className="order-1 [font-family:var(--lux-font-display)] text-3xl font-semibold text-[var(--lux-text-primary)] md:text-4xl">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  )
}
