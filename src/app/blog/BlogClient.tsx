'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, User, Tag, ArrowRight, Eye, X, ExternalLink } from 'lucide-react'
import type { BlogPost } from '@/lib/blog/types'

export default function BlogClient({ posts }: { posts: BlogPost[] }) {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)
  const [loadingContent, setLoadingContent] = useState(false)

  async function openPost(post: BlogPost) {
    setSelectedPost(post)
    if (!post.content) {
      setLoadingContent(true)
      try {
        const res = await fetch(`/api/blog/${post.slug}`)
        if (res.ok) {
          const full = await res.json()
          setSelectedPost(full)
        }
      } catch {
      } finally {
        setLoadingContent(false)
      }
    }
  }

  function renderContent(html: string) {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
  }

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
                onClick={() => openPost(post)}
                className="group relative overflow-hidden rounded-2xl border border-[rgba(124, 92, 255,0.5)] bg-[#FFFFFF] transition-colors hover:border-[#7C5CFF]/30 cursor-pointer"
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
                    <span className="inline-flex items-center gap-1 text-sm text-[#7C5CFF] group-hover:text-[#A78BFA] transition-colors">
                      Read more
                      <ArrowRight className="h-3 w-3" />
                    </span>
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

      {/* Blog Post Popup */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setSelectedPost(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
            >
              {/* Close button */}
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-gray-100 bg-white/80 backdrop-blur-md">
                <h2 className="font-[var(--font-syne)] text-lg font-bold text-[#0F1B3D] truncate pr-4">
                  {selectedPost.title}
                </h2>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/blog/${selectedPost.slug}`}
                    target="_blank"
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#6F7192] hover:text-[#0F1B3D] hover:border-gray-300 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open page
                  </Link>
                  <button
                    onClick={() => setSelectedPost(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 text-[#6F7192] hover:text-[#0F1B3D] transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {loadingContent ? (
                <div className="flex items-center justify-center py-20">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#7C5CFF] border-t-transparent" />
                </div>
              ) : (
                <div className="p-6 md:p-8">
                  {/* Featured image */}
                  {selectedPost.featured_image && (
                    <div className="mb-6 overflow-hidden rounded-xl">
                      <img
                        src={selectedPost.featured_image}
                        alt={selectedPost.title}
                        className="w-full h-auto max-h-[400px] object-cover"
                      />
                    </div>
                  )}

                  {/* Meta */}
                  <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-[#6F7192]">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {new Date(selectedPost.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User className="h-4 w-4" />
                      {selectedPost.author_name}
                    </span>
                    {selectedPost.category && (
                      <span className="flex items-center gap-1.5">
                        <Tag className="h-4 w-4" />
                        {selectedPost.category}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h1 className="font-[var(--font-syne)] text-2xl md:text-3xl font-extrabold text-[#0F1B3D] mb-6">
                    {selectedPost.title}
                  </h1>

                  {/* Content */}
                  {selectedPost.content && (
                    <div
                      className="blog-content text-[#4a4d66] leading-7"
                      dangerouslySetInnerHTML={{
                        __html: renderContent(selectedPost.content),
                      }}
                    />
                  )}
                  <style>{`
                    .blog-content h1, .blog-content h2, .blog-content h3, .blog-content h4 {
                      color: #0F1B3D;
                      font-weight: 700;
                      margin-top: 1.5em;
                      margin-bottom: 0.5em;
                    }
                    .blog-content h1 { font-size: 1.5rem; }
                    .blog-content h2 { font-size: 1.25rem; }
                    .blog-content h3 { font-size: 1.125rem; }
                    .blog-content p { margin-bottom: 1em; }
                    .blog-content a { color: #7C5CFF; text-decoration: underline; }
                    .blog-content a:hover { color: #5B3FD6; }
                    .blog-content strong { color: #0F1B3D; }
                    .blog-content ul, .blog-content ol { margin-bottom: 1em; padding-left: 1.5em; }
                    .blog-content li { margin-bottom: 0.25em; }
                    .blog-content img { border-radius: 0.75rem; max-width: 100%; height: auto; margin: 1.5em 0; }
                    .blog-content blockquote {
                      border-left: 3px solid #7C5CFF;
                      padding-left: 1em;
                      margin: 1em 0;
                      color: #6F7192;
                      font-style: italic;
                    }
                    .blog-content code {
                      color: #7C5CFF;
                      background: rgba(124,92,255,0.08);
                      padding: 0.15em 0.3em;
                      border-radius: 0.25em;
                      font-size: 0.875em;
                    }
                    .blog-content pre {
                      background: #f8f9fc;
                      border: 1px solid #e5e7eb;
                      border-radius: 0.75rem;
                      padding: 1em;
                      overflow-x: auto;
                      margin: 1em 0;
                    }
                    .blog-content pre code {
                      background: none;
                      padding: 0;
                      color: inherit;
                    }
                  `}</style>

                  {/* Tags */}
                  {selectedPost.tags && selectedPost.tags.length > 0 && (
                    <div className="mt-8 flex flex-wrap gap-2 pt-6 border-t border-gray-100">
                      {selectedPost.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[#7C5CFF]/10 px-3 py-1 text-xs font-medium text-[#7C5CFF]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
