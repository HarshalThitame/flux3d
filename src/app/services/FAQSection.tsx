import { servicesFaqs } from '@/lib/services-content'
import Reveal from '@/components/Reveal'

export default function FAQSection({ whatsappNumber }: { whatsappNumber: string }) {
  return (
    <section className="lux-band-white relative px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[860px]">
        <Reveal>
          <div className="mb-12 text-center">
            <p className="lux-eyebrow justify-center">FAQ</p>
            <h2 className="lux-heading-2 mt-4">Questions before you print.</h2>
          </div>
        </Reveal>

        <div className="overflow-hidden rounded-3xl border border-[var(--lux-border-light,#E7E5E0)] bg-[var(--lux-bg-elevated,#FFFFFF)] shadow-[var(--lux-shadow-sm)]">
          {servicesFaqs.map((faq, index) => (
            <details key={faq.question} open={index === 0} className="group border-b border-[var(--lux-border-light,#E7E5E0)] last:border-b-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 transition-colors hover:bg-[var(--lux-bg-base)] [&::-webkit-details-marker]:hidden">
                <span className="text-sm font-semibold leading-6 text-[var(--lux-text-primary)] transition-colors group-hover:text-[var(--lux-gold)] md:text-[15px]">
                  {faq.question}
                </span>
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--lux-border-light,#E7E5E0)] text-[var(--lux-gold)] transition-transform duration-300 group-open:rotate-180"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </summary>
              <p className="px-6 pb-6 text-sm leading-relaxed text-[var(--lux-text-secondary)]">{faq.answer}</p>
            </details>
          ))}
        </div>

        <Reveal delay={140}>
          <div className="mt-8 text-center">
            <a
              href={`https://wa.me/${whatsappNumber}?text=Hi%20Flux3D!%20I%20have%20a%20question%20about%203D%20printing%20services.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#25D366]/30 bg-white px-5 text-sm font-semibold text-[#138a42] shadow-sm transition hover:border-[#25D366]/50 hover:bg-[#EAFBF2]"
            >
              <svg viewBox="0 0 448 512" aria-hidden className="h-4 w-4" fill="currentColor">
                <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6z" />
              </svg>
              Ask on WhatsApp
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
