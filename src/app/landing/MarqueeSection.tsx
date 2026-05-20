'use client'

export default function MarqueeSection() {
  return (
    <section className="relative w-full overflow-hidden border-y border-[#f97316]/25 bg-[#1a1a2e] py-4 text-[#fff7ed]">
      <div className="overflow-hidden whitespace-nowrap">
        <div className="inline-flex animate-marquee items-center">
          <span className="mx-8 text-sm font-semibold text-[#fff7ed]">Now Printing on Bambu Lab P2S · Pune, India</span>
          <span className="mx-8 text-sm font-semibold text-[#fff7ed]">Precision engineering · Pan-India delivery</span>
          <span className="mx-8 text-sm font-semibold text-[#fff7ed]">Now Printing on Bambu Lab P2S · Pune, India</span>
          <span className="mx-8 text-sm font-semibold text-[#fff7ed]">Precision engineering · Pan-India delivery</span>
        </div>
      </div>
    </section>
  )
}
