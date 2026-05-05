'use client'

import Link from 'next/link'

export default function PricingCTA() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="bg-[#0d1120] border border-[rgba(255,255,255,0.07)] rounded-[20px] p-8 md:p-16 text-center relative overflow-hidden">
          {/* Glow effect */}
          <div className="absolute -top-[100px] left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[radial-gradient(ellipse,rgba(255,92,26,0.15),transparent_70%)] pointer-events-none" />

          {/* Heading */}
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-white tracking-[-1px] mb-4 relative">
            Your Next Product Starts <br className="hidden md:block" />
            <span className="text-[#FF5C1A]">With One Message.</span>
          </h2>

          {/* Subheading */}
          <p className="text-[#7a82a0] mb-8 max-w-[600px] mx-auto relative">
            Don&apos;t let your idea stay on a screen. Get a clear price, a fast turnaround, and a printed part that feels ready for production.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center relative mb-8">
            <Link href="/instant-quote" className="bg-[#FF5C1A] text-white px-8 py-4 rounded-lg text-lg font-medium border-none cursor-pointer transition-transform hover:translate-y-[-2px] hover:opacity-90 shadow-lg shadow-[rgba(255,92,26,0.3)]">
              Start Your Order
            </Link>
            <button className="bg-transparent text-white px-8 py-4 rounded-lg text-lg font-medium border border-[rgba(255,255,255,0.07)] cursor-pointer transition-colors hover:border-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.04)]">
              WhatsApp Us Now
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[#7a82a0] relative">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
              Fast Quotes
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
              Clear Pricing
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
              Pan-India Delivery
            </span>
          </div>

          {/* Location tag */}
          <p className="mt-8 text-xs text-[#7a82a0] relative">
            Trusted by engineers, architects, jewellery designers, and gifting brands across India.
          </p>
        </div>
      </div>
    </section>
  )
}
