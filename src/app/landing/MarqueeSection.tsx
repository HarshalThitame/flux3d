'use client'

export default function MarqueeSection() {
  return (
    <section className="relative w-full overflow-hidden border-y border-violet-900/40 bg-gradient-to-r from-[#2e1065] to-[#4c1d95] py-4 text-violet-100">
      <div className="overflow-hidden whitespace-nowrap">
        <div className="inline-flex animate-marquee items-center">
          <span className="mx-8 text-sm font-semibold text-violet-100">Now Printing on Bambu Lab P2S · Pune, India</span>
          <span className="mx-8 text-sm font-semibold text-violet-100">Precision engineering · Pan-India delivery</span>
          <span className="mx-8 text-sm font-semibold text-violet-100">Now Printing on Bambu Lab P2S · Pune, India</span>
          <span className="mx-8 text-sm font-semibold text-violet-100">Precision engineering · Pan-India delivery</span>
        </div>
      </div>
    </section>
  )
}
