import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import PricingCTA from '@/app/services/PricingCTA'
import { absoluteUrl } from '@/lib/site'

export const metadata: Metadata = {
  title: '3D Printing Pricing and Quote Guide',
  description:
    'View Flux3D starting prices for FDM, resin, multi-color, CAD support, and express production, then request a custom quote.',
  alternates: {
    canonical: '/pricing',
  },
  openGraph: {
    title: 'Flux3D Pricing',
    description:
      'Starting prices, quote factors, and production service guidance for 3D printing projects across India.',
    url: absoluteUrl('/pricing'),
  },
}

const pricingCards = [
  { title: 'FDM Printing', price: 'From ₹99', desc: 'General prototyping, utility parts, and functional prints.' },
  { title: 'Resin Printing', price: 'From ₹199', desc: 'Fine detail prints, miniatures, and high-finish display parts.' },
  { title: 'Multi-Color Prints', price: 'From ₹249', desc: 'AMS-based color separation for logos, branding, and visual models.' },
  { title: '3D Modeling', price: 'From ₹499', desc: 'Custom CAD and modeling support from sketches or references.' },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
      <Navbar transparent />
      <main className="pt-32">
        <section className="px-6 md:px-12">
          <div className="mx-auto max-w-[1200px]">
            <p className="mb-4 text-sm font-medium uppercase tracking-[3px] text-[#FF5C1A]">Pricing</p>
            <h1 className="font-[var(--font-syne)] text-[clamp(2.4rem,5vw,4.6rem)] font-extrabold leading-[1.02] tracking-[-2px] text-white">
              Clear Starting Prices, <span className="text-[#7a82a0]">Custom Quotes for Complex Jobs</span>
            </h1>
            <p className="mt-6 max-w-[700px] text-base leading-8 text-[#7a82a0]">
              Final cost depends on material, print time, part size, finishing, and quantity. This page keeps pricing guidance separated from the landing page while making quotes easier to understand.
            </p>

            <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {pricingCards.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[#0d1120] p-7"
                >
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#7a82a0]">Service</div>
                  <h2 className="mt-4 font-[var(--font-syne)] text-2xl font-bold text-white">{item.title}</h2>
                  <div className="mt-4 text-lg font-semibold text-[#FF8A57]">{item.price}</div>
                  <p className="mt-3 text-sm leading-7 text-[#b1b9d5]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <PricingCTA />
      </main>
    </div>
  )
}
