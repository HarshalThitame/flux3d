'use client'

import MaterialsGrid from '@/components/materials/MaterialsGrid'

export default function MaterialsTech() {
  return (
    <section className="py-24 px-6 bg-gradient-to-b from-transparent via-[rgba(109, 40, 217,0.04)] to-transparent">
      <div className="max-w-[1200px] mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-[#6d28d9] uppercase tracking-[3px] mb-4">Materials That Matter</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-[#0F1B3D] tracking-[-1px] leading-[1.1]">
            Built for Strength, Finish <br /><span className="text-[#6F7192]">and the Right First Impression</span>
          </h2>
          <p className="text-[#6F7192] mt-4 max-w-[600px] mx-auto">
            Pick a material that matches how your part needs to look, feel, and perform. We guide you toward the right balance of speed, detail, and durability.
          </p>
        </div>

        {/* Materials grid */}
        <MaterialsGrid />

        {/* Technologies */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#FFFFFF] border border-[rgba(109, 40, 217,0.5)] rounded-xl p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-lg bg-[rgba(109, 40, 217,0.08)] flex items-center justify-center">
                <span className="text-2xl">🖨️</span>
              </div>
              <div>
                <h3 className="font-[var(--font-syne)] text-lg font-bold text-[#0F1B3D]">FDM Materials</h3>
                <p className="text-sm text-[#6F7192]">Functional, reliable, and production-ready</p>
              </div>
            </div>
            <p className="text-sm text-[#6F7192] leading-[1.6] mb-4">
              Ideal for prototypes, tools, enclosures, fixtures, and branded components that need dependable strength and consistent repeatability.
            </p>
            <ul className="space-y-2">
              {['Layer height: 0.08-0.3mm', 'Build volume: 256×256×256mm', 'Tolerance: ±0.2mm'].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-[#6F7192]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6d28d9]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[#FFFFFF] border border-[rgba(109, 40, 217,0.5)] rounded-xl p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-lg bg-[rgba(109, 40, 217,0.08)] flex items-center justify-center">
                <span className="text-2xl">💎</span>
              </div>
              <div>
                <h3 className="font-[var(--font-syne)] text-lg font-bold text-[#0F1B3D]">Resin Materials</h3>
                <p className="text-sm text-[#6F7192]">Fine detail for premium finishes</p>
              </div>
            </div>
            <p className="text-sm text-[#6F7192] leading-[1.6] mb-4">
              Best for jewellery masters, miniatures, visual models, and any part where crisp detail and a smooth finish make the difference.
            </p>
            <ul className="space-y-2">
              {['Resolution: 35 microns', 'Build volume: 192×120×200mm', 'Tolerance: ±0.05mm'].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-[#6F7192]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6d28d9]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
