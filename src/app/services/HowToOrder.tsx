import Link from 'next/link'
import { orderSteps } from '@/lib/services-content'
import Reveal from '@/components/Reveal'

export default function HowToOrder() {
  return (
    <section className="lux-band-cream relative px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1200px]">
        <Reveal>
          <div className="mb-14 text-center">
            <p className="lux-eyebrow justify-center">Simple process</p>
            <h2 className="lux-heading-2 mx-auto mt-4 max-w-2xl">
              A precise path from file to finished part.
            </h2>
          </div>
        </Reveal>

        <ol className="relative grid gap-10 lg:grid-cols-4 lg:gap-6">
          <div
            aria-hidden
            className="absolute left-[15px] top-2 h-[calc(100%-1rem)] w-px bg-gradient-to-b from-[var(--lux-gold)] to-transparent lg:left-0 lg:right-0 lg:top-6 lg:h-px lg:w-full lg:bg-gradient-to-r"
          />
          {orderSteps.map((step, index) => (
            <li key={step.step}>
              <Reveal delay={index * 100} className="relative h-full">
                <div className="flex h-full flex-col lg:pt-16">
                  <span className="absolute left-0 top-0 hidden h-3.5 w-3.5 rotate-45 border border-[var(--lux-border-gold,#E5D9B8)] bg-[var(--lux-gold)] lg:block" />
                  <span className="mb-3 flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--lux-ink)] text-xs font-semibold text-white lg:hidden">
                      {step.step}
                    </span>
                    <span className="hidden text-sm font-semibold tracking-widest text-[var(--lux-gold)] lg:block">
                      {step.step}
                    </span>
                    <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--lux-text-muted)]">
                      {step.detail}
                    </span>
                  </span>
                  <h3 className="lux-heading-3 text-lg">{step.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-[var(--lux-text-secondary)]">
                    {step.description}
                  </p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>

        <Reveal delay={320}>
          <div className="mt-14 flex flex-col items-center justify-between gap-5 rounded-3xl border border-[var(--lux-border-gold,#E5D9B8)] bg-[var(--lux-bg-elevated,#FFFFFF)] p-7 shadow-[var(--lux-shadow-sm)] md:flex-row md:p-8">
            <div className="text-center md:text-left">
              <h3 className="lux-heading-3 text-lg">Need help before uploading?</h3>
              <p className="mt-1.5 text-sm text-[var(--lux-text-muted)]">
                Send references, measurements, or photos — we&apos;ll guide the next step.
              </p>
            </div>
            <Link href="/instant-quote" className="lux-btn-primary shrink-0">
              Start a project
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
