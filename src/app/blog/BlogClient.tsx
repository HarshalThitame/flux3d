'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  BookMarked,
  BookOpenText,
  CalendarDays,
  ChevronRight,
  Clock3,
  Factory,
  FileText,
  Filter,
  Layers3,
  PenTool,
  Search,
  Sparkles,
  Tag,
  UserRound,
  Wand2,
} from 'lucide-react'
import type { BlogPost } from '@/lib/blog/types'

const FALLBACK_IMAGE = '/pot.webp'
const ALL_TOPICS = 'All'

const topicHighlights = [
  { label: 'Materials', value: 'Material choices, finish notes, and part behavior.', icon: Layers3 },
  { label: 'Design', value: 'Cleaner models, tighter tolerances, and smarter files.', icon: PenTool },
  { label: 'Production', value: 'Print strategy, batching, inspection, and dispatch.', icon: Factory },
  { label: 'Insights', value: 'Short reads from the Flux3D production desk.', icon: FileText },
]

const editorialStats = [
  { label: 'Signal', value: 'Practical guides', icon: BookOpenText },
  { label: 'Focus', value: 'Better parts', icon: Wand2 },
  { label: 'Format', value: 'Fast reads', icon: BookMarked },
]

const tickerItems = [
  'Material calls',
  'Print strategy',
  'Tolerance notes',
  'Finish choices',
  'Prototype planning',
  'Production dispatch',
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

function formatDate(value?: string | null) {
  if (!value) return 'Recent'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recent'

  return date.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function readingTime(post: BlogPost) {
  return post.reading_time_minutes || post.read_time || 1
}

function postImage(post?: BlogPost | null) {
  return post?.featured_image || FALLBACK_IMAGE
}

function authorInitial(post: BlogPost) {
  return (post.author_name || 'Flux3D Team').charAt(0).toUpperCase()
}

function postTitle(post: BlogPost) {
  return post.seo_title || post.title
}

function postDate(post: BlogPost) {
  return formatDate(post.published_at || post.created_at)
}

function uniqueCategories(posts: BlogPost[]) {
  const categories = posts
    .map((post) => post.category?.trim())
    .filter((category): category is string => Boolean(category))
  return [ALL_TOPICS, ...Array.from(new Set(categories))]
}

function matchesQuery(post: BlogPost, query: string) {
  if (!query.trim()) return true
  const normalized = query.trim().toLowerCase()
  return [
    post.title,
    post.seo_title,
    post.excerpt,
    post.category,
    post.author_name,
    ...(post.tags ?? []),
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized))
}

function BlogPremiumFX() {
  const meterRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    let frame = 0

    const updatePointer = (event: PointerEvent) => {
      if (!window.matchMedia('(pointer: fine)').matches) return
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--blog-pointer-x', `${event.clientX}px`)
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
      <div className="blog-pointer-light" aria-hidden="true" />
      <div className="blog-scroll-meter" aria-hidden="true">
        <span ref={meterRef} />
      </div>
    </>
  )
}

function ArticleImage({ post, priority = false }: { post: BlogPost; priority?: boolean }) {
  return (
    <div className="blog-article-image relative h-full w-full overflow-hidden bg-[#090b12]">
      <Image
        src={postImage(post)}
        alt={post.featured_image_alt || post.title}
        fill
        priority={priority}
        sizes={priority ? '(min-width: 1024px) 680px, 100vw' : '(min-width: 1024px) 420px, 100vw'}
        className="object-cover transition duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,6,10,0.04)_20%,rgba(5,6,10,0.74)_100%)]" />
      {post.category && (
        <div className="blog-image-tag absolute left-4 top-4 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-[#05060a]/70 px-3 py-1 text-xs font-black text-white shadow-[0_14px_34px_rgba(0,0,0,0.24)] backdrop-blur">
          <Tag className="h-3.5 w-3.5 text-cyan-200" />
          {post.category}
        </div>
      )}
    </div>
  )
}

function MetaRow({ post, compact = false }: { post: BlogPost; compact?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-3 font-bold text-white/[0.58] ${compact ? 'text-xs' : 'text-sm'}`}>
      <span className="inline-flex items-center gap-1.5">
        <CalendarDays className="h-3.5 w-3.5 text-cyan-200" />
        {postDate(post)}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock3 className="h-3.5 w-3.5 text-amber-200" />
        {readingTime(post)} min read
      </span>
    </div>
  )
}

export default function BlogClient({
  posts,
  page,
  totalPages,
}: {
  posts: BlogPost[]
  page: number
  totalPages: number
}) {
  const [activeTopic, setActiveTopic] = useState(ALL_TOPICS)
  const [query, setQuery] = useState('')
  const reduceMotion = useReducedMotion()

  const topics = useMemo(() => uniqueCategories(posts), [posts])
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const topicMatch = activeTopic === ALL_TOPICS || post.category === activeTopic
      return topicMatch && matchesQuery(post, query)
    })
  }, [activeTopic, posts, query])

  const featuredPost = filteredPosts[0]
  const heroPost = featuredPost ?? posts[0]
  const remainingPosts = featuredPost
    ? filteredPosts.filter((post) => post.id !== featuredPost.id)
    : []
  const totalReadTime = posts.reduce((total, post) => total + readingTime(post), 0)
  const averageRead = posts.length ? Math.max(1, Math.round(totalReadTime / posts.length)) : 0

  const heroMetrics = [
    { label: 'Published reads', value: `${posts.length}`, icon: BookOpenText },
    { label: 'Topics', value: `${Math.max(0, topics.length - 1)}`, icon: Filter },
    { label: 'Avg read', value: averageRead ? `${averageRead} min` : 'New', icon: Clock3 },
  ]
  const consoleStack = [
    { label: 'Topic depth', value: `${Math.max(0, topics.length - 1)} lanes`, width: '64%' },
    { label: 'Reading queue', value: `${posts.length} notes`, width: '78%' },
    { label: 'Avg scan', value: averageRead ? `${averageRead} min` : 'new', width: '46%' },
    { label: 'Signal type', value: 'production', width: '58%' },
  ]

  return (
    <main className="blog-premium-content min-h-screen w-full max-w-[100vw] overflow-hidden text-white">
      <BlogPremiumFX />

      <section className="blog-hero-premium relative isolate w-full max-w-[100vw] overflow-hidden px-4 pb-14 pt-6 text-white sm:px-6 md:px-10 lg:px-12">
        <video
          className="blog-hero-video absolute inset-0 h-full w-full object-cover"
          src="/printer2.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
        <div className="blog-hero-depth" aria-hidden="true" />
        <div className="blog-hero-grid" aria-hidden="true" />
        <div className="blog-hero-beam" aria-hidden="true" />
        <div className="blog-hero-frame" aria-hidden="true" />

        <motion.div
          variants={pageVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 mx-auto flex min-h-[86svh] w-full max-w-[1220px] min-w-0 flex-col justify-start pb-8 pt-8 md:pt-10 lg:pt-12"
        >
          <motion.div variants={itemVariants} className="mb-5 flex items-center gap-2 text-sm font-medium text-white/[0.64]">
            <Link href="/" className="transition hover:text-white">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white">Blog</span>
          </motion.div>

          <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
            <div className="min-w-0">
              <motion.div
                variants={itemVariants}
                className="blog-hero-kicker inline-flex w-fit items-center gap-2 rounded-lg border border-white/[0.14] bg-white/10 px-4 py-2 text-xs font-black uppercase text-white shadow-[0_16px_48px_rgba(0,0,0,0.24)] backdrop-blur"
              >
                <Sparkles className="h-4 w-4 text-amber-200" />
                Flux3D Journal
              </motion.div>

              <motion.h1
                variants={itemVariants}
                className="blog-hero-title mt-5 max-w-[calc(100vw-2rem)] break-words text-4xl font-black leading-[1.04] text-white sm:text-6xl sm:leading-[0.96] lg:max-w-5xl lg:text-8xl lg:leading-[0.9]"
              >
                Practical 3D printing intelligence for better parts.
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="mt-6 max-w-[calc(100vw-2rem)] text-base leading-8 text-white/[0.72] sm:text-lg lg:max-w-2xl"
              >
                Material notes, print strategy, design decisions, and manufacturing guidance from the Flux3D team.
              </motion.p>

              <motion.div variants={itemVariants} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/materials"
                  className="blog-primary-action group inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-black text-[#05060a] shadow-[0_18px_54px_rgba(255,255,255,0.16)] transition hover:bg-[#ecfeff]"
                >
                  Explore materials
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/instant-quote"
                  className="blog-secondary-action inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/[0.18] bg-white/10 px-6 text-sm font-black text-white backdrop-blur transition hover:border-cyan-300/40 hover:bg-cyan-300/[0.12]"
                >
                  Start a quote
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </motion.div>

              <motion.div variants={itemVariants} className="blog-hero-stats mt-8 grid gap-3 sm:grid-cols-3">
                {heroMetrics.map((stat) => {
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

              <motion.div variants={itemVariants} className="blog-intel-ticker mt-6" aria-hidden="true">
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
              transition={reduceMotion ? undefined : { duration: 7.2, repeat: Infinity, ease: 'easeInOut' }}
              className="blog-signal-panel grid min-w-0 gap-3"
            >
              <div className="blog-signal-topline">
                <span>Editorial console</span>
                <strong>live</strong>
              </div>

              {heroPost ? (
                <Link href={`/blog/${heroPost.slug}`} className="blog-console-feature group grid min-w-0 gap-3">
                  <div className="blog-console-feature-media relative aspect-[16/9] overflow-hidden rounded-lg border border-white/10">
                    <ArticleImage post={heroPost} priority />
                  </div>
                  <div className="min-w-0">
                    <MetaRow post={heroPost} compact />
                    <h2 className="mt-3 line-clamp-2 text-xl font-black leading-tight text-white">
                      {postTitle(heroPost)}
                    </h2>
                    <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-white/[0.62]">
                      {heroPost.excerpt || 'A practical Flux3D guide for cleaner, more predictable 3D printing outcomes.'}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-cyan-200">
                      Read latest
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              ) : (
                <div className="rounded-lg border border-white/10 bg-white/[0.065] p-5">
                  <p className="text-xl font-black text-white">Journal is warming up.</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white/[0.62]">
                    Check back soon for Flux3D production notes.
                  </p>
                </div>
              )}

              <div className="grid gap-2">
                {editorialStats.map((stat) => {
                  const Icon = stat.icon
                  return (
                    <div key={stat.label} className="blog-signal-row">
                      <Icon className="h-4 w-4" />
                      <span>{stat.label}</span>
                      <strong>{stat.value}</strong>
                    </div>
                  )
                })}
              </div>

              <div className="blog-console-stack">
                {consoleStack.map((entry, index) => (
                  <motion.div
                    key={entry.label}
                    animate={reduceMotion ? undefined : { x: [0, index % 2 === 0 ? 2 : -2, 0] }}
                    transition={reduceMotion ? undefined : { duration: 5.4 + index * 0.3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span>{entry.label}</span>
                      <strong>{entry.value}</strong>
                    </div>
                    <i style={{ width: entry.width }} />
                  </motion.div>
                ))}
              </div>
            </motion.aside>
          </div>
        </motion.div>
      </section>

      <section className="blog-premium-section relative overflow-hidden px-4 py-20 sm:px-6 md:px-10 lg:px-12">
        <div className="blog-section-grid" aria-hidden="true" />
        <div className="relative z-10 mx-auto w-full max-w-[1220px]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div className="min-w-0">
              {featuredPost ? (
                <motion.article
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={reduceMotion ? undefined : { y: -6 }}
                  className="blog-featured-article group min-w-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.07]"
                >
                  <Link href={`/blog/${featuredPost.slug}`} className="grid h-full min-w-0 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
                    <div className="relative min-h-[300px] lg:min-h-[470px]">
                      <ArticleImage post={featuredPost} priority />
                    </div>

                    <div className="flex min-h-full min-w-0 flex-col justify-between p-6 md:p-8 lg:p-10">
                      <div>
                        <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-cyan-200/20 bg-cyan-200/[0.10] px-3 py-1 text-xs font-black uppercase text-cyan-200">
                          <BookMarked className="h-3.5 w-3.5" />
                          Featured article
                        </div>
                        <MetaRow post={featuredPost} />
                        <h2 className="mt-5 break-words text-2xl font-black leading-tight text-white sm:text-3xl md:text-4xl">
                          {postTitle(featuredPost)}
                        </h2>
                        <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-white/[0.66]">
                          {featuredPost.excerpt || 'A practical Flux3D guide for cleaner, more predictable 3D printing outcomes.'}
                        </p>
                      </div>

                      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
                        <div className="flex items-center gap-3">
                          {featuredPost.author_avatar ? (
                            <div className="relative h-11 w-11 overflow-hidden rounded-lg border border-white/10 bg-white/10">
                              <Image src={featuredPost.author_avatar} alt={featuredPost.author_name || 'Flux3D author'} fill sizes="44px" className="object-cover" />
                            </div>
                          ) : (
                            <div className="grid h-11 w-11 place-items-center rounded-lg bg-white text-sm font-black text-[#05060a]">
                              {authorInitial(featuredPost)}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-black text-white">{featuredPost.author_name || 'Flux3D Team'}</p>
                            <p className="text-xs font-bold text-white/[0.52]">Flux3D editorial</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-2 text-sm font-black text-cyan-200">
                          Read article
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.article>
              ) : (
                <div className="blog-empty-panel rounded-lg border border-white/10 bg-white/[0.07] p-10 text-center">
                  <p className="text-2xl font-black text-white">No blog posts yet.</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white/[0.62]">Check back soon for Flux3D guides and production notes.</p>
                </div>
              )}
            </div>

            <aside className="blog-filter-panel rounded-lg border border-white/10 bg-white/[0.07] p-5 backdrop-blur lg:sticky lg:top-28">
              <div className="flex items-center gap-2 text-sm font-black uppercase text-cyan-200">
                <Search className="h-4 w-4" />
                Find articles
              </div>
              <label className="blog-search-field mt-4 flex min-h-[46px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.07] px-4 text-sm font-bold text-white/[0.68] focus-within:border-cyan-200/40 focus-within:bg-cyan-200/[0.08]">
                <Search className="h-4 w-4 shrink-0" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search topics"
                  className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/[0.42]"
                />
              </label>

              <div className="mt-5 flex flex-wrap gap-2">
                {topics.map((topic) => {
                  const active = activeTopic === topic
                  return (
                    <button
                      key={topic}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setActiveTopic(topic)}
                      className={`blog-topic-chip min-h-[36px] rounded-lg px-3 text-xs font-black transition ${
                        active
                          ? 'is-active bg-white text-[#05060a] shadow-[0_12px_28px_rgba(255,255,255,0.10)]'
                          : 'border border-white/10 bg-white/[0.07] text-white/[0.68] hover:border-cyan-200/40 hover:text-white'
                      }`}
                    >
                      {topic}
                    </button>
                  )
                })}
              </div>

              <div className="mt-6 grid gap-3">
                {topicHighlights.map((highlight) => {
                  const Icon = highlight.icon
                  return (
                    <div key={highlight.label} className="blog-highlight-row flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.055] p-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-cyan-200/[0.10] text-cyan-200">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-white">{highlight.label}</p>
                        <p className="text-xs font-bold leading-5 text-white/[0.56]">{highlight.value}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="blog-premium-section relative overflow-hidden px-4 pb-24 pt-20 sm:px-6 md:px-10 lg:px-12">
        <div className="blog-section-grid" aria-hidden="true" />
        <div className="relative z-10 mx-auto w-full max-w-[1220px]">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-black uppercase text-cyan-200">
                <Wand2 className="h-4 w-4" />
                Latest notes
              </div>
              <h2 className="mt-2 break-words text-3xl font-black tracking-[0] text-white md:text-5xl">
                Manufacturing reads
              </h2>
            </div>
            <p className="text-sm font-bold text-white/[0.58]">
              Page {page} of {totalPages}
            </p>
          </div>

          <motion.div layout className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {remainingPosts.map((post, index) => (
                <motion.article
                  key={post.id}
                  layout
                  variants={itemVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-60px' }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
                  transition={{ duration: 0.35, delay: index * 0.03 }}
                  whileHover={reduceMotion ? undefined : { y: -6 }}
                  className="blog-article-card group min-w-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.07] transition"
                >
                  <Link href={`/blog/${post.slug}`} className="flex h-full min-w-0 flex-col">
                    <div className="relative aspect-[16/10]">
                      <ArticleImage post={post} />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col p-5">
                      <MetaRow post={post} compact />
                      <h3 className="mt-4 break-words text-xl font-black leading-snug tracking-[0] text-white transition-colors group-hover:text-cyan-100">
                        {postTitle(post)}
                      </h3>
                      <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-white/[0.62]">
                        {post.excerpt || 'A practical Flux3D guide for cleaner, more predictable 3D printing outcomes.'}
                      </p>
                      <div className="mt-auto flex items-center justify-between gap-3 pt-6">
                        <span className="inline-flex min-w-0 items-center gap-2 text-xs font-bold text-white/[0.58]">
                          <UserRound className="h-3.5 w-3.5 shrink-0 text-cyan-200" />
                          <span className="truncate">{post.author_name || 'Flux3D Team'}</span>
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-black text-cyan-200">
                          Read
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>

          {filteredPosts.length === 0 && posts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="blog-empty-panel rounded-lg border border-white/10 bg-white/[0.07] p-10 text-center"
            >
              <p className="text-2xl font-black text-white">No matching articles.</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/[0.62]">Try a different topic or clear the search field.</p>
              <button
                type="button"
                onClick={() => {
                  setActiveTopic(ALL_TOPICS)
                  setQuery('')
                }}
                className="blog-primary-action mt-5 min-h-[42px] rounded-lg bg-white px-5 text-sm font-black text-[#05060a]"
              >
                Reset filters
              </button>
            </motion.div>
          )}

          {totalPages > 1 && (
            <nav className="mt-12 flex flex-wrap items-center justify-center gap-2" aria-label="Blog pagination">
              {page > 1 && (
                <Link
                  href={page - 1 === 1 ? '/blog' : `/blog?page=${page - 1}`}
                  className="blog-page-link rounded-lg border border-white/10 bg-white/[0.07] px-4 py-2 text-sm font-black text-white transition hover:border-cyan-200/40 hover:text-cyan-100"
                >
                  Previous
                </Link>
              )}
              {Array.from({ length: totalPages }).map((_, index) => {
                const pageNumber = index + 1
                return (
                  <Link
                    key={pageNumber}
                    href={pageNumber === 1 ? '/blog' : `/blog?page=${pageNumber}`}
                    className={`blog-page-link rounded-lg border px-4 py-2 text-sm font-black transition ${
                      pageNumber === page
                        ? 'border-white bg-white text-[#05060a]'
                        : 'border-white/10 bg-white/[0.07] text-white hover:border-cyan-200/40 hover:text-cyan-100'
                    }`}
                  >
                    {pageNumber}
                  </Link>
                )
              })}
              {page < totalPages && (
                <Link
                  href={`/blog?page=${page + 1}`}
                  className="blog-page-link rounded-lg border border-white/10 bg-white/[0.07] px-4 py-2 text-sm font-black text-white transition hover:border-cyan-200/40 hover:text-cyan-100"
                >
                  Next
                </Link>
              )}
            </nav>
          )}
        </div>
      </section>
    </main>
  )
}
