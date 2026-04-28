import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import PricingCTA from '@/app/services/PricingCTA'
import { absoluteUrl } from '@/lib/site'

export const metadata: Metadata = {
  title: '3D Printing Pricing That Feels Clear',
  description:
    'See transparent starting prices for 3D printing, CAD support, and express production, then move into a fast, accurate quote workflow.',
  alternates: {
    canonical: '/pricing',
  },
  openGraph: {
    title: 'Flux3D Pricing',
    description:
      'Transparent pricing guidance for FDM, resin, multi-color printing, CAD support, and express production.',
    url: absoluteUrl('/pricing'),
  },
}

const pricingCards = [
  { title: 'FDM Printing', price: 'From ₹99', desc: 'Reliable functional parts, prototypes, and utility builds with a strong balance of speed and cost.' },
  { title: 'Resin Printing', price: 'From ₹199', desc: 'Fine-detail prints, casting masters, and polished display pieces where finish matters most.' },
  { title: 'Multi-Color Prints', price: 'From ₹249', desc: 'AMS-based color separation for logos, branded models, and presentation-ready parts.' },
  { title: '3D Modeling', price: 'From ₹499', desc: 'Custom CAD support from sketches, references, or rough concepts when the file does not exist yet.' },
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
              Clear Pricing for <span className="text-[#7a82a0]">Serious 3D Printing Work</span>
            </h1>
            <p className="mt-6 max-w-[700px] text-base leading-8 text-[#7a82a0]">
              Your final quote is shaped by material, geometry, print time, finishing, and quantity. The goal here is simple: make the starting point obvious and the next step effortless.
            </p>

            <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {pricingCards.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[#0d1120] p-7"
                >
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#7a82a0]">Starting From</div>
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
