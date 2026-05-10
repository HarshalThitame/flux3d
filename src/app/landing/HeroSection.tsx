import Link from 'next/link'
import Image from 'next/image'
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
  { id: 12, x: 12, y: 42, size: 2, duration: 4.3, delay: 0.3 },
  { id: 13, x: 48, y: 88, size: 3, duration: 5.0, delay: 1.2 },
  { id: 14, x: 92, y: 32, size: 2, duration: 3.5, delay: 0.6 },
  { id: 15, x: 60, y: 4, size: 2, duration: 4.7, delay: 1.4 },
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


const orbs = [
  { id: 'a', x: '15%', y: '20%', w: 500, h: 500, anim: 'animate-orb-1', blur: 'blur-3xl', op: 0.15, grad: 'from-[#7C5CFF]/20 to-[#A78BFA]/10' },
  { id: 'b', x: '70%', y: '60%', w: 400, h: 400, anim: 'animate-orb-2', blur: 'blur-3xl', op: 0.12, grad: 'from-[#A78BFA]/20 to-[#7C5CFF]/10' },
  { id: 'c', x: '50%', y: '80%', w: 350, h: 350, anim: 'animate-orb-3', blur: 'blur-3xl', op: 0.1, grad: 'from-[#7C5CFF]/15 to-transparent' },
]

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {orbs.map((orb) => (
        <div
          key={orb.id}
          className={`absolute ${orb.anim}`}
          style={{
            left: orb.x,
            top: orb.y,
            width: orb.w,
            height: orb.h,
            marginLeft: -orb.w / 2,
            marginTop: -orb.h / 2,
          }}
        >
          <div
            className={`w-full h-full rounded-full bg-gradient-to-br ${orb.grad} ${orb.blur} opacity-[var(--op)]`}
            style={{ '--op': orb.op } as React.CSSProperties}
          />
        </div>
      ))}
    </div>
  )
}

const bubbles = [
  { id: 'b0', x: 5, size: 28, dur: 14, del: 0 },
  { id: 'b1', x: 12, size: 16, dur: 18, del: 3 },
  { id: 'b2', x: 22, size: 22, dur: 16, del: 5 },
  { id: 'b3', x: 35, size: 14, dur: 20, del: 1 },
  { id: 'b4', x: 45, size: 30, dur: 15, del: 7 },
  { id: 'b5', x: 58, size: 18, dur: 17, del: 2 },
  { id: 'b6', x: 68, size: 24, dur: 19, del: 4 },
  { id: 'b7', x: 78, size: 12, dur: 22, del: 6 },
  { id: 'b8', x: 88, size: 20, dur: 16, del: 8 },
  { id: 'b9', x: 95, size: 26, dur: 14, del: 1.5 },
]

function BubbleParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {bubbles.map((b) => (
        <span
          key={b.id}
          className="hero-bubble"
          style={{
            left: `${b.x}%`,
            bottom: '-10%',
            width: b.size,
            height: b.size,
            animationDuration: `${b.dur}s`,
            animationDelay: `${b.del}s`,
          }}
        />
      ))}
    </div>
  )
}

const twinkles = [
  { id: 't0', x: 3, y: 12, s: 3, dur: 3.2, del: 0.1 },
  { id: 't1', x: 14, y: 45, s: 2, dur: 4.1, del: 0.8 },
  { id: 't2', x: 28, y: 8, s: 2.5, dur: 3.6, del: 1.5 },
  { id: 't3', x: 38, y: 55, s: 3, dur: 4.8, del: 0.3 },
  { id: 't4', x: 50, y: 20, s: 2, dur: 3.4, del: 2.1 },
  { id: 't5', x: 62, y: 70, s: 2.5, dur: 4.5, del: 0.6 },
  { id: 't6', x: 75, y: 15, s: 3, dur: 3.9, del: 1.2 },
  { id: 't7', x: 85, y: 50, s: 2, dur: 4.2, del: 0.9 },
  { id: 't8', x: 92, y: 30, s: 2.5, dur: 3.7, del: 1.8 },
  { id: 't9', x: 20, y: 80, s: 2, dur: 4.6, del: 0.4 },
  { id: 't10', x: 70, y: 90, s: 3, dur: 3.3, del: 1.6 },
  { id: 't11', x: 45, y: 38, s: 2, dur: 4.0, del: 0.7 },
]

function TwinkleStars() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {twinkles.map((t) => (
        <span
          key={t.id}
          className="hero-twinkle"
          style={{
            left: `${t.x}%`,
            top: `${t.y}%`,
            width: t.s,
            height: t.s,
            animationDuration: `${t.dur}s`,
            animationDelay: `${t.del}s`,
          }}
        />
      ))}
    </div>
  )
}

