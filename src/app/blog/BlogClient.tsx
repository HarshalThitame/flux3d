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
    <div className="min-h-screen bg-[#FFFFFF] text-[#0F1B3D]">
      <main className="px-6 pb-20 pt-32 md:px-12">
        <div className="mx-auto max-w-[1200px]">
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4 text-sm font-medium uppercase tracking-[3px] text-[#7C5CFF]"
          >
            Blog
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-[var(--font-syne)] text-[clamp(2.4rem,5vw,4.6rem)] font-extrabold leading-[1.02] tracking-[-2px] text-[#0F1B3D]"
          >
            Latest Insights & <span className="text-[#6F7192]">Updates</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 max-w-[700px] text-base leading-8 text-[#6F7192]"
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
                className="group relative overflow-hidden rounded-2xl border border-[rgba(124, 92, 255,0.5)] bg-[#FFFFFF] transition-colors hover:border-[#7C5CFF]/30"
              >
                 <div className="relative h-[200px] overflow-hidden">
                     <img
                       src={post.featured_image || '/images/blog-placeholder.jpg'}
                       alt={post.title}
                       className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                     />
                     <div className="absolute inset-0 bg-gradient-to-t from-[#FFFFFF] to-transparent" />
                   </div>
                <div className="p-6">
                  <div className="mb-3 flex items-center gap-4 text-xs text-[#6F7192]">
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
                  <h2 className="mb-3 font-[var(--font-syne)] text-xl font-bold text-[#0F1B3D] group-hover:text-[#7C5CFF] transition-colors">
                    {post.title}
                  </h2>
                  <p className="mb-4 text-sm leading-6 text-[#6F7192] line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7C5CFF]/10 text-xs font-semibold text-[#7C5CFF]">
                        {post.author_name?.charAt(0) || 'F'}
                      </div>
                      <span className="text-xs text-[#6F7192]">{post.author_name}</span>
                    </div>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="inline-flex items-center gap-1 text-sm text-[#7C5CFF] hover:text-[#A78BFA] transition-colors"
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
            <div className="mt-12 rounded-2xl border border-[#7C5CFF]/10 bg-[#FFFFFF] p-12 text-center">
              <p className="text-[#6F7192]">No blog posts yet. Check back soon!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
