import { workflowSteps } from '@/lib/pricing-content'
import Reveal from '@/components/Reveal'

export default function HowItPriced() {
  return (
    <section className="lux-band-ivory relative px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1200px]">
        <Reveal>
          <div className="mb-14 text-center">
            <p className="lux-eyebrow justify-center">How quoting works</p>
            <h2 className="lux-heading-2 mx-auto mt-4 max-w-2xl">From upload to approved quote.</h2>
          </div>
        </Reveal>

        <ol className="relative grid gap-10 lg:grid-cols-4 lg:gap-6">
          <div
            aria-hidden
            className="absolute left-[15px] top-2 h-[calc(100%-1rem)] w-px bg-gradient-to-b from-[var(--lux-gold)] to-transparent lg:left-0 lg:right-0 lg:top-6 lg:h-px lg:w-full lg:bg-gradient-to-r"
          />
          {workflowSteps.map((step, index) => (
            <li key={step}>
              <Reveal delay={index * 100} className="relative h-full">
                <div className="flex h-full flex-col lg:pt-16">
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 hidden h-3.5 w-3.5 rotate-45 border border-[var(--lux-border-gold,#E5D9B8)] bg-[var(--lux-gold)] lg:block"
                  />
                  <span className="mb-3 flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--lux-ink)] text-xs font-semibold text-white lg:hidden">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="hidden text-sm font-semibold tracking-widest text-[var(--lux-gold)] lg:block">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </span>
                  <p className="text-[15px] font-medium leading-relaxed text-[var(--lux-text-secondary)]">{step}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