const ripples = [
  { id: 'r0', x: 20, y: 25, s: 60, dur: 5, del: 0 },
  { id: 'r1', x: 75, y: 40, s: 50, dur: 6, del: 2 },
  { id: 'r2', x: 50, y: 70, s: 70, dur: 5.5, del: 1 },
  { id: 'r3', x: 85, y: 15, s: 40, dur: 4.5, del: 3.5 },
  { id: 'r4', x: 10, y: 60, s: 55, dur: 6.5, del: 1.5 },
]

function RippleRings() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {ripples.map((r) => (
        <span
          key={r.id}
          className="hero-ripple"
          style={{
            left: `${r.x}%`,
            top: `${r.y}%`,
            width: r.s,
            height: r.s,
            marginLeft: -r.s / 2,
            marginTop: -r.s / 2,
            animationDuration: `${r.dur}s`,
            animationDelay: `${r.del}s`,
          }}
        />
      ))}
    </div>
  )
}

const stats = [
  { value: '₹99', label: 'Prints Start At' },
  { value: '48hr', label: 'Express Turnaround' },
  { value: '500+', label: 'Orders Delivered' },
  { value: '10+', label: 'Materials in Stock' },
  { value: '19,000+', label: 'Pin Codes Delivered' }
]

function ImageAura() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div
        className="absolute right-[10%] top-1/2 -translate-y-1/2 w-[40vw] h-[60vh] animate-pulse-glow"
        style={{ isolation: 'isolate' }}
      >
        <div
          className="w-full h-full rounded-[40%_60%_50%_50%/50%_40%_60%_50%] animate-morph"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(124,92,255,0.2) 0%, rgba(167,139,250,0.1) 40%, transparent 70%)',
          }}
        />
        <div
          className="absolute inset-4 rounded-[50%_40%_60%_50%/60%_50%_40%_50%] animate-morph"
          style={{
            animationDelay: '-3s',
            background: 'radial-gradient(ellipse at center, rgba(183,167,255,0.12) 0%, transparent 60%)',
          }}
        />
      </div>
    </div>
  )
}

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-24">
      <FloatingOrbs />

      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(124, 92, 255,0.18)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_80%_70%,rgba(183, 167, 255,0.1)_0%,transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_20%_80%,rgba(124, 92, 255,0.05)_0%,transparent_50%)]" />
        <div className="absolute inset-0 animate-breathe bg-[radial-gradient(ellipse_100%_50%_at_50%_0%,rgba(124, 92, 255,0.04)_0%,transparent_60%)]" />
      </div>

      <div
        className="absolute inset-0 opacity-20"
        aria-hidden="true"
        style={{
          backgroundImage: `linear-gradient(rgba(124, 92, 255,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(124, 92, 255,0.25) 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 40%, black 0%, transparent 70%)'
        }}
      />

      <FloatingParticles />
      <BubbleParticles />
      <TwinkleStars />
      <RippleRings />

      <div
        className="animate-ring-spin absolute top-1/2 left-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 opacity-10"
        aria-hidden="true"
      >
        <div className="w-full h-full rounded-full border border-dashed border-[#7C5CFF]" />
      </div>

      <div className="relative z-10 w-full">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8">
          <div className="w-full lg:w-[52%] text-center lg:text-left py-8">
            <div className="animate-hero-in inline-flex items-center gap-2 rounded-full border border-[rgba(124, 92, 255,0.3)] bg-[rgba(124, 92, 255,0.08)] px-4 py-1.5 text-sm font-medium text-[#5B3FD6] mb-3 animate-borderGlow">
              <Printer className="w-4 h-4" />
              Now Printing on Bambu Lab P2S
            </div>

            <div className="animate-hero-in animate-delay-1 inline-flex items-center gap-1.5 text-[#6F7192] text-sm ml-2">
              <MapPin className="w-3.5 h-3.5" />
              Proudly Made in India
            </div>

            <h1 className="animate-hero-in animate-delay-2 mt-3 mb-3 font-[var(--font-syne)] text-[clamp(1.8rem,7vw,3.2rem)] font-extrabold leading-[1.1] tracking-[-1px] text-[#0F1B3D]">
              Where Ideas Become{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C5CFF] to-[#A78BFA] to-[#7C5CFF] animate-slide-glow">
                Reality
              </span>
              <br />
              <span className="text-[#6F7192] font-normal text-[clamp(1rem,2.5vw,1.6rem)]">
                Layer by Layer.
              </span>
            </h1>

            <p className="animate-hero-in animate-delay-3 mb-3 max-w-[520px] px-2 text-sm leading-[1.6] text-[#6F7192] mx-auto lg:mx-0 sm:px-0">
              India&apos;s most trusted 3D printing service. Industrial parts, architecture models, student projects, medical models, creator props & corporate gifts — all printed with micron-level precision.
            </p>

            <p className="animate-hero-in animate-delay-4 mx-auto mb-6 max-w-[520px] text-xs text-[#4a5070] lg:mx-0">
              Powered by Bambu Lab P2S · Starting at ₹99 · Pan-India Delivery
            </p>

            <div className="animate-hero-in animate-delay-5 mb-4 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link
                href="/instant-quote"
                className="group relative flex min-h-[48px] items-center justify-center overflow-hidden rounded-xl bg-[#7C5CFF] px-5 py-3.5 text-center text-sm font-semibold text-white transition-all duration-300 hover:shadow-[0_0_40px_rgba(124,92,255,0.4)] hover:scale-[1.03] active:scale-[0.97] sm:px-6 sm:py-3"
              >
                <span className="relative z-10 inline-flex items-center gap-2">
                  Upload Your Model & Get Quote
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
                <span className="absolute inset-0 overflow-hidden rounded-xl">
                  <span className="absolute inset-0 translate-x-[-100%] skew-x-[25deg] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
                </span>
                <span className="absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.15),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              </Link>
              <a
                href="#services"
                className="inline-flex items-center justify-center gap-2 bg-transparent text-[#0F1B3D] px-5 py-3.5 sm:px-6 sm:py-3 rounded-xl text-sm font-medium border border-[rgba(124, 92, 255,0.5)] cursor-pointer transition-all duration-300 hover:border-[rgba(124, 92, 255,0.6)] hover:bg-[rgba(124, 92, 255,0.08)] hover:shadow-[0_0_20px_rgba(124,92,255,0.15)] min-h-[48px] active:scale-[0.97]"
              >
                View Our Work
                <ArrowDown className="w-4 h-4 animate-float-slow" />
              </a>
            </div>

            <p className="animate-hero-in animate-delay-6 text-center text-xs text-[#4a5070] lg:text-left">
              No account needed · Free quote in 2 minutes · 500+ happy customers
            </p>
          </div>
        </div>

        <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-[50vw] h-[92vh] pointer-events-none" style={{ isolation: 'isolate' }}>
          <ImageAura />
          <div className="absolute inset-y-0 right-0 w-[140%] bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(124, 92, 255,0.15)_0%,transparent_70%)] blur-2xl" />
          <div className="relative w-full h-full animate-float-slow2">
            <Image
              src="/pot.webp"
              alt="3D printed pot showcase"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 48vw"
              quality={65}
              className="object-contain object-right drop-shadow-2xl"
            />
          </div>
        </div>

        <div className="lg:hidden flex items-center justify-center max-md:mt-4 animate-hero-in animate-delay-4 px-4">
          <div className="relative w-full max-w-[280px] aspect-[3/4]">
            <Image
              src="/pot.webp"
              alt="3D printed pot showcase"
              fill
              priority
              sizes="280px"
              quality={65}
              className="object-contain drop-shadow-2xl"
            />
          </div>
        </div>

        <div className="animate-hero-in animate-delay-6 mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {stats.map((stat, i) => (
              <div
                key={stat.label}
                className="group relative rounded-2xl border border-[rgba(124,92,255,0.2)] bg-white/70 p-4 text-center transition-all duration-300 hover:-translate-y-1.5 hover:border-[rgba(124,92,255,0.35)] hover:bg-white/85 hover:shadow-[0_8px_32px_rgba(124,92,255,0.1)] sm:p-5"
                style={{
                  animation: `fadeScaleIn 0.5s ease both`,
                  animationDelay: `${0.35 + i * 0.08}s`,
                  boxShadow: '0 2px 16px rgba(124,92,255,0.06), 0 1px 4px rgba(124,92,255,0.04)',
                }}
              >
                <span className="mx-auto mb-2 block h-1.5 w-1.5 rotate-45 rounded-sm bg-gradient-to-br from-[#7C5CFF] to-[#A78BFA] opacity-60 transition-all duration-300 group-hover:opacity-100 group-hover:scale-125" />
                <div className="font-[var(--font-syne)] text-xl font-extrabold sm:text-2xl bg-gradient-to-br from-[#7C5CFF] to-[#A78BFA] bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-[11px] sm:text-xs text-[#6F7192] mt-1 font-medium tracking-wide">{stat.label}</div>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[rgba(124,92,255,0.03)] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
              </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#FFFFFF] to-transparent pointer-events-none" />
    </section>
  )
}
