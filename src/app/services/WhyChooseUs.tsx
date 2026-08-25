import { qualityGates, trustProofs } from '@/lib/services-content'
import Reveal from '@/components/Reveal'

export default function WhyChooseUs() {
  return (
    <section className="lux-band-ivory relative px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1200px]">
        <Reveal>
          <div className="mb-12 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.5fr)] lg:items-end">
            <div>
              <p className="lux-eyebrow mb-4">Why clients come back</p>
              <h2 className="lux-heading-2 max-w-2xl">
                Premium is not decoration. It is controlled output.
              </h2>
            </div>
            <p className="text-sm leading-7 text-[var(--lux-text-muted)]">
              The difference is in planning, material handling, communication, and finishing discipline
              before the printer even starts.
            </p>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <ul className="mb-10 flex flex-wrap justify-center gap-2.5" aria-label="Quality gates">
            {qualityGates.map((gate) => (
              <li
                key={gate}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--lux-border-gold,#E5D9B8)] bg-[var(--lux-bg-elevated,#FFFFFF)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--lux-text-secondary)]"
              >
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--lux-gold)]" />
                {gate}
              </li>
            ))}
          </ul>
        </Reveal>

        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {trustProofs.map((proof, index) => (
            <Reveal key={proof.title} delay={index * 80}>
              <article className="border-t border-[var(--lux-border-light,#E7E5E0)] pt-6">
                <p className="[font-family:var(--lux-font-display)] text-4xl font-semibold text-[var(--lux-text-primary)]">
                  {proof.metric}
                </p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--lux-gold)]">
                  {proof.label}
                </p>
                <h3 className="mt-5 text-base font-semibold text-[var(--lux-text-primary)]">{proof.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--lux-text-muted)]">{proof.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
