export default function Home() {
  return (
    <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-12 py-5 bg-[#050810]/85 backdrop-blur-xl border-b border-[rgba(255,255,255,0.07)]">
        <div className="font-[var(--font-syne)] font-extrabold text-2xl text-white tracking-tight">
          flux<span className="text-[#FF5C1A]">3d</span>
        </div>
        <ul className="flex gap-8 list-none">
          <li><a href="#services" className="text-[#7a82a0] text-sm no-underline transition-colors hover:text-white">Services</a></li>
          <li><a href="#materials" className="text-[#7a82a0] text-sm no-underline transition-colors hover:text-white">Materials</a></li>
          <li><a href="#gallery" className="text-[#7a82a0] text-sm no-underline transition-colors hover:text-white">Gallery</a></li>
          <li><a href="#pricing" className="text-[#7a82a0] text-sm no-underline transition-colors hover:text-white">Pricing</a></li>
        </ul>
        <button className="bg-[#FF5C1A] text-white px-[1.4rem] py-[0.55rem] rounded-md font-[var(--font-dm)] text-sm font-medium cursor-pointer transition-opacity hover:opacity-88 border-none">
          Get a Quote
        </button>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-8 pt-32 pb-16 relative overflow-hidden">
        {/* Background gradients */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-[rgba(255,92,26,0.04)] to-transparent" />
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(255,92,26,0.12)_0%,transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_20%_80%,rgba(80,100,255,0.08)_0%,transparent_60%)]" />
        </div>

        {/* Grid lines */}
        <div
          className="absolute inset-0 z-0 opacity-25"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
            maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 0%, transparent 75%)'
          }}
        />

        {/* India tag */}
        <div className="inline-flex items-center gap-1 bg-[rgba(255,153,0,0.08)] border border-[rgba(255,153,0,0.2)] text-[#ff9900] text-xs px-[0.8rem] py-[0.3rem] rounded-full mb-6 relative z-10 animate-fadeUp">
          🇮🇳 Made in India · Mumbai
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-[rgba(255,92,26,0.08)] border border-[rgba(255,92,26,0.3)] text-[#FF5C1A] text-sm font-medium px-[1rem] py-[0.35rem] rounded-full mb-6 relative z-10 animate-fadeUp" style={{ animationDelay: '0.1s' }}>
          <span className="w-[6px] h-[6px] rounded-full bg-[#FF5C1A] animate-pulse-dot" />
          Now printing with Bambu Lab X1 Carbon
        </div>

        {/* Heading */}
        <h1 className="font-[var(--font-syne)] text-[clamp(2.8rem,7vw,5.5rem)] font-extrabold text-white leading-[1.05] tracking-[-2px] relative z-10 animate-fadeUp" style={{ animationDelay: '0.2s' }}>
          Where Ideas<br />
          Become <span className="text-[#FF5C1A]">Reality</span><br />
          <span className="font-normal text-[#7a82a0]">Layer by Layer</span>
        </h1>

        {/* Subheading */}
        <p className="text-lg text-[#7a82a0] max-w-[520px] mx-auto mt-6 mb-10 leading-[1.7] relative z-10 animate-fadeUp" style={{ animationDelay: '0.3s' }}>
          Premium 3D printing services across India. Ultra-precise FDM & resin prints delivered to your doorstep — starting at just ₹99.
        </p>

        {/* CTAs */}
        <div className="flex gap-4 justify-center relative z-10 animate-fadeUp" style={{ animationDelay: '0.4s' }}>
          <button className="bg-[#FF5C1A] text-white px-[2rem] py-[0.8rem] rounded-lg text-base font-medium border-none cursor-pointer transition-transform hover:translate-y-[-2px] hover:opacity-90">
            Upload Your Model
          </button>
          <button className="bg-transparent text-white px-[2rem] py-[0.8rem] rounded-lg text-base font-medium border border-[rgba(255,255,255,0.07)] cursor-pointer transition-colors hover:border-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.04)]">
            View Gallery
          </button>
        </div>

        {/* Printer Animation */}
        <div className="relative w-[340px] h-[280px] mx-auto mt-12 z-10 animate-fadeUp" style={{ animationDelay: '0.5s' }}>
          <svg viewBox="0 0 340 280" width="340" height="280" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FF5C1A" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#FF5C1A" stopOpacity="0" />
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Glow under print */}
            <ellipse cx="170" cy="220" rx="80" ry="18" fill="url(#glowGrad)" className="animate-glow" />

            {/* Printer body frame */}
            <rect x="60" y="40" width="220" height="200" rx="8" fill="#0d1120" stroke="#1e2540" strokeWidth="1.5" />
            {/* Top bar */}
            <rect x="60" y="40" width="220" height="24" rx="8" fill="#111827" stroke="#1e2540" strokeWidth="1.5" />
            {/* Top lights */}
            <circle cx="240" cy="52" r="5" fill="#FF5C1A" opacity="0.9" filter="url(#glow)" />
            <circle cx="255" cy="52" r="5" fill="#22c55e" opacity="0.9" />
            {/* Logo on printer */}
            <text x="90" y="57" fontFamily="Syne, sans-serif" fontSize="11" fontWeight="800" fill="#7a82a0">BAMBU LAB X1C</text>

            {/* Build plate */}
            <rect x="85" y="185" width="170" height="10" rx="3" fill="#1a2240" stroke="#2a3460" strokeWidth="1" />
            {/* Plate grid lines */}
            {[110, 135, 160, 185, 210, 235].map(x => (
              <line key={x} x1={x} y1="185" x2={x} y2="195" stroke="#2a3460" strokeWidth="0.5" />
            ))}

            {/* Printed object (building up) */}
            <g className="animate-buildUp">
              <rect x="120" y="175" width="100" height="10" rx="2" fill="#FF5C1A" opacity="0.9" />
              <rect x="125" y="162" width="90" height="13" rx="2" fill="#FF5C1A" opacity="0.85" />
              <rect x="130" y="150" width="80" height="12" rx="2" fill="#FF5C1A" opacity="0.8" />
              <rect x="135" y="139" width="70" height="11" rx="2" fill="#FF5C1A" opacity="0.75" />
              <rect x="140" y="129" width="60" height="10" rx="2" fill="#e04a10" opacity="0.8" />
              <rect x="145" y="121" width="50" height="8" rx="2" fill="#c03a08" opacity="0.7" />
            </g>

            {/* Moving gantry rail */}
            <rect x="75" y="100" width="190" height="4" rx="2" fill="#1e2540" stroke="#2a3460" strokeWidth="0.5" />

            {/* Moving nozzle assembly */}
            <g className="animate-nozzle">
              <rect x="155" y="96" width="30" height="20" rx="4" fill="#111827" stroke="#FF5C1A" strokeWidth="1" />
              <polygon points="165,116 175,116 170,126" fill="#FF5C1A" />
              <line x1="170" y1="126" x2="170" y2="140" stroke="#FF5C1A" strokeWidth="2.5" strokeLinecap="round" className="animate-flow" opacity="0.9" />
              <circle cx="170" cy="120" r="6" fill="#FF5C1A" opacity="0.2" filter="url(#glow)" />
            </g>

            {/* Filament spool */}
            <circle cx="290" cy="120" r="28" fill="#0d1120" stroke="#1e2540" strokeWidth="1.5" />
            <circle cx="290" cy="120" r="20" fill="#0d1120" stroke="#FF5C1A" strokeWidth="1" strokeDasharray="4 3" />
            <circle cx="290" cy="120" r="8" fill="#111827" stroke="#2a3460" strokeWidth="1" />
            {/* Filament line from spool to printer */}
            <path d="M270 110 Q240 90 220 100" fill="none" stroke="#FF5C1A" strokeWidth="1.5" strokeDasharray="4 3" className="animate-flow" opacity="0.5" />

            {/* AMS unit (multicolor) */}
            <rect x="65" y="200" width="80" height="30" rx="4" fill="#111827" stroke="#1e2540" strokeWidth="1" />
            <rect x="70" y="205" width="14" height="20" rx="2" fill="#e74c3c" />
            <rect x="87" y="205" width="14" height="20" rx="2" fill="#3498db" />
            <rect x="104" y="205" width="14" height="20" rx="2" fill="#2ecc71" />
            <rect x="121" y="205" width="14" height="20" rx="2" fill="#f39c12" />
            <text x="68" y="242" fontFamily="DM Sans, sans-serif" fontSize="8" fill="#7a82a0">AMS — 4 Color</text>

            {/* Screen */}
            <rect x="200" y="200" width="70" height="35" rx="4" fill="#020c1b" stroke="#1e2540" strokeWidth="1" />
            <text x="213" y="215" fontFamily="DM Sans, sans-serif" fontSize="7" fill="#22c55e">● PRINTING</text>
            <rect x="205" y="220" width="50" height="4" rx="2" fill="#1e2540" />
            <rect x="205" y="220" width="38" height="4" rx="2" fill="#FF5C1A" />
            <text x="213" y="232" fontFamily="DM Sans, sans-serif" fontSize="6" fill="#7a82a0">76% · Layer 42/55</text>
          </svg>
        </div>

        {/* Stats */}
        <div className="flex gap-0 mt-16 border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden relative z-10 animate-fadeUp" style={{ animationDelay: '0.6s' }}>
          <div className="px-10 py-6 flex-1 text-center border-r border-[rgba(255,255,255,0.07)]">
            <div className="font-[var(--font-syne)] text-4xl font-extrabold text-white leading-tight">
              500<span className="text-[#FF5C1A]">+</span>
            </div>
            <div className="text-sm text-[#7a82a0] mt-1">Orders Delivered</div>
          </div>
          <div className="px-10 py-6 flex-1 text-center border-r border-[rgba(255,255,255,0.07)]">
            <div className="font-[var(--font-syne)] text-4xl font-extrabold text-white leading-tight">
              ₹99<span className="text-[#FF5C1A]">↑</span>
            </div>
            <div className="text-sm text-[#7a82a0] mt-1">Starting Price</div>
          </div>
          <div className="px-10 py-6 flex-1 text-center border-r border-[rgba(255,255,255,0.07)]">
            <div className="font-[var(--font-syne)] text-4xl font-extrabold text-white leading-tight">
              48<span className="text-[#FF5C1A]">hr</span>
            </div>
            <div className="text-sm text-[#7a82a0] mt-1">Turnaround</div>
          </div>
          <div className="px-10 py-6 flex-1 text-center">
            <div className="font-[var(--font-syne)] text-4xl font-extrabold text-white leading-tight">
              10<span className="text-[#FF5C1A]">+</span>
            </div>
            <div className="text-sm text-[#7a82a0] mt-1">Materials</div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-24 px-12 max-w-[1200px] mx-auto">
        <p className="text-sm font-medium text-[#FF5C1A] uppercase tracking-[3px] mb-4">What We Offer</p>
        <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-white tracking-[-1px] leading-[1.1] mb-12">
          Services Built for <br /><span className="text-[#7a82a0]">Every Need</span>
        </h2>
        <div className="grid grid-cols-3 gap-[1.5px] bg-[rgba(255,255,255,0.07)] border border-[rgba(255,255,255,0.07)] rounded-2xl overflow-hidden">
          {/* Service cards */}
          {[
            { icon: '🖨️', title: 'FDM Printing', desc: 'High-strength functional parts using PLA, PETG, ABS, and more on our Bambu X1 fleet.', price: 'From ₹99 / print' },
            { icon: '💎', title: 'Resin Printing', desc: 'Ultra-detail miniatures, jewelry molds, and dental models with 4K resolution.', price: 'From ₹199 / print' },
            { icon: '🎨', title: 'Multi-Color', desc: 'Up to 4-color prints using Bambu AMS. Perfect for logos, figurines, and prototypes.', price: 'From ₹249 / print' },
            { icon: '📐', title: '3D Modeling', desc: 'Custom CAD & sculpting from sketches, photos, or reference. GST invoice provided.', price: 'From ₹499 / model' },
            { icon: '📦', title: 'Bulk Orders', desc: 'Colleges, startups, and events — volume pricing available with pan-India delivery.', price: 'Custom Quote' },
            { icon: '🚀', title: 'Express 24hr', desc: 'Rush orders dispatched within 24 hours. Available across Mumbai & Pune.', price: 'From ₹349 / print' },
          ].map((service, i) => (
            <div key={i} className="bg-[#0d1120] p-8 transition-background hover:bg-[#111827] relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#FF5C1A] opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="w-11 h-11 rounded-lg bg-[rgba(255,92,26,0.08)] flex items-center justify-center text-2xl mb-4">{service.icon}</div>
              <div className="font-[var(--font-syne)] text-lg font-bold text-white mb-2">{service.title}</div>
              <div className="text-sm text-[#7a82a0] leading-[1.6]">{service.desc}</div>
              <div className="mt-4 text-sm text-[#FF5C1A] font-medium">{service.price}</div>
            </div>
          ))}
        </div>
      </section>

      {/* MATERIALS */}
      <section id="materials" className="py-24 px-12 bg-gradient-to-b from-transparent via-[rgba(255,92,26,0.04)] to-transparent">
        <div className="max-w-[1200px] mx-auto">
          <p className="text-sm font-medium text-[#FF5C1A] uppercase tracking-[3px] mb-4">Materials</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-white tracking-[-1px] leading-[1.1] mb-8">
            Premium Filaments &<br /><span className="text-[#7a82a0]">Resins in Stock</span>
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
            {[
              { name: 'PLA+', type: 'Easy Print', color: '#e8e8e8' },
              { name: 'ABS', type: 'High Temp', color: '#222' },
              { name: 'PETG', type: 'Flexible', color: 'rgba(100,200,255,0.6)' },
              { name: 'Silk Gold', type: 'Decorative', color: '#d4a017' },
              { name: 'ASA', type: 'Outdoor UV', color: '#c0392b' },
              { name: 'TPU', type: 'Rubber-flex', color: '#27ae60' },
              { name: 'Resin 4K', type: 'Ultra Detail', color: '#8e44ad' },
              { name: 'Multi-Color', type: 'AMS Ready', gradient: 'linear-gradient(135deg, #3498db, #e74c3c, #2ecc71, #f39c12)' },
            ].map((mat, i) => (
              <div key={i} className="flex-none w-[150px] bg-[#0d1120] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 text-center transition-transform hover:-translate-y-1 hover:border-[#FF5C1A]">
                <div
                  className="w-[50px] h-[50px] rounded-full mx-auto mb-3 border-[3px] border-[rgba(255,255,255,0.1)] relative"
                  style={{ background: mat.gradient || mat.color }}
                >
                  <div className="absolute inset-[6px] rounded-full bg-[rgba(0,0,0,0.3)]" />
                </div>
                <div className="text-sm font-medium text-[#dde] mb-1">{mat.name}</div>
                <div className="text-xs text-[#7a82a0]">{mat.type}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="py-24 px-12">
        <div className="max-w-[1200px] mx-auto">
          <p className="text-sm font-medium text-[#FF5C1A] uppercase tracking-[3px] mb-4">How It Works</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-white tracking-[-1px] leading-[1.1] mb-8">
            Order in 4 Simple<br /><span className="text-[#7a82a0]">Steps</span>
          </h2>
          <div className="grid grid-cols-4 gap-0 relative mt-12">
            {/* Connection line */}
            <div className="absolute top-7 left-[12.5%] right-[12.5%] h-[1px] bg-gradient-to-r from-[#FF5C1A] via-[rgba(255,92,26,0.3)] to-[#FF5C1A]" />

            {[
              { num: '01', title: 'Upload STL / 3MF', desc: 'Drag & drop your file or send via WhatsApp. We accept all major 3D formats.' },
              { num: '02', title: 'Get Instant Quote', desc: 'Auto-calculated pricing in seconds. UPI / Razorpay / Net Banking accepted.' },
              { num: '03', title: 'We Print & QC', desc: 'Printed on Bambu X1 Carbon, inspected and photographed before shipping.' },
              { num: '04', title: 'Delivered to You', desc: 'Pan-India delivery via Delhivery / DTDC. GST invoice with every order.' },
            ].map((step, i) => (
              <div key={i} className="text-center px-4 relative z-10">
                <div className="w-14 h-14 rounded-full bg-[#0d1120] border-2 border-[#FF5C1A] flex items-center justify-center mx-auto mb-5 font-[var(--font-syne)] text-lg font-extrabold text-[#FF5C1A]">
                  {step.num}
                </div>
                <div className="font-semibold text-white mb-2 text-sm">{step.title}</div>
                <div className="text-xs text-[#7a82a0] leading-[1.5]">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="max-w-[1200px] mx-auto px-12 mb-24">
        <div className="bg-[#0d1120] border border-[rgba(255,255,255,0.07)] rounded-[20px] p-16 text-center relative overflow-hidden">
          <div className="absolute -top-[100px] left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[radial-gradient(ellipse,rgba(255,92,26,0.15),transparent_70%)] pointer-events-none" />
          <h2 className="font-[var(--font-syne)] text-5xl font-extrabold text-white tracking-[-1px] mb-4 relative">
            Ready to Print Your<br />Next Big Idea?
          </h2>
          <p className="text-[#7a82a0] mb-8 relative">
            Join 500+ makers, startups, and engineers across India already using Flux 3D.
          </p>
          <div className="flex gap-4 justify-center relative">
            <button className="bg-[#FF5C1A] text-white px-[2.5rem] py-[0.9rem] rounded-lg text-lg font-medium border-none cursor-pointer transition-opacity hover:opacity-90">
              Upload Model Now
            </button>
            <button className="bg-transparent text-white px-[2rem] py-[0.9rem] rounded-lg text-lg font-medium border border-[rgba(255,255,255,0.07)] cursor-pointer transition-colors hover:border-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.04)]">
              WhatsApp Us
            </button>
          </div>
          <p className="mt-6 text-xs text-[#7a82a0] relative">
            📍 Based in Mumbai · 🚚 Shipping across India · 🧾 GST Invoices Provided
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[rgba(255,255,255,0.07)] py-8 px-12 flex items-center justify-between text-sm text-[#7a82a0]">
        <div className="font-[var(--font-syne)] font-extrabold text-white">
          flux<span className="text-[#FF5C1A]">3d</span>
        </div>
        <ul className="flex gap-6 list-none">
          <li><a href="#" className="text-[#7a82a0] no-underline hover:text-white">Privacy</a></li>
          <li><a href="#" className="text-[#7a82a0] no-underline hover:text-white">Terms</a></li>
          <li><a href="#" className="text-[#7a82a0] no-underline hover:text-white">WhatsApp</a></li>
          <li><a href="#" className="text-[#7a82a0] no-underline hover:text-white">Instagram</a></li>
        </ul>
        <span>© 2025 Flux 3D · Mumbai, India</span>
      </footer>
    </div>
  );
}
