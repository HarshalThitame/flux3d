'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  Box,
  Camera,
  CheckCircle2,
  ChevronRight,
  Filter,
  Layers,
  Play,
  Printer,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'

type GalleryCategory = 'All' | 'Prototypes' | 'Functional' | 'Showcase' | 'Precision' | 'Architecture'
type ProjectCategory = Exclude<GalleryCategory, 'All'>
type ProjectMedia =
  | { type: 'image'; src: string; alt: string; fit?: 'contain' | 'cover' }
  | { type: 'video'; src: string; label: string }

type GalleryProject = {
  title: string
  category: ProjectCategory
  eyebrow: string
  summary: string
  material: string
  finish: string
  lead: string
  accent: string
  backdrop: string
  media: ProjectMedia
  metrics: Array<{ label: string; value: string }>
}

const categories: GalleryCategory[] = ['All', 'Prototypes', 'Functional', 'Showcase', 'Precision', 'Architecture']

const stats = [
  { label: 'Finish families', value: '14', icon: Sparkles },
  { label: 'Prototype cycles', value: '48h', icon: Zap },
  { label: 'Print modes', value: 'FDM + Resin', icon: Printer },
  { label: 'Visual QA', value: 'Every build', icon: CheckCircle2 },
]

const tickerItems = [
  'Prototype reviews',
  'Surface finish',
  'Form fit checks',
  'Studio models',
  'Functional parts',
  'Dispatch-ready builds',
]

const projects: GalleryProject[] = [
  {
    title: 'Ceramic-Style Planter',
    category: 'Showcase',
    eyebrow: 'Matte product study',
    summary: 'A clean consumer object focused on wall thickness, curve quality, and paint-ready finishing.',
    material: 'PLA matte',
    finish: 'Sanded satin',
    lead: 'Display ready',
    accent: '#67e8f9',
    backdrop: 'linear-gradient(135deg, #111827 0%, #0f766e 48%, #fbbf24 140%)',
    media: { type: 'image', src: '/pot.webp', alt: 'Matte 3D printed planter sample', fit: 'contain' },
    metrics: [
      { label: 'Layer height', value: '0.16 mm' },
      { label: 'Finish', value: 'Satin' },
    ],
  },
  {
    title: 'Live Printer Run',
    category: 'Functional',
    eyebrow: 'Production floor',
    summary: 'A live build pass showing machine motion, bed adhesion, and repeatable print setup.',
    material: 'PLA / PETG',
    finish: 'As printed',
    lead: 'Build validated',
    accent: '#fbbf24',
    backdrop: 'linear-gradient(135deg, #111827 0%, #6d28d9 52%, #f97316 138%)',
    media: { type: 'video', src: '/printer.mp4', label: '3D printer running a live print job' },
    metrics: [
      { label: 'Setup', value: 'Calibrated' },
      { label: 'Use case', value: 'Functional' },
    ],
  },
  {
    title: 'Form-Fit Prototype',
    category: 'Prototypes',
    eyebrow: 'Product validation',
    summary: 'Fast geometry review for teams checking ergonomics, enclosure proportions, and assembly space.',
    material: 'PLA pro',
    finish: 'Fine texture',
    lead: 'Iteration ready',
    accent: '#a78bfa',
    backdrop: 'linear-gradient(135deg, #111827 0%, #334155 42%, #7c3aed 128%)',
    media: { type: 'image', src: '/pot.png', alt: '3D printed prototype object on a clean background', fit: 'contain' },
    metrics: [
      { label: 'Cycle', value: '2 days' },
      { label: 'Review', value: 'Fit check' },
    ],
  },
  {
    title: 'Brand Desk Object',
    category: 'Showcase',
    eyebrow: 'Identity object',
    summary: 'A compact branded piece suited for events, packaging inserts, and customer-facing displays.',
    material: 'Silk PLA',
    finish: 'Gloss accent',
    lead: 'Presentation finish',
    accent: '#f472b6',
    backdrop: 'linear-gradient(135deg, #111827 0%, #831843 48%, #22d3ee 145%)',
    media: { type: 'image', src: '/logo.png', alt: 'Flux3D brand mark used as a printed display reference', fit: 'contain' },
    metrics: [
      { label: 'Detail', value: 'Clean edges' },
      { label: 'Color', value: 'Brand match' },
    ],
  },
  {
    title: 'Architectural Volume',
    category: 'Architecture',
    eyebrow: 'Scale study',
    summary: 'A presentation model direction for massing studies, site review, and studio communication.',
    material: 'PLA white',
    finish: 'Low sheen',
    lead: 'Studio model',
    accent: '#34d399',
    backdrop: 'linear-gradient(135deg, #111827 0%, #166534 50%, #e0f2fe 152%)',
    media: { type: 'image', src: '/pot.webp', alt: 'White 3D printed model used as architectural form reference', fit: 'contain' },
    metrics: [
      { label: 'Scale', value: 'Compact' },
      { label: 'Readability', value: 'High' },
    ],
  },
  {
    title: 'Detail Surface Sample',
    category: 'Precision',
    eyebrow: 'Fine geometry',
    summary: 'A small-object finish study for crisp edges, detail retention, and close-view inspection.',
    material: 'Resin / PLA',
    finish: 'Smooth pass',
    lead: 'Detail checked',
    accent: '#38bdf8',
    backdrop: 'linear-gradient(135deg, #111827 0%, #075985 50%, #fef3c7 150%)',
    media: { type: 'image', src: '/pot.png', alt: 'Detailed 3D printed sample for surface quality review', fit: 'contain' },
    metrics: [
      { label: 'Tolerance', value: 'Tight' },
      { label: 'Surface', value: 'Smooth' },
    ],
  },
]

const pageVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.62, ease: [0.16, 1, 0.3, 1] },
  },
}

function projectDetails(project: GalleryProject) {
  return [
    { label: 'Material', value: project.material },
    { label: 'Finish', value: project.finish },
    { label: 'Status', value: project.lead },
  ]
}

function visualStyle(project: GalleryProject) {
  return {
    '--gallery-accent': project.accent,
    '--gallery-visual-bg': project.backdrop,
  } as CSSProperties
}

function GalleryPremiumFX() {
  const meterRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    let frame = 0

    const updatePointer = (event: PointerEvent) => {
      if (!window.matchMedia('(pointer: fine)').matches) return
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--gallery-pointer-x', `${event.clientX}px`)
      })
    }

    const updateProgress = () => {
      const page = document.documentElement
      const maxScroll = Math.max(page.scrollHeight - window.innerHeight, 1)
      const progress = Math.min(Math.max(window.scrollY / maxScroll, 0), 1)
      if (meterRef.current) {
        meterRef.current.style.transform = `scaleX(${progress})`
      }
    }

    updateProgress()
    window.addEventListener('pointermove', updatePointer, { passive: true })
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', updatePointer)
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
    }
  }, [])

  return (
    <>
      <div className="gallery-pointer-light" aria-hidden="true" />
      <div className="gallery-scroll-meter" aria-hidden="true">
        <span ref={meterRef} />
      </div>
    </>
  )
}

