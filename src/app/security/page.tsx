import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, Lock, FileCheck2, CreditCard, Users, Headphones } from 'lucide-react'
import { getSettings } from '@/lib/settings'
import { buildPublicBusinessProfile } from '@/lib/public-business'

export const metadata: Metadata = {
  title: 'Security | Flux3D',
  description: 'Verified security practices for Flux3D, including server-side authorization, role-based access, and payment verification.',
  alternates: {
    canonical: 'https://flux3d.in/security',
  },
  openGraph: {
    title: 'Security | Flux3D',
    description: 'Verified security practices for Flux3D, including server-side authorization, role-based access, and payment verification.',
    url: 'https://flux3d.in/security',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Security | Flux3D',
    description: 'Verified security practices for Flux3D, including server-side authorization, role-based access, and payment verification.',
  },
}

export default async function SecurityPage() {
  const settings = await getSettings()
  const profile = buildPublicBusinessProfile(settings)

  const controls = [
    {
      icon: Users,
      title: 'Role-based access',
      body: 'Administrative pages use authenticated routes and server-side access checks. Public pages do not require a login.',
    },
    {
      icon: Lock,
      title: 'Server-side authorization',
      body: 'State-changing operations such as order creation, contact submission, and payment callbacks are validated on the server.',
    },
    {
      icon: CreditCard,
      title: 'Payment verification',
      body: 'The PayU flow uses server-generated payment fields and verifies gateway responses before marking a payment successful.',
    },
    {
      icon: FileCheck2,
      title: 'Auditability',
      body: 'Order, billing, and admin workflows are logged through application routes and database-backed records.',
    },
  ]

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0F1B3D]">
      <main className="mx-auto max-w-6xl px-6 py-16 sm:py-20 lg:px-8">
        <section className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full bg-[#6d28d9]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6d28d9]">
            <ShieldCheck className="h-4 w-4" />
            Security
          </div>
          <h1 className="font-[var(--font-syne)] text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
            Verified security practices for Flux3D
          </h1>
          <p className="mt-5 text-lg leading-8 text-[#5C607B]">
            Flux3D provides custom 3D printing and manufacturing services. The website uses authenticated server routes, role-based access, and server-side payment verification to protect customer and order data.
          </p>
        </section>

        <section className="mt-14 grid gap-6 md:grid-cols-2">
          {controls.map((item) => (
            <article key={item.title} className="rounded-3xl border border-[#6d28d9]/10 bg-white p-7 shadow-sm">
              <item.icon className="h-6 w-6 text-[#6d28d9]" />
              <h2 className="mt-4 text-xl font-bold">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#5C607B]">{item.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-14 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-3xl bg-[#0F1B3D] p-8 text-white shadow-lg">
            <h2 className="text-2xl font-bold">What is verified today</h2>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-white/75">
              <li>Public pages are served without login.</li>
              <li>Support details shown on the site use the verified Flux3D contact information.</li>
              <li>PayU payment requests are built on the server, not in the browser.</li>
              <li>Gateway responses are verified before an order is marked paid.</li>
              <li>Customer support, refund, delivery, and legal pages are public and linked in the footer.</li>
            </ul>
          </article>

          <article className="rounded-3xl border border-[#6d28d9]/10 bg-[#faf9f7] p-8 shadow-sm">
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <Headphones className="h-5 w-5 text-[#6d28d9]" />
              Public contact
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#5C607B]">
              Security issues, access concerns, or reportable bugs can be sent to the public support channel.
            </p>
            <div className="mt-6 space-y-3 text-sm leading-7">
              <p><strong>Brand:</strong> {profile.brandName}</p>
              <p><strong>Email:</strong> <a className="text-[#6d28d9] hover:underline" href={`mailto:${profile.supportEmail}`}>{profile.supportEmail}</a></p>
              <p><strong>Phone:</strong> <a className="text-[#6d28d9] hover:underline" href={`tel:${profile.supportPhone}`}>{profile.supportPhone}</a></p>
              <p><strong>Address:</strong> {profile.registeredAddress}</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/contact" className="rounded-xl bg-[#6d28d9] px-5 py-3 text-sm font-semibold text-white">Contact Us</Link>
              <Link href="/privacy-policy" className="rounded-xl border border-[#6d28d9]/20 bg-white px-5 py-3 text-sm font-semibold text-[#0F1B3D]">Privacy Policy</Link>
            </div>
          </article>
        </section>

        <p className="mt-12 text-center text-xs leading-6 text-[#5C607B]">
          Flux3D does not claim SOC 2, ISO 27001, PCI-DSS, or any other certification unless separately verified and published.
        </p>
      </main>
    </div>
  )
}
