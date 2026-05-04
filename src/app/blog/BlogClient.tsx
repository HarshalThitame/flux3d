'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Calendar, User, Tag, ArrowRight, Eye } from 'lucide-react'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  featured_image: string
  author_name: string
  category: string
  tags: string[]
  meta_keywords: string[]
  status: string
  read_time: number
  views: number
  created_at: string
}

export default function BlogClient({ posts }: { posts: BlogPost[] }) {
  return (
    <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
      <main className="px-6 pb-20 pt-32 md:px-12">
        <div className="mx-auto max-w-[1200px]">
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4 text-sm font-medium uppercase tracking-[3px] text-[#FF5C1A]"
          >
            Blog
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-[var(--font-syne)] text-[clamp(2.4rem,5vw,4.6rem)] font-extrabold leading-[1.02] tracking-[-2px] text-white"
          >
            Latest Insights & <span className="text-[#7a82a0]">Updates</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 max-w-[700px] text-base leading-8 text-[#7a82a0]"
          >
            Discover tips, tutorials, and insights about 3D printing, design, and technology.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3"
          >
            {posts.map((post, index) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                whileHover={{ y: -5 }}
                className="group relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0d1120] transition-colors hover:border-[#FF5C1A]/30"
              >
                 <div className="relative h-[200px] overflow-hidden">
                     <img
                       src={post.featured_image || '/images/blog-placeholder.jpg'}
                       alt={post.title}
                       className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                     />
                     <div className="absolute inset-0 bg-gradient-to-t from-[#0d1120] to-transparent" />
                   </div>
                <div className="p-6">
                  <div className="mb-3 flex items-center gap-4 text-xs text-[#7a82a0]">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(post.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {post.views || 0} views
                    </span>
                  </div>
                  <h2 className="mb-3 font-[var(--font-syne)] text-xl font-bold text-white group-hover:text-[#FF5C1A] transition-colors">
                    {post.title}
                  </h2>
                  <p className="mb-4 text-sm leading-6 text-[#7a82a0] line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF5C1A]/10 text-xs font-semibold text-[#FF5C1A]">
                        {post.author_name?.charAt(0) || 'F'}
                      </div>
                      <span className="text-xs text-[#7a82a0]">{post.author_name}</span>
                    </div>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="inline-flex items-center gap-1 text-sm text-[#FF5C1A] hover:text-[#FF9A72] transition-colors"
                    >
                      Read more
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>

          {posts.length === 0 && (
            <div className="mt-12 rounded-2xl border border-white/10 bg-[#0a0f1e] p-12 text-center">
              <p className="text-[#7a82a0]">No blog posts yet. Check back soon!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