function ProjectVisual({ project, large = false, priority = false }: { project: GalleryProject; large?: boolean; priority?: boolean }) {
  const reduceMotion = useReducedMotion()

  return (
    <div
      className={`gallery-project-visual relative isolate overflow-hidden rounded-lg ${large ? 'gallery-project-visual-large' : ''}`}
      style={visualStyle(project)}
    >
      <div className="gallery-visual-grid" aria-hidden="true" />
      <div className="gallery-visual-scan" aria-hidden="true" />

      {project.media.type === 'video' ? (
        <video
          src={project.media.src}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          aria-label={project.media.label}
        />
      ) : (
        <motion.div
          className="gallery-visual-object absolute inset-5"
          animate={reduceMotion ? undefined : { y: [0, -8, 0], rotate: [0, 0.6, 0] }}
          transition={{ duration: 7.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Image
            src={project.media.src}
            alt={project.media.alt}
            fill
            priority={priority}
            sizes={large ? '(min-width: 1024px) 720px, 100vw' : '(min-width: 1024px) 420px, 100vw'}
            className={project.media.fit === 'cover' ? 'object-cover' : 'object-contain'}
          />
        </motion.div>
      )}

      <div className="gallery-visual-shade" aria-hidden="true" />
      <div className="gallery-visual-tag">
        <Camera className="h-3.5 w-3.5" />
        {project.lead}
      </div>
      {project.media.type === 'video' && (
        <div className="gallery-video-play">
          <Play className="h-4 w-4 fill-current" />
        </div>
      )}
    </div>
  )
}

export default function GalleryClient() {
  const [activeCategory, setActiveCategory] = useState<GalleryCategory>('All')
  const [selectedProject, setSelectedProject] = useState<GalleryProject | null>(null)
  const reduceMotion = useReducedMotion()

  const visibleProjects = useMemo(() => {
    if (activeCategory === 'All') return projects
    return projects.filter((project) => project.category === activeCategory)
  }, [activeCategory])

  const featuredProject = visibleProjects[0] ?? projects[0]
  const consoleRows = [
    { label: 'Active board', value: `${visibleProjects.length} works`, width: '74%' },
    { label: 'Category', value: activeCategory, width: activeCategory === 'All' ? '58%' : '68%' },
    { label: 'Inspection', value: 'live', width: '46%' },
    { label: 'Finish signal', value: 'studio', width: '64%' },
  ]

  return (
    <main className="gallery-premium-content min-h-screen w-full max-w-[100vw] overflow-hidden text-white">
      <GalleryPremiumFX />

      <section className="gallery-hero-premium relative isolate w-full max-w-[100vw] overflow-hidden px-4 pb-14 pt-6 text-white sm:px-6 md:px-10 lg:px-12">
        <video
          src="/printer2.mp4"
          className="gallery-hero-video absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="Flux3D printer motion behind gallery hero"
        />
        <div className="gallery-hero-depth" aria-hidden="true" />
        <div className="gallery-hero-grid" aria-hidden="true" />
        <div className="gallery-hero-beam" aria-hidden="true" />
        <div className="gallery-hero-frame" aria-hidden="true" />

        <motion.div
          variants={pageVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 mx-auto flex min-h-[86svh] w-full max-w-[1220px] min-w-0 flex-col justify-start pb-8 pt-8 md:pt-10 lg:pt-12"
        >
          <motion.div variants={itemVariants} className="mb-5 flex items-center gap-2 text-sm font-medium text-white/[0.64]">
            <Link href="/" className="transition hover:text-white">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white">Gallery</span>
          </motion.div>

          <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start">
            <div className="min-w-0">
              <motion.div
                variants={itemVariants}
                className="gallery-hero-kicker inline-flex w-fit items-center gap-2 rounded-lg border border-white/[0.14] bg-white/10 px-4 py-2 text-xs font-black uppercase text-white shadow-[0_16px_48px_rgba(0,0,0,0.24)] backdrop-blur"
              >
                <Sparkles className="h-4 w-4 text-amber-200" />
                Flux3D Gallery
              </motion.div>

              <motion.h1
                variants={itemVariants}
                className="gallery-hero-title mt-5 max-w-[calc(100vw-2rem)] break-words text-4xl font-black leading-[1.04] text-white sm:text-6xl sm:leading-[0.96] lg:max-w-5xl lg:text-8xl lg:leading-[0.9]"
              >
                A cinematic archive of real 3D print outcomes.
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="mt-6 max-w-[calc(100vw-2rem)] text-base leading-8 text-white/[0.72] sm:text-lg lg:max-w-2xl"
              >
                Explore prototypes, functional parts, display pieces, and fine-detail builds through a premium production board designed for fast visual inspection.
              </motion.p>

              <motion.div variants={itemVariants} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/quote"
                  className="gallery-primary-action group inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-black text-[#05060a] shadow-[0_18px_54px_rgba(255,255,255,0.16)] transition hover:bg-[#ecfeff]"
                >
                  Start a project
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/3d-shop"
                  className="gallery-secondary-action inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/[0.18] bg-white/10 px-6 text-sm font-black text-white backdrop-blur transition hover:border-cyan-300/40 hover:bg-cyan-300/[0.12]"
                >
                  Shop 3D prints
                  <Box className="h-4 w-4" />
                </Link>
              </motion.div>

              <motion.div variants={itemVariants} className="gallery-hero-stats mt-8 grid gap-3 sm:grid-cols-4">
                {stats.map((stat) => {
                  const Icon = stat.icon
                  return (
                    <div key={stat.label} className="min-w-0 rounded-lg border border-white/10 bg-white/[0.075] p-4 backdrop-blur">
                      <div className="flex items-center gap-2 text-sm font-black text-white">
                        <Icon className="h-4 w-4 text-cyan-200" />
                        {stat.value}
                      </div>
                      <div className="mt-2 text-xs font-bold uppercase text-white/[0.52]">{stat.label}</div>
                    </div>
                  )
                })}
              </motion.div>

              <motion.div variants={itemVariants} className="gallery-intel-ticker mt-6" aria-hidden="true">
                <div>
                  {[...tickerItems, ...tickerItems].map((entry, index) => (
                    <span key={`${entry}-${index}`}>
                      <Sparkles className="h-3.5 w-3.5" />
                      {entry}
                    </span>
                  ))}
                </div>
              </motion.div>
            </div>

            <motion.aside
              variants={itemVariants}
              animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
              transition={reduceMotion ? undefined : { duration: 7.4, repeat: Infinity, ease: 'easeInOut' }}
              className="gallery-curation-panel grid min-w-0 gap-3"
            >
              <div className="gallery-console-topline">
                <span>Visual console</span>
                <strong>live</strong>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProject(featuredProject)}
                className="gallery-console-feature group grid min-w-0 gap-3 text-left"
              >
                <div className="gallery-console-feature-media">
                  <ProjectVisual project={featuredProject} priority />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">{featuredProject.category}</div>
                  <h2 className="mt-2 line-clamp-2 text-xl font-black leading-tight text-white">{featuredProject.title}</h2>
                  <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-white/[0.62]">
                    {featuredProject.summary}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-cyan-200">
                    Open preview
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              </button>

              <div className="gallery-console-stack">
                {consoleRows.map((entry, index) => (
                  <motion.div
                    key={entry.label}
                    animate={reduceMotion ? undefined : { x: [0, index % 2 === 0 ? 2 : -2, 0] }}
                    transition={reduceMotion ? undefined : { duration: 5.2 + index * 0.35, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <span>{entry.label}</span>
                    <strong>{entry.value}</strong>
                    <i style={{ width: entry.width }} />
                  </motion.div>
                ))}
              </div>
            </motion.aside>
          </div>
        </motion.div>
      </section>

      <section className="gallery-premium-section relative overflow-hidden px-4 py-20 sm:px-6 md:px-10 lg:px-12">
        <div className="gallery-section-grid" aria-hidden="true" />
        <div className="relative z-10 mx-auto w-full max-w-[1220px]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-cyan-100"
              >
                <Layers className="h-4 w-4" />
                Selected Work
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="mt-3 max-w-2xl text-3xl font-black leading-tight text-white sm:text-5xl"
              >
                A board built for visual proof, finish detail, and fast project selection.
              </motion.h2>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="gallery-filter-bar"
            >
              <Filter className="ml-3 h-4 w-4 shrink-0 text-cyan-100" />
              {categories.map((category) => {
                const active = activeCategory === category
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setActiveCategory(category)}
                    className={`gallery-filter-chip ${active ? 'is-active' : ''}`}
                  >
                    {category}
                  </button>
                )
              })}
            </motion.div>
          </div>

          <motion.div layout className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {visibleProjects.map((project, index) => (
                <motion.button
                  key={project.title}
                  type="button"
                  layout
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
                  whileHover={reduceMotion ? undefined : { y: -7 }}
                  transition={{ duration: 0.38, delay: index * 0.03, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => setSelectedProject(project)}
                  className="gallery-project-card group text-left"
                  style={visualStyle(project)}
                >
                  <ProjectVisual project={project} />
                  <div className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="gallery-card-category">{project.category}</span>
                      <span className="text-xs font-bold text-white/[0.58]">{project.eyebrow}</span>
                    </div>
                    <h3 className="mt-4 text-xl font-black tracking-[0] text-white">{project.title}</h3>
                    <p className="mt-3 min-h-[72px] text-sm font-semibold leading-6 text-white/[0.64]">
                      {project.summary}
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      {project.metrics.map((metric) => (
                        <div key={metric.label} className="gallery-card-metric">
                          <div className="text-sm font-black text-white">{metric.value}</div>
                          <div className="mt-1 text-xs font-bold text-white/[0.52]">{metric.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      <AnimatePresence>
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="gallery-modal-backdrop fixed inset-0 z-[120] grid place-items-center px-4 py-8"
            onClick={() => setSelectedProject(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="gallery-modal-panel w-full max-w-5xl overflow-y-auto p-4"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-4 pb-4">
                <div className="min-w-0">
                  <div className="text-sm font-black uppercase tracking-[0.16em] text-cyan-100">{selectedProject.category}</div>
                  <h2 className="mt-1 text-2xl font-black tracking-[0] text-white">{selectedProject.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.08] text-white/[0.72] transition hover:bg-white/[0.14] hover:text-white"
                  aria-label="Close gallery preview"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
                <ProjectVisual project={selectedProject} large />
                <div className="gallery-modal-detail p-5">
                  <p className="text-sm font-semibold leading-7 text-white/[0.68]">{selectedProject.summary}</p>
                  <div className="mt-5 space-y-3">
                    {projectDetails(selectedProject).map((detail) => (
                      <div key={detail.label} className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 text-sm last:border-b-0">
                        <span className="font-bold text-white/[0.54]">{detail.label}</span>
                        <span className="text-right font-black text-white">{detail.value}</span>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/quote"
                    className="gallery-primary-action mt-6 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-black text-[#05060a] transition hover:bg-[#ecfeff]"
                  >
                    Request similar work
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
