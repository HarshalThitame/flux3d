import Link from 'next/link'
import Reveal from '@/components/Reveal'

export type MaterialRate = {
  name: string
  price_per_gram: number
  density: number
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export default function MaterialRates({ materials }: { materials: MaterialRate[] }) {
  return (
    <section id="material-rates" className="lux-band-cream relative px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[900px]">
        <Reveal>
          <div className="mb-12 text-center">
            <p className="lux-eyebrow justify-center">Material rates</p>
            <h2 className="lux-heading-2 mx-auto mt-4 max-w-2xl">Live rates, straight from the workshop.</h2>
            <p className="lux-body mx-auto mt-5 max-w-xl text-sm md:text-base">
              Published rates per gram for every active material. Your quote applies the rate that
              matches your file review — locked before printing begins.
            </p>
          </div>
        </Reveal>

        {materials.length === 0 ? (
          <Reveal delay={80}>
            <div className="rounded-3xl border border-[var(--lux-border-gold,#E5D9B8)] bg-[var(--lux-bg-elevated,#FFFFFF)] p-10 text-center shadow-[var(--lux-shadow-sm)]">
              <p className="lux-heading-3 text-lg">Material rates are being updated</p>
              <p className="mt-2.5 text-sm leading-relaxed text-[var(--lux-text-muted)]">
                Our team is refreshing published rates. Request a direct quote and we&apos;ll price
                your part within the hour.
              </p>
              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/instant-quote" className="lux-btn-primary w-full sm:w-auto">
                  Get instant quote
                </Link>
                <Link href="/contact" className="lux-btn-secondary w-full sm:w-auto">
                  Contact us
                </Link>
              </div>
            </div>
          </Reveal>
        ) : (
          <>
            <Reveal delay={80}>
              <div className="overflow-hidden rounded-3xl border border-[var(--lux-border-light,#E7E5E0)] bg-[var(--lux-bg-elevated,#FFFFFF)] shadow-[var(--lux-shadow-sm)]">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[var(--lux-border-light,#E7E5E0)]">
                      <th scope="col" className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--lux-text-muted)] md:px-8">
                        Material
                      </th>
                      <th scope="col" className="px-4 py-4 text-right text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--lux-text-muted)]">
                        Rate / gram
                      </th>
                      <th scope="col" className="hidden px-4 py-4 text-right text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--lux-text-muted)] sm:table-cell">
                        Density
                      </th>
                      <th scope="col" className="hidden px-6 py-4 text-right text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--lux-text-muted)] sm:table-cell md:px-8">
                        Est. 100 g
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((material, index) => (
                      <tr
                        key={material.name}
                        className={`group transition-colors hover:bg-[var(--lux-bg-base,#FDFCF8)] ${
                          index < materials.length - 1 ? 'border-b border-[var(--lux-border-light,#E7E5E0)]' : ''
                        }`}
                      >
                        <td className="px-6 py-4 text-sm font-semibold text-[var(--lux-text-primary)] transition-colors group-hover:text-[var(--lux-gold)] md:px-8">
                          {material.name}
                        </td>
                        <td className="px-4 py-4 text-right [font-family:var(--lux-font-display)] text-base font-semibold text-[var(--lux-text-primary)]">
                          ₹{formatCurrency(material.price_per_gram)}
                        </td>
                        <td className="hidden px-4 py-4 text-right text-sm text-[var(--lux-text-muted)] sm:table-cell">
                          {material.density} g/cm³
                        </td>
                        <td className="hidden px-6 py-4 text-right text-sm text-[var(--lux-text-secondary)] sm:table-cell md:px-8">
                          ₹{formatCurrency(material.price_per_gram * 100)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Reveal>

            <Reveal delay={140}>
              <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
                <p className="text-xs leading-6 text-[var(--lux-text-faint,#A8A29E)]">
                  Indicative material consumption only — final quotes include machine time, finishing,
                  and delivery after file review.
                </p>
                <Link
                  href="/instant-quote"
                  className="shrink-0 text-sm font-semibold text-[var(--lux-gold-deep,#A98432)] transition hover:text-[var(--lux-text-primary)]"
                >
                  Price my part →
                </Link>
              </div>
            </Reveal>
          </>
        )}
      </div>
    </section>
  )
}
