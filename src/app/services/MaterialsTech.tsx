'use client'

import MaterialsGrid from '@/components/materials/MaterialsGrid'

export default function MaterialsTech() {
  return (
    <section className="py-24 px-6 bg-gradient-to-b from-transparent via-[rgba(255,92,26,0.04)] to-transparent">
      <div className="max-w-[1200px] mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-[#FF5C1A] uppercase tracking-[3px] mb-4">Materials</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-white tracking-[-1px] leading-[1.1]">
            Materials & <span className="text-[#7a82a0]">Technologies</span>
          </h2>
          <p className="text-[#7a82a0] mt-4 max-w-[600px] mx-auto">
            Premium filaments and resins for every application — from prototyping to end-use parts.
          </p>
        </div>

        {/* Materials grid */}
        <MaterialsGrid />

        {/* Technologies */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0d1120] border border-[rgba(255,255,255,0.07)] rounded-xl p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-lg bg-[rgba(255,92,26,0.08)] flex items-center justify-center">
                <span className="text-2xl">🖨️</span>
              </div>
              <div>
                <h3 className="font-[var(--font-syne)] text-lg font-bold text-white">FDM Technology</h3>
                <p className="text-sm text-[#7a82a0]">Fused Deposition Modeling</p>
              </div>
            </div>
            <p className="text-sm text-[#7a82a0] leading-[1.6] mb-4">
              Industrial-grade FDM printing using Bambu Lab X1 Carbon with AMS. Multi-color capability up to 4 colors with precise layer adhesion.
            </p>
            <ul className="space-y-2">
              {['Layer height: 0.08-0.3mm', 'Build volume: 256×256×256mm', 'Tolerance: ±0.2mm'].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-[#7a82a0]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C1A]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[#0d1120] border border-[rgba(255,255,255,0.07)] rounded-xl p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-lg bg-[rgba(255,92,26,0.08)] flex items-center justify-center">
                <span className="text-2xl">💎</span>
              </div>
              <div>
                <h3 className="font-[var(--font-syne)] text-lg font-bold text-white">Resin Technology</h3>
                <p className="text-sm text-[#7a82a0]">SLA/DLP 4K Printing</p>
              </div>
            </div>
            <p className="text-sm text-[#7a82a0] leading-[1.6] mb-4">
              Ultra-high resolution resin printing for miniatures, jewelry molds, and dental models with exceptional surface finish.
            </p>
            <ul className="space-y-2">
              {['Resolution: 35 microns', 'Build volume: 192×120×200mm', 'Tolerance: ±0.05mm'].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-[#7a82a0]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C1A]" />
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
