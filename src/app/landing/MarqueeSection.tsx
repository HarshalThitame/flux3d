'use client'

const marqueeItems = [
  'Bambu Lab P2S fleet',
  'Resin 4K detail',
  'PLA+ / PETG / ABS / TPU / Nylon',
  '24hr express in Pune & Mumbai',
  'Photo updates before dispatch',
  'Pan-India tracked delivery',
  'No minimum order',
  'NDA-ready industrial workflow',
]

export default function MarqueeSection() {
  const items = [...marqueeItems, ...marqueeItems]

  return (
    <section className="premium-marquee relative w-full overflow-hidden border-y py-5">
      <div className="absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#050506] to-transparent" />
      <div className="absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#050506] to-transparent" />
      <div className="overflow-hidden whitespace-nowrap">
        <div className="inline-flex min-w-max animate-marquee items-center">
          {items.map((item, index) => (
            <span key={`${item}-${index}`} className="premium-marquee-item">
              <span className="premium-marquee-mark" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
