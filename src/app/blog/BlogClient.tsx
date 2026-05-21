'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Clock3,
  FileText,
  Layers3,
  PenTool,
  UserRound,
  Wand2,
} from 'lucide-react'
import type { BlogPost } from '@/lib/blog/types'

const FALLBACK_IMAGE = '/pot.webp'

const topicHighlights = [
  { label: 'Materials', value: 'Process-ready guides', icon: Layers3 },
  { label: 'Design', value: 'Cleaner files and fit', icon: PenTool },
  { label: 'Production', value: 'Print-ready workflows', icon: Wand2 },
  { label: 'Insights', value: 'Short technical reads', icon: FileText },
]

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

function postImage(post: BlogPost) {
  return post.featured_image || FALLBACK_IMAGE
}

function authorInitial(post: BlogPost) {
  return (post.author_name || 'Flux3D Team').charAt(0).toUpperCase()
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
  const featuredPost = posts[0]
  const remainingPosts = posts.slice(1)

  return (
    <div className="min-h-screen bg-[#F7F8FB] text-[#111827]">
      <main className="px-4 pb-20 pt-20 sm:px-6 md:px-10 lg:px-12">
        <div className="mx-auto max-w-[1180px]">
          <section className="border-b border-gray-200 pb-10">
            <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55 }}
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase text-[#5B3FD6] shadow-sm">
                  <BookOpenText className="h-3.5 w-3.5" />
                  Flux3D Journal
                </div>
                <h1 className="mt-5 max-w-3xl font-[var(--font-syne)] text-4xl font-bold leading-tight text-[#111827] sm:text-5xl lg:text-6xl">
                  Practical 3D printing intelligence for better parts.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-[#5F6673] md:text-lg">
                  Guides, material notes, process decisions, and manufacturing insight from the Flux3D team.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/materials"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#111827] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2A3343]"
                  >
                    Explore materials
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/instant-quote"
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#111827] transition hover:border-[#5B3FD6] hover:text-[#5B3FD6]"
                  >
                    Start a quote
                  </Link>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.1 }}
                className="grid grid-cols-2 gap-3"
              >
                {topicHighlights.map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-lg bg-[#F1EEFF] text-[#5B3FD6]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="text-sm font-semibold text-[#111827]">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-[#6B7280]">{item.value}</p>
                    </div>
                  )
                })}
              </motion.div>
            </div>
          </section>

          {featuredPost && (
            <section className="pt-10">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase text-[#5B3FD6]">Featured article</p>
                  <h2 className="mt-1 font-[var(--font-syne)] text-2xl font-bold text-[#111827] md:text-3xl">
                    Editor&apos;s pick
                  </h2>
                </div>
                <span className="text-sm text-[#6B7280]">{posts.length} published reads</span>
              </div>

              <motion.article
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.18 }}
                whileHover={{ y: -3 }}
                className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0_24px_70px_rgba(17,24,39,0.08)]"
              >
                <Link href={`/blog/${featuredPost.slug}`} className="grid h-full lg:grid-cols-[0.96fr_1.04fr]">
                  <div className="relative min-h-[290px] overflow-hidden bg-gray-100 lg:min-h-[440px]">
                    <Image
                      src={postImage(featuredPost)}
                      alt={featuredPost.featured_image_alt || featuredPost.title}
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 560px"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    {featuredPost.category && (
                      <div className="absolute left-4 top-4 rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-semibold text-[#111827] shadow-sm">
                        {featuredPost.category}
                      </div>
                    )}
                  </div>

                  <div className="flex min-h-full flex-col justify-between p-6 md:p-8 lg:p-10">
                    <div>
                      <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-[#6B7280]">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDate(featuredPost.published_at || featuredPost.created_at)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5" />
                          {readingTime(featuredPost)} min read
                        </span>
                      </div>
                      <h3 className="mt-5 font-[var(--font-syne)] text-3xl font-bold leading-tight text-[#111827] md:text-4xl">
                        {featuredPost.seo_title || featuredPost.title}
                      </h3>
                      {featuredPost.excerpt && (
                        <p className="mt-4 max-w-2xl text-base leading-7 text-[#5F6673]">
                          {featuredPost.excerpt}
                        </p>
                      )}
                    </div>

                    <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#111827] text-sm font-semibold text-white">
                          {authorInitial(featuredPost)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#111827]">{featuredPost.author_name || 'Flux3D Team'}</p>
                          <p className="text-xs text-[#6B7280]">Flux3D editorial</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#5B3FD6]">
                        Read article
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.article>
            </section>
          )}

          {remainingPosts.length > 0 && (
            <section className="pt-12">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase text-[#5B3FD6]">Latest articles</p>
                  <h2 className="mt-1 font-[var(--font-syne)] text-2xl font-bold text-[#111827] md:text-3xl">
                    New manufacturing notes
                  </h2>
                </div>
                <p className="text-sm text-[#6B7280]">Page {page} of {totalPages}</p>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.45, delay: 0.22 }}
                className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
              >
                {remainingPosts.map((post, index) => (
                  <motion.article
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.04 * index }}
                    whileHover={{ y: -3 }}
                    className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-[0_18px_48px_rgba(17,24,39,0.09)]"
                  >
                    <Link href={`/blog/${post.slug}`} className="flex h-full flex-col">
                      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                        <Image
                          src={postImage(post)}
                          alt={post.featured_image_alt || post.title}
                          fill
                          loading="lazy"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs font-medium text-[#6B7280]">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {formatDate(post.published_at || post.created_at)}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="h-3.5 w-3.5" />
                            {readingTime(post)} min
                          </span>
                        </div>
                        {post.category && (
                          <span className="mb-3 w-fit rounded-full bg-[#F1EEFF] px-3 py-1 text-xs font-semibold text-[#5B3FD6]">
                            {post.category}
                          </span>
                        )}
                        <h3 className="font-[var(--font-syne)] text-xl font-bold leading-snug text-[#111827] transition-colors group-hover:text-[#5B3FD6]">
                          {post.seo_title || post.title}
                        </h3>
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#5F6673]">
                          {post.excerpt || 'A practical Flux3D guide for cleaner, more predictable 3D printing outcomes.'}
                        </p>
                        <div className="mt-auto flex items-center justify-between gap-3 pt-6">
                          <span className="inline-flex min-w-0 items-center gap-2 text-xs font-medium text-[#6B7280]">
                            <UserRound className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{post.author_name || 'Flux3D Team'}</span>
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[#5B3FD6]">
                            Read
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.article>
                ))}
              </motion.div>
            </section>
          )}

          {posts.length === 0 && (
            <div className="mt-10 rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
              <p className="font-[var(--font-syne)] text-2xl font-bold text-[#111827]">No blog posts yet.</p>
              <p className="mt-2 text-sm leading-6 text-[#6B7280]">Check back soon for Flux3D guides and production notes.</p>
            </div>
          )}

          {totalPages > 1 && (
            <nav className="mt-12 flex flex-wrap items-center justify-center gap-2" aria-label="Blog pagination">
              {page > 1 && (
                <Link
                  href={page - 1 === 1 ? '/blog' : `/blog?page=${page - 1}`}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-[#111827] transition hover:border-[#5B3FD6] hover:text-[#5B3FD6]"
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
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                      pageNumber === page
                        ? 'border-[#111827] bg-[#111827] text-white'
                        : 'border-gray-300 bg-white text-[#111827] hover:border-[#5B3FD6] hover:text-[#5B3FD6]'
                    }`}
                  >
                    {pageNumber}
                  </Link>
                )
              })}
              {page < totalPages && (
                <Link
                  href={`/blog?page=${page + 1}`}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-[#111827] transition hover:border-[#5B3FD6] hover:text-[#5B3FD6]"
                >
                  Next
                </Link>
              )}
            </nav>
          )}
        </div>
      </main>
    </div>
  )
}
