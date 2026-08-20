'use client'

import Link from 'next/link'
import { memo, useRef } from 'react'
import { ArrowRight, Sparkles, MessageCircle, Mail, Check } from 'lucide-react'
import Reveal from '@/components/Reveal'
import { useBusinessSettings } from '@/lib/settings-context'

const reassurancePills = [
  'Quote-based orders',
  'No fake pricing',
  'Real support contact',
  'Payment verified on server',
]

function FinalCTASection() {
  const { settings } = useBusinessSettings()
  const ref = useRef<HTMLElement>(null)
  const email = settings.supportEmail || settings.primaryEmail || 'flux3d.in@gmail.com'

  return (
    <section ref={ref} className="relative overflow-hidden px-6 py-12 md:py-16 lg:py-24">
      <Reveal className="relative z-10 mx-auto max-w-[1000px]">
        <div className="rounded-[var(--shop-radius-xl,32px)] border border-[var(--shop-border-gold)] bg-[var(--shop-text-primary,#1C1917)] p-8 text-center text-white shadow-[var(--shop-shadow-lg)] md:p-12 lg:p-16">
          <div className="relative z-10">
            <Reveal delay={40}>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--shop-border-gold)] bg-[rgba(201,169,98,0.12)] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--shop-gold,#C9A962)]">
                <Sparkles className="w-4 h-4" />
                Start with a real quote
              </div>
            </Reveal>

            <Reveal delay={100}>
              <h2 className="mb-4 font-[var(--shop-font-heading)] text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1.1] text-white">
                Tell us what you need and we&apos;ll review it before production.
              </h2>
            </Reveal>

            <Reveal delay={160}>
              <p className="mx-auto mb-8 max-w-[640px] text-base leading-[1.7] text-[var(--shop-sand,#D7D3CB)]">
                Flux3D handles custom 3D printing, prototyping, model printing and ready-made products through a review-and-confirm workflow. Share the file or requirement and we&apos;ll take it from there.
              </p>
            </Reveal>

            <Reveal delay={220}>
              <div className="mb-8 flex flex-col justify-center gap-4 sm:flex-row">
                <Link href="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--shop-gold,#C9A962)] px-8 text-sm font-semibold text-[var(--shop-text-primary,#1C1917)] transition hover:bg-[var(--shop-gold-light)]">
                  Contact Sales
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href={`https://wa.me/${(settings.whatsappNumber || '+919623023480').replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-8 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  <MessageCircle className="w-5 h-5" />
                  WhatsApp Us
                </a>
              </div>
            </Reveal>

            <Reveal delay={280}>
              <div className="mb-4 flex items-center justify-center gap-4">
                <div className="h-px w-12 bg-white/20" />
                <span className="text-xs text-[var(--shop-sand,#D7D3CB)] uppercase tracking-[0.14em]">or email us</span>
                <div className="h-px w-12 bg-white/20" />
              </div>
            </Reveal>

            <Reveal delay={340}>
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--shop-gold,#C9A962)] transition-colors hover:text-white"
              >
                <Mail className="w-4 h-4" />
                {email}
              </a>
            </Reveal>

            <Reveal delay={400}>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {reassurancePills.map((pill) => (
                  <span
                    key={pill}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-[var(--shop-sand,#D7D3CB)]"
                  >
                    <Check className="w-3.5 h-3.5 text-[var(--shop-gold,#C9A962)]" />
                    {pill}
                  </span>
                ))}
              </div>
            </Reveal>

            <Reveal delay={460}>
              <p className="mt-8 text-xs text-[var(--shop-sand,#D7D3CB)]/70">
                Service delivery and payment terms are published on this site.
              </p>
            </Reveal>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

export default memo(FinalCTASection)
