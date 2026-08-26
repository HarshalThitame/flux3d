import { quoteDrivers } from '@/lib/pricing-content'
import Reveal from '@/components/Reveal'

export default function QuoteDrivers() {
  return (
    <section className="lux-band-white relative px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1200px]">
        <Reveal>
          <div className="mb-12 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.45fr)] lg:items-end">
            <div>
              <p className="lux-eyebrow mb-4">What shapes your quote</p>
              <h2 className="lux-heading-2 max-w-2xl">Four inputs. One honest number.</h2>
            </div>
            <p className="text-sm leading-7 text-[var(--lux-text-muted)]">
              Every quote is built from the same four drivers — so you always know exactly what
              you&apos;re paying for and why.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {quoteDrivers.map((driver, index) => (
            <Reveal key={driver.title} delay={index * 80}>
              <article className="border-t border-[var(--lux-border-light,#E7E5E0)] pt-6">
                <p className="[font-family:var(--lux-font-display)] text-3xl font-semibold text-[var(--lux-gold)]">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-4 text-base font-semibold text-[var(--lux-text-primary)]">{driver.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--lux-text-muted)]">{driver.description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
