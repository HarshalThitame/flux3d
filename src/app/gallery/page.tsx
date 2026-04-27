import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import { absoluteUrl } from '@/lib/site'

export const metadata: Metadata = {
  title: '3D Printing Project Gallery',
  description:
    'Browse Flux3D application categories for prototypes, functional parts, brand models, miniatures, and production fixtures.',
  alternates: {
    canonical: '/gallery',
  },
  openGraph: {
    title: 'Flux3D Gallery',
    description:
      'A curated look at print categories across prototyping, production, branding, and precision detail work.',
    url: absoluteUrl('/gallery'),
  },
}

const galleryItems = [
  {
    title: 'Rapid Prototypes',
    subtitle: 'Product validation',
    description:
      'Fast design iterations for startups, founders, and engineering teams validating fit, form, and usability.',
    accent: 'from-[#FF5C1A]/30 via-[#ff7b4d]/10 to-transparent',
  },
  {
    title: 'Functional Parts',
    subtitle: 'Workshop ready',
    description:
      'Jigs, brackets, mounts, and mechanical helpers built for repeat use and tighter production workflows.',
    accent: 'from-[#23c483]/30 via-[#23c483]/10 to-transparent',
  },
  {
    title: 'Brand Models',
    subtitle: 'Color and finish',
    description:
      'Display pieces, logos, and event-ready prints using silk finishes and multi-color AMS production.',
    accent: 'from-[#8b5cf6]/30 via-[#3498db]/10 to-transparent',
  },
  {
    title: 'Detail Prints',
    subtitle: 'Resin precision',
    description:
      'Miniatures, jewelry masters, and high-detail models where surface finish and fine geometry matter most.',
    accent: 'from-[#d946ef]/30 via-[#8e44ad]/10 to-transparent',
  },
]

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
      <Navbar transparent />
      <main className="px-6 pb-20 pt-32 md:px-12">
        <div className="mx-auto max-w-[1200px]">
          <p className="mb-4 text-sm font-medium uppercase tracking-[3px] text-[#FF5C1A]">Gallery</p>
          <h1 className="font-[var(--font-syne)] text-[clamp(2.4rem,5vw,4.6rem)] font-extrabold leading-[1.02] tracking-[-2px] text-white">
            Showcase Categories for <span className="text-[#7a82a0]">What We Print</span>
          </h1>
          <p className="mt-6 max-w-[700px] text-base leading-8 text-[#7a82a0]">
            This page is structured as a fast-loading showcase overview. It keeps the route lightweight while still giving visitors a clearer sense of the work Flux3D handles.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {galleryItems.map((item) => (
              <article
                key={item.title}
                className="relative overflow-hidden rounded-[30px] border border-[rgba(255,255,255,0.08)] bg-[#0d1120] p-8"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.accent}`} />
                <div className="relative">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#FF8A57]">{item.subtitle}</div>
                  <h2 className="mt-4 font-[var(--font-syne)] text-3xl font-bold text-white">{item.title}</h2>
                  <p className="mt-4 max-w-[420px] text-sm leading-7 text-[#b1b9d5]">{item.description}</p>
                  <div className="mt-10 h-[220px] rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
