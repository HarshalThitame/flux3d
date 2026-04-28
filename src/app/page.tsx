import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { localBusinessJsonLd } from '@/lib/structured-data'
import { absoluteUrl } from '@/lib/site'

export const metadata: Metadata = {
  title: '3D Printing Services, Rapid Prototyping and CAD Support',
  description:
    'Order FDM and resin 3D printing, rapid prototyping, multi-color printing, and CAD support from Flux3D with delivery across India.',
  keywords: [
    '3D printing Mumbai',
    '3D printing India',
    'rapid prototyping service',
    'custom CAD design',
    'resin printing',
    'multi-color 3D printing',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Flux3D | 3D Printing Services in India',
    description:
      'Premium 3D printing and rapid prototyping services across India, from concept to final part.',
    url: absoluteUrl('/'),
  },
  twitter: {
    title: 'Flux3D | 3D Printing Services in India',
    description:
      'Premium 3D printing and rapid prototyping services across India, from concept to final part.',
  },
}

export default function Home() {
  const serviceCards = [
    { icon: '🖨️', title: 'B2B Prototyping', desc: 'Functional prototypes in ABS, PETG, Nylon, and engineering materials that are strong enough to test and refined enough to present.', price: 'From ₹99 / print' },
    { icon: '💎', title: 'Jewellery Resin Masters', desc: 'Ultra-fine resin prints with sharp edges, crisp details, and casting-ready accuracy for jewellers who cannot afford compromise.', price: 'From ₹199 / print' },
    { icon: '🎨', title: 'Custom Gifts & Decor', desc: 'Names, logos, memories, and one-of-a-kind pieces printed to feel personal, memorable, and impossible to ignore.', price: 'From ₹249 / print' },
    { icon: '📐', title: 'CAD + Print Package', desc: 'No design file yet? Send a sketch, image, or idea and get both design support and final print production under one roof.', price: 'From ₹499 / model' },
    { icon: '🏛️', title: 'Architecture Models', desc: 'Detailed scale models built for client presentations, concept reviews, and display pieces that look premium the moment they arrive.', price: 'Custom Quote' },
    { icon: '🚀', title: 'Express Production', desc: 'Fast-turnaround printing for urgent deadlines, demos, investor meetings, and launch-day prototypes that need to move quickly.', price: 'Priority Quote' },
  ]

  const processSteps = [
    { num: '01', title: 'Share Your Idea', desc: 'Send us a design file, sketch, or brief on WhatsApp or through the quote form and we respond fast.' },
    { num: '02', title: 'We Quote & Confirm', desc: 'You get a clear price, material recommendation, and realistic timeline before production starts.' },
    { num: '03', title: 'We Print & Deliver', desc: 'Your part is printed, quality-checked, and dispatched with a production-focused workflow built for consistency.' },
  ]

  return (
    <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      {/* NAV */}
      <Navbar transparent />

      {/* HERO */}
      <section className="relative overflow-hidden px-6 pb-18 pt-32 md:px-10 md:pt-36 xl:px-12">
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

        <div className="relative z-10 mx-auto grid min-h-[calc(100vh-10rem)] max-w-[1280px] items-center gap-14 xl:gap-18 lg:grid-cols-[minmax(0,1.02fr)_minmax(420px,0.98fr)]">
          <div className="mx-auto max-w-[640px] text-center lg:mx-0 lg:text-left">
            <div className="inline-flex items-center gap-1 rounded-full border border-[rgba(255,153,0,0.2)] bg-[rgba(255,153,0,0.08)] px-[0.8rem] py-[0.3rem] text-xs text-[#ff9900] animate-fadeUp">
              🇮🇳 Made in India · Precision 3D Printing
            </div>

            <div
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-[rgba(255,92,26,0.3)] bg-[rgba(255,92,26,0.08)] px-[1rem] py-[0.35rem] text-sm font-medium text-[#FF5C1A] animate-fadeUp"
              style={{ animationDelay: '0.1s' }}
            >
              <span className="h-[6px] w-[6px] rounded-full bg-[#FF5C1A] animate-pulse-dot" />
              Trusted by makers, founders, designers, and engineering teams
            </div>

            <h1
              className="relative mt-7 font-[var(--font-syne)] text-[clamp(2.8rem,7vw,5.7rem)] font-extrabold leading-[0.98] tracking-[-2.5px] text-white animate-fadeUp"
              style={{ animationDelay: '0.2s' }}
            >
              Your Idea.
              <br />
              <span className="text-[#FF5C1A]">Printed.</span> Delivered.
              <br />
              <span className="font-normal text-[#7a82a0]">From concept to reality in days, not weeks.</span>
            </h1>

            <p
              className="relative mt-6 max-w-[560px] text-base leading-[1.8] text-[#7a82a0] md:text-lg animate-fadeUp lg:mx-0"
              style={{ animationDelay: '0.3s' }}
            >
              Professional FDM and resin printing with fast-turnaround support for businesses, architects, jewellery designers, product teams, and ambitious creators across India.
            </p>

            <div
              className="relative mt-9 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start animate-fadeUp"
              style={{ animationDelay: '0.4s' }}
            >
              <Link href="/instant-quote" className="rounded-lg bg-[#FF5C1A] px-[2rem] py-[0.8rem] text-base font-medium text-white transition-transform hover:translate-y-[-2px] hover:opacity-90">
                Get A Free Quote
              </Link>
              <Link href="/gallery" className="rounded-lg border border-[rgba(255,255,255,0.07)] bg-transparent px-[2rem] py-[0.8rem] text-base font-medium text-white transition-colors hover:border-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.04)]">
                See What We Print
              </Link>
            </div>

            <div
              className="mt-10 grid gap-3 text-left sm:grid-cols-3 animate-fadeUp"
              style={{ animationDelay: '0.5s' }}
            >
              {[
                ['Precision', 'Industrial-grade quality with sharp, true-to-spec results'],
                ['Turnaround', 'Same-week production for fast-moving projects'],
                ['Trust', 'Direct communication, clear pricing, no hidden surprises'],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] px-4 py-4 backdrop-blur-sm"
                >
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#7a82a0]">{label}</div>
                  <div className="mt-2 text-sm font-medium text-white">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[560px] animate-fadeUp lg:mx-0" style={{ animationDelay: '0.45s' }}>
            <div className="absolute -inset-8 bg-[radial-gradient(circle_at_center,rgba(255,92,26,0.18),transparent_55%)] blur-2xl" />
            <div className="relative overflow-hidden rounded-[32px] border border-[rgba(255,255,255,0.1)] bg-[rgba(8,13,24,0.82)] p-3 shadow-[0_28px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between rounded-[22px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#7a82a0]">Production Feed</div>
                  <div className="mt-1 text-sm font-medium text-white">Engineering-grade printing in action</div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.7)]" />
                  Live motion
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[26px] border border-[rgba(255,255,255,0.08)] bg-[#050810]">
                <video
                  className="aspect-[4/5] w-full object-cover md:aspect-[5/6]"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster="/logo.png"
                  aria-label="Flux3D printer working on a print job"
                >
                  <source src="/printer.mp4" type="video/mp4" />
                  Your browser does not support the printer video.
                </video>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#050810] via-[rgba(5,8,16,0.45)] to-transparent" />
                <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-4">
                  <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(5,8,16,0.72)] px-4 py-3 backdrop-blur-md">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-[#7a82a0]">Machine</div>
                    <div className="mt-1 text-sm font-medium text-white">Bambu Lab X1 Carbon + AMS</div>
                  </div>
                  <div className="hidden rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(5,8,16,0.72)] px-4 py-3 text-right backdrop-blur-md sm:block">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-[#7a82a0]">Focus</div>
                    <div className="mt-1 text-sm font-medium text-white">Precision, repeatability, premium finish</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="relative z-10 mx-auto mt-14 grid max-w-[1200px] overflow-hidden rounded-[28px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)] backdrop-blur-sm animate-fadeUp sm:grid-cols-2 xl:grid-cols-4" style={{ animationDelay: '0.6s' }}>
          <div className="px-8 py-7 text-center xl:border-r border-b xl:border-b-0 border-[rgba(255,255,255,0.07)]">
            <div className="font-[var(--font-syne)] text-4xl font-extrabold text-white leading-tight">
              500<span className="text-[#FF5C1A]">+</span>
            </div>
            <div className="text-sm text-[#7a82a0] mt-1">Parts Printed and Counting</div>
          </div>
          <div className="px-8 py-7 text-center sm:border-l xl:border-l-0 xl:border-r border-b xl:border-b-0 border-[rgba(255,255,255,0.07)]">
            <div className="font-[var(--font-syne)] text-4xl font-extrabold text-white leading-tight">
              ±0.05<span className="text-[#FF5C1A]">mm</span>
            </div>
            <div className="text-sm text-[#7a82a0] mt-1">Dimensional Accuracy</div>
          </div>
          <div className="px-8 py-7 text-center xl:border-r border-[rgba(255,255,255,0.07)]">
            <div className="font-[var(--font-syne)] text-4xl font-extrabold text-white leading-tight">
              3-5<span className="text-[#FF5C1A]">d</span>
            </div>
            <div className="text-sm text-[#7a82a0] mt-1">Average Turnaround</div>
          </div>
          <div className="px-8 py-7 text-center sm:border-l xl:border-l-0 border-[rgba(255,255,255,0.07)]">
            <div className="font-[var(--font-syne)] text-4xl font-extrabold text-white leading-tight">
              10<span className="text-[#FF5C1A]">+</span>
            </div>
            <div className="text-sm text-[#7a82a0] mt-1">Materials Available</div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="px-6 py-24 md:px-10 xl:px-12">
        <div className="mx-auto max-w-[1200px]">
        <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[640px]">
            <p className="mb-4 text-sm font-medium uppercase tracking-[3px] text-[#FF5C1A]">What We Make For You</p>
            <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold leading-[1.05] tracking-[-1px] text-white">
              Every Project. Every Material. <br /><span className="text-[#7a82a0]">Every Detail.</span>
            </h2>
          </div>
          <p className="max-w-[420px] text-sm leading-7 text-[#7a82a0]">
            From investor-ready prototypes to casting masters and custom gifts, every job is built around precision, material fit, and a finish you can proudly show.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {/* Service cards */}
          {serviceCards.map((service, i) => (
            <div key={i} className="bg-[#0d1120] p-8 transition-background hover:bg-[#111827] relative overflow-hidden group">
              <div className="absolute inset-0 rounded-[28px] border border-[rgba(255,255,255,0.07)]" />
              <div className="absolute inset-x-0 top-0 h-[2px] bg-[#FF5C1A] opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(255,92,26,0.08)] text-2xl">{service.icon}</div>
                <div className="mb-2 font-[var(--font-syne)] text-xl font-bold text-white">{service.title}</div>
                <div className="text-sm leading-7 text-[#7a82a0]">{service.desc}</div>
                <div className="mt-6 text-sm font-medium text-[#FF5C1A]">{service.price}</div>
              </div>
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* EXPLORE */}
      <section className="bg-gradient-to-b from-transparent via-[rgba(255,92,26,0.04)] to-transparent px-6 py-24 md:px-10 xl:px-12">
        <div className="mx-auto max-w-[1200px]">
          <p className="mb-4 text-sm font-medium uppercase tracking-[3px] text-[#FF5C1A]">Explore</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold leading-[1.05] tracking-[-1px] text-white">
            Dedicated Pages for <br /><span className="text-[#7a82a0]">Materials, Gallery & Pricing</span>
          </h2>
          <p className="mb-8 mt-6 max-w-[620px] text-sm leading-7 text-[#7a82a0]">
            The landing page stays lighter while detailed material specs, showcase examples, and pricing guidance live on their own focused pages.
          </p>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                href: '/materials',
                title: 'Materials',
                desc: 'Inspect PLA+, ABS, PETG, TPU, resin, and multi-color workflows with detailed specs.',
                stat: '8 material profiles',
              },
              {
                href: '/gallery',
                title: 'Gallery',
                desc: 'Browse application-focused examples across prototyping, branded parts, miniatures, and fixtures.',
                stat: '4 showcase categories',
              },
              {
                href: '/pricing',
                title: 'Pricing',
                desc: 'See service starting prices, quoting factors, and how to request custom production jobs.',
                stat: 'From ₹99 onward',
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-[28px] border border-[rgba(255,255,255,0.07)] bg-[#0d1120] p-7 transition-all hover:-translate-y-1 hover:border-[#FF5C1A]/50 hover:bg-[#10162a]"
              >
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#7a82a0]">{item.stat}</div>
                <div className="mt-4 font-[var(--font-syne)] text-2xl font-bold text-white">{item.title}</div>
                <p className="mt-3 text-sm leading-7 text-[#7a82a0]">{item.desc}</p>
                <div className="mt-6 text-sm font-medium text-[#FF8A57]">Open page →</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="px-6 py-24 md:px-10 xl:px-12">
        <div className="mx-auto max-w-[1200px]">
          <p className="mb-4 text-sm font-medium uppercase tracking-[3px] text-[#FF5C1A]">How It Works</p>
          <h2 className="mb-12 font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold leading-[1.05] tracking-[-1px] text-white">
            Simple As 3 Steps<br /><span className="text-[#7a82a0]">From Idea to Delivery</span>
          </h2>
          <div className="relative mt-12">
            {/* Connection line */}
            <div className="absolute left-[16.5%] right-[16.5%] top-7 hidden h-[1px] bg-gradient-to-r from-[#FF5C1A] via-[rgba(255,92,26,0.3)] to-[#FF5C1A] xl:block" />

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {processSteps.map((step, i) => (
              <div key={i} className="relative z-10 rounded-[28px] border border-[rgba(255,255,255,0.07)] bg-[#0d1120] p-6 text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#FF5C1A] bg-[rgba(255,92,26,0.06)] font-[var(--font-syne)] text-lg font-extrabold text-[#FF5C1A]">
                  {step.num}
                </div>
                <div className="mb-2 text-sm font-semibold text-white">{step.title}</div>
                <div className="text-sm leading-6 text-[#7a82a0]">{step.desc}</div>
              </div>
            ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="mb-24 px-6 md:px-10 xl:px-12">
        <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[32px] border border-[rgba(255,255,255,0.07)] bg-[#0d1120] px-6 py-12 text-center md:px-12 md:py-16">
          <div className="absolute -top-[100px] left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[radial-gradient(ellipse,rgba(255,92,26,0.15),transparent_70%)] pointer-events-none" />
          <h2 className="relative mb-4 font-[var(--font-syne)] text-[clamp(2rem,4vw,4rem)] font-extrabold tracking-[-1px] text-white">
            Don&apos;t Let Your Idea <br />Stay On A Screen.
          </h2>
          <p className="relative mx-auto mb-8 max-w-[680px] text-base leading-8 text-[#7a82a0]">
            Your next product, prototype, gift, or presentation model starts with one message. We reply fast and build with precision.
          </p>
          <div className="relative flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/instant-quote" className="rounded-lg bg-[#FF5C1A] px-[2.5rem] py-[0.9rem] text-lg font-medium text-white transition-opacity hover:opacity-90">
              Start Your Order
            </Link>
            <button className="rounded-lg border border-[rgba(255,255,255,0.07)] bg-transparent px-[2rem] py-[0.9rem] text-lg font-medium text-white transition-colors hover:border-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.04)]">
              WhatsApp Us Now
            </button>
          </div>
          <p className="relative mt-6 text-xs text-[#7a82a0]">
            Trusted by engineers, architects, jewellery designers, and gifting brands across India.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[rgba(255,255,255,0.07)] px-6 py-8 md:px-10 xl:px-12">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-5 text-sm text-[#7a82a0] lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="font-[var(--font-syne)] font-extrabold text-white">
              flux<span className="text-[#FF5C1A]">3d</span>
            </div>
            <div className="mt-2 max-w-[320px] text-xs leading-6 text-[#66708e]">
              Additive innovation for makers, startups, and engineering teams across India.
            </div>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 list-none">
            <li><a href="#" className="text-[#7a82a0] no-underline hover:text-white">Privacy</a></li>
            <li><a href="#" className="text-[#7a82a0] no-underline hover:text-white">Terms</a></li>
            <li><a href="#" className="text-[#7a82a0] no-underline hover:text-white">WhatsApp</a></li>
            <li><a href="#" className="text-[#7a82a0] no-underline hover:text-white">Instagram</a></li>
          </ul>
          <span>© 2025 Flux 3D · Mumbai, India</span>
        </div>
      </footer>
    </div>
  );
}
