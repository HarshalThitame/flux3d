'use client'

export default function ServicesHero() {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden pt-20">
      {/* Background gradients */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(255,92,26,0.12)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_20%_80%,rgba(80,100,255,0.08)_0%,transparent_60%)]" />
      </div>

      {/* Grid lines */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 0%, transparent 75%)'
        }}
      />

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 py-20 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-[rgba(255,92,26,0.08)] border border-[rgba(255,92,26,0.3)] text-[#FF5C1A] text-sm font-medium px-[1rem] py-[0.35rem] rounded-full mb-6 animate-fadeUp">
          <span className="w-[6px] h-[6px] rounded-full bg-[#FF5C1A] animate-pulse-dot" />
          Serving Pune & Across India
        </div>

        {/* Heading */}
        <h1 className="font-[var(--font-syne)] text-[clamp(2rem,5vw,4rem)] font-extrabold text-white leading-[1.1] tracking-[-1px] mb-6 animate-fadeUp" style={{ animationDelay: '0.1s' }}>
          3D Printing Services in <span className="text-[#FF5C1A]">Pune</span>
        </h1>

        {/* Subheading */}
        <p className="text-lg text-[#7a82a0] max-w-[600px] mx-auto mb-8 leading-[1.7] animate-fadeUp" style={{ animationDelay: '0.2s' }}>
          Rapid prototyping, industrial-grade parts, and custom CAD design. From concept to delivery — precision-printed layer by layer.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fadeUp" style={{ animationDelay: '0.3s' }}>
          <button className="bg-[#FF5C1A] text-white px-8 py-3 rounded-lg text-base font-medium border-none cursor-pointer transition-transform hover:translate-y-[-2px] hover:opacity-90">
            Get Instant Quote
          </button>
          <button className="bg-transparent text-white px-8 py-3 rounded-lg text-base font-medium border border-[rgba(255,255,255,0.07)] cursor-pointer transition-colors hover:border-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.04)]">
            View Materials
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 animate-fadeUp" style={{ animationDelay: '0.4s' }}>
          <div className="bg-[#0d1120] border border-[rgba(255,255,255,0.07)] rounded-xl p-6">
            <div className="font-[var(--font-syne)] text-3xl font-extrabold text-white">
              500<span className="text-[#FF5C1A]">+</span>
            </div>
            <div className="text-sm text-[#7a82a0] mt-1">Orders Delivered</div>
          </div>
          <div className="bg-[#0d1120] border border-[rgba(255,255,255,0.07)] rounded-xl p-6">
            <div className="font-[var(--font-syne)] text-3xl font-extrabold text-white">
              ₹99<span className="text-[#FF5C1A]">↑</span>
            </div>
            <div className="text-sm text-[#7a82a0] mt-1">Starting Price</div>
          </div>
          <div className="bg-[#0d1120] border border-[rgba(255,255,255,0.07)] rounded-xl p-6">
            <div className="font-[var(--font-syne)] text-3xl font-extrabold text-white">
              48<span className="text-[#FF5C1A]">hr</span>
            </div>
            <div className="text-sm text-[#7a82a0] mt-1">Turnaround</div>
          </div>
          <div className="bg-[#0d1120] border border-[rgba(255,255,255,0.07)] rounded-xl p-6">
            <div className="font-[var(--font-syne)] text-3xl font-extrabold text-white">
              10<span className="text-[#FF5C1A]">+</span>
            </div>
            <div className="text-sm text-[#7a82a0] mt-1">Materials</div>
          </div>
        </div>
      </div>
    </section>
  )
}
