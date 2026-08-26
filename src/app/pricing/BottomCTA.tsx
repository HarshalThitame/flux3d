import Link from 'next/link'
import Reveal from '@/components/Reveal'

export default function BottomCTA({ whatsappNumber }: { whatsappNumber: string }) {
  return (
    <section className="relative overflow-hidden px-6 py-20 md:py-24" style={{ background: 'var(--lux-gradient-dark)' }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, var(--lux-gold), transparent)' }}
      />
      <Reveal>
        <div className="mx-auto max-w-[760px] text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--lux-gold)]">
            Know your number
          </p>
          <h2 className="mt-4 [font-family:var(--lux-font-display)] text-3xl font-semibold leading-tight text-white md:text-5xl">
            Upload a file. Get a locked quote.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/70 md:text-base">
            Instant estimates online, human review on every file, and the rate confirmed before a
            single gram is printed.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/instant-quote" className="lux-btn-primary w-full sm:w-auto">
              Get instant quote
            </Link>
            <a
              href={`https://wa.me/${whatsappNumber}?text=Hi%20Flux3D!%20I%27d%20like%20a%20pricing%20quote.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/25 px-7 text-sm font-semibold text-white transition hover:border-[var(--lux-gold)] hover:text-[var(--lux-gold-light,#E8CE8C)]"
            >
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
