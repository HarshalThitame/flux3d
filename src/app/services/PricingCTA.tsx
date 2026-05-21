'use client'

import Link from 'next/link'
import { useBusinessSettings } from '@/lib/settings-context'

export default function PricingCTA() {
  const { settings } = useBusinessSettings()

  return (
    <section className="py-24 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="bg-[#FFFFFF] border border-[rgba(109, 40, 217,0.5)] rounded-[20px] p-8 md:p-16 text-center relative overflow-hidden">
          {/* Glow effect */}
          <div className="absolute -top-[100px] left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[radial-gradient(ellipse,rgba(109, 40, 217,0.15),transparent_70%)] pointer-events-none" />

          {/* Heading */}
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-[#0F1B3D] tracking-[-1px] mb-4 relative">
            Your Next Product Starts <br className="hidden md:block" />
            <span className="text-[#5B3FD6]">With One Message.</span>
          </h2>

          {/* Subheading */}
          <p className="text-[#6F7192] mb-8 max-w-[600px] mx-auto relative">
            Don&apos;t let your idea stay on a screen. Get a clear price, a fast turnaround, and a printed part that feels ready for production.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center relative mb-8">
            <Link href="/instant-quote" className="bg-[#5B3FD6] text-white px-8 py-4 rounded-lg text-lg font-medium border-none cursor-pointer transition-transform hover:translate-y-[-2px] hover:opacity-90 shadow-lg shadow-[rgba(91,63,214,0.3)]">
              Start Your Order
            </Link>
            <a
              href={`https://wa.me/${(settings.whatsappNumber || '+919623023480').replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-transparent text-[#0F1B3D] px-8 py-4 rounded-lg text-lg font-medium border border-[rgba(109, 40, 217,0.5)] cursor-pointer transition-colors hover:border-[rgba(255,255,255,0.25)] hover:bg-[rgba(109, 40, 217,0.3)]"
            >
              WhatsApp Us Now
            </a>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[#6F7192] relative">
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
          <p className="mt-8 text-xs text-[#6F7192] relative">
            Trusted by engineers, architects, jewellery designers, and gifting brands across India.
          </p>
        </div>
      </div>
    </section>
  )
}
