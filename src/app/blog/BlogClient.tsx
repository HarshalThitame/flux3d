'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, Calendar, Clock, Eye, Tag, User } from 'lucide-react'
import type { BlogPost } from '@/lib/blog/types'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function readingTime(post: BlogPost) {
  return post.reading_time_minutes || post.read_time || 1
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
    <div className="public-shell bg-[var(--bg-soft)]">
      <main className="px-6 pb-20 pt-8 md:px-12 md:pt-10">
        <div className="mx-auto max-w-[1200px]">
          <div className="hero-glow hero-glow-1" />
          <div className="hero-glow hero-glow-2" />
          <motion.p
            initial={{ opacity: 1, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="section-eyebrow"
          >
            {'// Blog'}
          </motion.p>
          <motion.h1
            initial={{ opacity: 1, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-[var(--font-syne)] text-[clamp(2.4rem,5vw,4.6rem)] font-extrabold leading-[1.02] text-[var(--text-primary)]"
          >
            3D Printing Insights <span className="gradient-text">from Flux3D</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 1, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 max-w-[700px] text-base leading-8 text-[var(--text-secondary)]"
          >
            Practical guides on 3D printing, rapid prototyping, materials, design, and manufacturing workflows.
          </motion.p>

          {featuredPost && (
            <motion.article
              initial={{ opacity: 1, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4, borderColor: 'rgba(109,40,217,0.25)' }}
              className="blog-featured group mt-12"
            >
              <Link href={`/blog/${featuredPost.slug}`} className="block">
                  <div className="blog-featured-image-wrap relative h-[520px] overflow-hidden bg-[var(--bg-muted)]">
                  <Image
                    src={featuredPost.featured_image || '/logo.png'}
                    alt={featuredPost.featured_image_alt || featuredPost.title}
                    fill
                    loading="lazy"
                    sizes="(max-width: 768px) 100vw, 1200px"
                    className="h-full w-full object-cover opacity-60 transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute bottom-0 left-0 right-0 z-10 p-6 md:p-10">
                    <div className="mb-5 flex flex-wrap items-center gap-3">
                      {featuredPost.category && <span className="category-tag">{featuredPost.category}</span>}
                      <span className="category-tag border-[rgba(6,182,212,0.35)] bg-[rgba(6,182,212,0.13)] text-[var(--accent-2)]">
                        {readingTime(featuredPost)} min read
                      </span>
                    </div>
                    <h2 className="max-w-[820px] font-[var(--font-syne)] text-[clamp(2rem,4vw,3.6rem)] font-extrabold leading-[1.05] text-[var(--text-primary)]">
                      {featuredPost.seo_title || featuredPost.title}
                    </h2>
                    {featuredPost.excerpt && (
                      <p className="mt-4 max-w-[680px] text-base leading-7 text-[var(--text-secondary)]">
                        {featuredPost.excerpt}
                      </p>
                    )}
                    <div className="card-meta mt-6">
                      <span>{formatDate(featuredPost.published_at || featuredPost.created_at)}</span>
                      <span>{featuredPost.author_name || 'Flux3D Team'}</span>
                      <span className="inline-flex items-center gap-1 text-[var(--accent-bright)]">
                        Read feature <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.article>
          )}

          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {remainingPosts.map((post, index) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 1, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08 * index }}
              whileHover={{ y: -4, borderColor: 'rgba(109,40,217,0.25)' }}
                className="blog-card group"
              >
                <Link href={`/blog/${post.slug}`} className="block h-full">
                  <div className="relative aspect-video overflow-hidden bg-[var(--bg-muted)]">
                    <Image
                      src={post.featured_image || '/logo.png'}
                      alt={post.featured_image_alt || post.title}
                      fill
                      loading="lazy"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="blog-card-image h-full w-full object-cover opacity-85"
                    />
                  </div>
                  <div className="p-6">
                    <div className="card-meta mb-4 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(post.published_at || post.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {readingTime(post)} min
                      </span>
                    </div>
                    {post.category && (
                      <span className="category-tag mb-4 inline-flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {post.category}
                      </span>
                    )}
                    <h2 className="mb-3 font-[var(--font-syne)] text-xl font-bold text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-bright)]">
                      {post.seo_title || post.title}
                    </h2>
                    <p className="mb-5 line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]/15 text-xs font-semibold text-[var(--accent-bright)]">
                          {post.author_name?.charAt(0) || 'F'}
                        </div>
                        <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                          <User className="h-3 w-3" />
                          {post.author_name || 'Flux3D Team'}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-sm text-[var(--accent-bright)]">
                        Read
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-1 font-[var(--font-mono)] text-xs text-[var(--text-muted)]">
                      <Eye className="h-3 w-3" />
                      {post.views || 0} views
                    </div>
                  </div>
                </Link>
              </motion.article>
            ))}
          </motion.div>

          {posts.length === 0 && (
            <div className="card mt-12 p-12 text-center">
              <p className="text-[var(--text-secondary)]">No blog posts yet. Check back soon.</p>
            </div>
          )}

          {totalPages > 1 && (
            <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Blog pagination">
              {page > 1 && (
                <Link
                  href={page - 1 === 1 ? '/blog' : `/blog?page=${page - 1}`}
                  className="btn-ghost px-4 py-2 text-sm"
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
                    className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                      pageNumber === page
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                        : 'border-[var(--border-bright)] text-[var(--text-primary)] hover:border-[var(--accent)]'
                    }`}
                  >
                    {pageNumber}
                  </Link>
                )
              })}
              {page < totalPages && (
                <Link
                  href={`/blog?page=${page + 1}`}
                  className="btn-ghost px-4 py-2 text-sm"
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
