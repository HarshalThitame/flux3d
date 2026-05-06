import Link from 'next/link'
import { ArrowRight, ArrowDown, Printer, MapPin } from 'lucide-react'

const particles = [
  { id: 0, x: 8, y: 18, size: 3, duration: 4.2, delay: 0.1 },
  { id: 1, x: 18, y: 72, size: 2, duration: 3.8, delay: 0.7 },
  { id: 2, x: 24, y: 28, size: 2, duration: 4.5, delay: 1.1 },
  { id: 3, x: 30, y: 82, size: 4, duration: 4.8, delay: 0.5 },
  { id: 4, x: 37, y: 22, size: 2, duration: 3.6, delay: 1.5 },
  { id: 5, x: 44, y: 64, size: 3, duration: 4.4, delay: 0.2 },
  { id: 6, x: 51, y: 16, size: 2, duration: 4.9, delay: 1.8 },
  { id: 7, x: 58, y: 76, size: 3, duration: 3.9, delay: 0.9 },
  { id: 8, x: 64, y: 34, size: 2, duration: 4.1, delay: 0.4 },
  { id: 9, x: 72, y: 58, size: 4, duration: 5.1, delay: 1.3 },
  { id: 10, x: 78, y: 24, size: 2, duration: 3.7, delay: 0.8 },
  { id: 11, x: 84, y: 70, size: 3, duration: 4.6, delay: 1.6 },
]

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="hero-particle"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size * 4}px`,
            height: `${particle.size * 4}px`,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

function BambuPrinterSVG() {
  return (
    <svg
      viewBox="0 0 400 400"
      className="animate-hero-in w-full max-w-[400px] mx-auto"
      style={{ contain: 'layout style paint' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="printerGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D94E00" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#D94E00" stopOpacity="0" />
        </linearGradient>
        <filter id="printerGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g className="animate-printer-float origin-center">
        <rect x="60" y="120" width="280" height="220" rx="16" fill="#0d1120" stroke="rgba(217,78,0,0.3)" strokeWidth="2" />
        <rect x="75" y="135" width="250" height="190" rx="10" fill="#050810" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        <rect x="90" y="290" width="220" height="12" rx="3" fill="rgba(217,78,0,0.15)" stroke="rgba(217,78,0,0.2)" strokeWidth="1" />
        <rect x="170" y="250" width="60" height="40" rx="4" fill="url(#printerGlow)" filter="url(#printerGlowFilter)" className="animate-print-build origin-bottom" />
        <rect x="55" y="100" width="290" height="20" rx="8" fill="#0d1120" stroke="rgba(217,78,0,0.3)" strokeWidth="2" />
        <rect x="100" y="40" width="200" height="55" rx="10" fill="#0d1120" stroke="rgba(217,78,0,0.3)" strokeWidth="2" />

        {[0, 1, 2, 3].map((index) => (
          <g key={index}>
            <rect x={115 + index * 48} y="52" width="36" height="36" rx="18" fill="rgba(217,78,0,0.08)" stroke="rgba(217,78,0,0.2)" strokeWidth="1" />
            <circle
              cx={133 + index * 48}
              cy="70"
              r="4"
              fill={index === 0 ? '#D94E00' : index === 1 ? '#5064FF' : index === 2 ? '#10B981' : '#F59E0B'}
              className="animate-led-pulse"
              style={{ animationDelay: `${index * 0.3}s` }}
            />
          </g>
        ))}

        <line x1="85" y1="120" x2="85" y2="100" stroke="rgba(217,78,0,0.2)" strokeWidth="2" />
        <line x1="315" y1="120" x2="315" y2="100" stroke="rgba(217,78,0,0.2)" strokeWidth="2" />

        <g className="animate-print-head">
          <rect x="180" y="150" width="24" height="30" rx="4" fill="#0d1120" stroke="rgba(217,78,0,0.4)" strokeWidth="2" />
          <polygon points="185,180 199,180 195,188 189,188" fill="#D94E00" filter="url(#printerGlowFilter)" />
          <rect x="183" y="140" width="18" height="12" rx="2" fill="#D94E00" opacity="0.8" />
          <circle cx="192" cy="185" r="3" fill="#D94E00" className="animate-led-pulse" />
        </g>

        <circle cx="85" cy="145" r="3" fill="#10B981" className="animate-led-pulse" />
        <circle cx="85" cy="160" r="3" fill="#5064FF" className="animate-led-pulse" style={{ animationDelay: '0.5s' }} />
        <circle cx="85" cy="175" r="3" fill="#D94E00" className="animate-led-pulse" style={{ animationDelay: '1s' }} />

        <text x="200" y="325" textAnchor="middle" fill="rgba(217,78,0,0.35)" fontSize="12" fontFamily="sans-serif" fontWeight="bold">
          Bambu Lab P2S
        </text>
      </g>
    </svg>
  )
}

const stats = [
  { value: '₹99', label: 'Prints Start At' },
  { value: '48hr', label: 'Express Turnaround' },
  { value: '500+', label: 'Orders Delivered' },
  { value: '10+', label: 'Materials in Stock' },
  { value: '19,000+', label: 'Pin Codes Delivered' }
]

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-24">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(255,92,26,0.15)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_80%_60%,rgba(80,100,255,0.08)_0%,transparent_60%)]" />
      </div>

      <div
        className="absolute inset-0 opacity-20"
        aria-hidden="true"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 40%, black 0%, transparent 70%)'
        }}
      />

      <FloatingParticles />

      <div
        className="animate-ring-spin absolute top-1/2 left-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 opacity-10"
        aria-hidden="true"
      >
        <div className="w-full h-full rounded-full border border-dashed border-[#FF5C1A]" />
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-4 py-6 w-full sm:px-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="text-center lg:text-left">
            <div className="animate-hero-in inline-flex items-center gap-2 rounded-full border border-[rgba(217,78,0,0.3)] bg-[rgba(217,78,0,0.08)] px-4 py-1.5 text-sm font-medium text-[#FF8A57] mb-3">
              <Printer className="w-4 h-4" />
              Now Printing on Bambu Lab P2S
            </div>

            <div className="animate-hero-in animate-delay-1 inline-flex items-center gap-1.5 text-[#7a82a0] text-sm ml-2">
              <MapPin className="w-3.5 h-3.5" />
              Proudly Made in India
            </div>

            <h1 className="animate-hero-in animate-delay-2 mt-3 mb-3 font-[var(--font-syne)] text-[clamp(1.8rem,7vw,3.2rem)] font-extrabold leading-[1.1] tracking-[-1px] text-white">
              Where Ideas Become{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D94E00] to-[#ff7a3d] animate-gradient">
                Reality
              </span>
              <br />
              <span className="text-[#7a82a0] font-normal text-[clamp(1rem,2.5vw,1.6rem)]">
                Layer by Layer.
              </span>
            </h1>

            <p className="animate-hero-in animate-delay-3 mb-3 max-w-[520px] px-2 text-sm leading-[1.6] text-[#7a82a0] mx-auto lg:mx-0 sm:px-0">
              India&apos;s most trusted 3D printing service. Industrial parts, architecture models, student projects, medical models, creator props & corporate gifts — all printed with micron-level precision.
            </p>

            <p className="animate-hero-in animate-delay-4 mx-auto mb-6 max-w-[520px] text-xs text-[#4a5070] lg:mx-0">
              Powered by Bambu Lab P2S · Starting at ₹99 · Pan-India Delivery
            </p>

            <div className="animate-hero-in animate-delay-5 mb-4 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link
                href="/instant-quote"
                className="group relative flex min-h-[48px] items-center justify-center overflow-hidden rounded-xl bg-[#D94E00] px-5 py-3.5 text-center text-sm font-semibold text-white transition-all hover:shadow-[0_0_30px_rgba(217,78,0,0.3)] sm:px-6 sm:py-3"
              >
                <span className="relative z-10 inline-flex items-center gap-2">
                  Upload Your Model & Get Quote
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
              <a
                href="#services"
                className="inline-flex items-center justify-center gap-2 bg-transparent text-white px-5 py-3.5 sm:px-6 sm:py-3 rounded-xl text-sm font-medium border border-[rgba(255,255,255,0.1)] cursor-pointer transition-all hover:border-[rgba(255,92,26,0.4)] hover:bg-[rgba(255,92,26,0.05)] min-h-[48px]"
              >
                View Our Work
                <ArrowDown className="w-4 h-4" />
              </a>
            </div>

            <p className="animate-hero-in animate-delay-6 text-center text-xs text-[#4a5070] lg:text-left">
              No account needed · Free quote in 2 minutes · 500+ happy customers
            </p>
          </div>

          <div className="relative hidden lg:block animate-hero-in animate-delay-4" style={{ isolation: 'isolate' }}>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(255,92,26,0.15)_0%,transparent_70%)] blur-2xl" />
            <BambuPrinterSVG />
          </div>
        </div>

        <div className="animate-hero-in animate-delay-6 mt-8 grid grid-cols-2 gap-2 sm:mt-10 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
          {stats.map((stat) => (
              <div
                key={stat.label}
                className="group rounded-xl border border-white/[0.07] bg-[rgba(13,17,32,0.6)] p-3 text-center transition-colors hover:border-[rgba(217,78,0,0.3)] sm:p-4"
              >
                <div className="font-[var(--font-syne)] text-lg font-extrabold text-[#FF8A57] sm:text-xl">
                  {stat.value}
                </div>
                <div className="text-[11px] sm:text-xs text-[#7a82a0] mt-0.5">{stat.label}</div>
              </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#050810] to-transparent pointer-events-none" />
    </section>
  )
}
