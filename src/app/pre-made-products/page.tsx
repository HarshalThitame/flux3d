import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import Link from 'next/link'
import { ArrowRight, Gift, Home, Joystick, Package, Sparkles } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { absoluteUrl } from '@/lib/site'

const productCategories = [
  {
    icon: Joystick,
    name: 'Gaming Accessories',
    description: 'Controller docks, headset stands, desk add-ons, and setup pieces printed to order.',
  },
  {
    icon: Home,
    name: 'Home Decor',
    description: 'Modern vases, planters, organizers, and shelf pieces with custom colors and finishes.',
  },
  {
    icon: Gift,
    name: 'Custom Gifts',
    description: 'Nameplates, keepsakes, event favors, and personalized display pieces for gifting.',
  },
  {
    icon: Package,
    name: 'Desk Utility',
    description: 'Cable organizers, phone stands, tool trays, and compact workspace helpers.',
  },
]

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title: `${settings.businessName} — Pre-Made 3D Printed Products`,
    description:
      settings.businessDescription || 'Browse ready-to-order 3D printed products from Flux 3D, including gaming accessories, desk utilities, home decor, and personalized gifts.',
    alternates: {
      canonical: '/pre-made-products',
    },
    openGraph: {
      title: `${settings.businessName} — Pre-Made 3D Printed Products`,
      description:
        settings.businessDescription || 'Ready-to-order 3D printed products for desks, gaming setups, gifts, and home decor.',
      url: absoluteUrl('/pre-made-products'),
      type: 'website',
    },
  }
}

export default function PreMadeProductsPage() {
  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0F1B3D]">
      <Navbar transparent />
      <main className="px-6 pt-32 pb-20">
        <section className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#7C5CFF]/20 bg-[#7C5CFF]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#7C5CFF]">
              <Sparkles className="h-4 w-4" />
              Pre-Made Products
            </div>
            <h1 className="mt-6 font-[var(--font-syne)] text-4xl font-extrabold tracking-[-0.03em] text-[#0F1B3D] sm:text-5xl">
              Ready-to-order 3D printed products.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#93a0c4]">
              This page is separate from Materials. Use it for finished products that do not require uploading your own 3D file.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/instant-quote"
                className="inline-flex items-center gap-2 rounded-xl bg-[#7C5CFF] px-5 py-3 text-sm font-semibold text-white transition-all hover:shadow-[0_0_25px_rgba(124, 92, 255,0.28)]"
              >
                Request a custom product
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/materials"
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-semibold text-[#c6cee5] transition-colors hover:border-white/[0.14] hover:text-[#0F1B3D]"
              >
                View materials only
              </Link>
            </div>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {productCategories.map((category) => (
              <article
                key={category.name}
                className="rounded-3xl border border-white/[0.08] bg-[#FFFFFF] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.24)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7C5CFF]/12 text-[#7C5CFF]">
                  <category.icon className="h-6 w-6" />
                </div>
                <h2 className="mt-5 font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">{category.name}</h2>
                <p className="mt-3 text-sm leading-7 text-[#93a0c4]">{category.description}</p>
              </article>
            ))}
          </div>

          <div className="mt-20 rounded-3xl border border-[#7C5CFF]/20 bg-[#FFFFFF] p-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-yellow-400">
              <Sparkles className="h-4 w-4" />
              Coming Soon
            </div>
            <h2 className="mt-6 font-[var(--font-syne)] text-3xl font-bold text-[#0F1B3D]">
              More Products on the Way
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg leading-8 text-[#93a0c4]">
              We&apos;re expanding our catalog with new 3D printed products including controller stands, mobile stands, jewelry, and many more exciting models.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {['Controller Stands', 'Mobile Stands', 'Jewelry', 'Other 3D Models'].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-[#93a0c4]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
