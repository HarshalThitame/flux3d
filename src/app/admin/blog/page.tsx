'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, Eye, EyeOff, ArrowLeft, AlertTriangle, Check } from 'lucide-react'
import type { BlogPost } from '@/lib/blog/types'
import RichTextEditor from '@/components/RichTextEditor'

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    featured_image: '',
    category: '',
    tags: '',
    meta_keywords: '',
    status: 'draft' as 'draft' | 'published',
  })

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    setLoading(true)
    try {
      const res = await fetch('/api/blog?status=all')
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts || data)
      }
    } catch {
      // Error fetching
    } finally {
      setLoading(false)
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formDataObj = new FormData()
      formDataObj.append('file', file)
      formDataObj.append('bucket', 'blog')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formDataObj,
      })

      if (res.ok) {
        const data = await res.json()
        setFormData({ ...formData, featured_image: data.url })
        setToast({ type: 'success', message: 'Image uploaded successfully!' })
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to upload image' })
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const payload = {
      ...formData,
      tags: formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      meta_keywords: formData.meta_keywords.split(',').map((kw) => kw.trim()).filter(Boolean),
    }

    try {
      if (editingPost) {
        const res = await fetch(`/api/blog/${editingPost.slug}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          setToast({ type: 'success', message: 'Post updated successfully!' })
          setShowForm(false)
          setEditingPost(null)
          resetForm()
          fetchPosts()
        } else {
          const result = await res.json()
          setToast({ type: 'error', message: result.error || 'Failed to update post' })
        }
      } else {
        const res = await fetch('/api/blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          setToast({ type: 'success', message: 'Post created successfully!' })
          setShowForm(false)
          resetForm()
          fetchPosts()
        } else {
          const result = await res.json()
          setToast({ type: 'error', message: result.error || 'Failed to create post' })
        }
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to save post' })
    }
  }

  async function handleDelete(slug: string) {
    try {
      const res = await fetch(`/api/blog/${slug}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setToast({ type: 'success', message: 'Post deleted successfully!' })
        setDeleteConfirm(null)
        fetchPosts()
      } else {
        setToast({ type: 'error', message: 'Failed to delete post' })
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to delete post' })
    }
  }

  function handleEdit(post: BlogPost) {
    setEditingPost(post)
    setFormData({
      title: post.title,
      excerpt: post.excerpt || '',
      content: post.content,
      featured_image: post.featured_image || '',
      category: post.category || '',
      tags: post.tags?.join(', ') || '',
      meta_keywords: post.meta_keywords?.join(', ') || '',
      status: post.status as 'draft' | 'published',
    })
    setShowForm(true)
  }

  function resetForm() {
    setFormData({
      title: '',
      excerpt: '',
      content: '',
      featured_image: '',
      category: '',
      tags: '',
      meta_keywords: '',
      status: 'draft',
    })
  }

  return (
    <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
      <div className="px-4 py-8 md:px-8">
        <div className="mx-auto max-w-[1500px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-sm text-[#7a82a0] hover:text-white mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-[var(--font-syne)] text-3xl font-bold text-white">
                  <Eye className="inline h-8 w-8 text-[#FF5C1A] mr-2" />
                  Blog Management
                </h1>
                <p className="mt-2 text-sm text-[#7a82a0]">
                  Create and manage blog posts
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingPost(null)
                  resetForm()
                  setShowForm(true)
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#FF5C1A] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                New Post
              </button>
            </div>
          </motion.div>

          {/* Form Modal */}
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="mx-4 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1120] p-6"
              >
                <h2 className="mb-4 text-xl font-bold text-white">
                  {editingPost ? 'Edit Post' : 'New Blog Post'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm text-[#7a82a0]">Title</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm text-[#7a82a0]">Excerpt</label>
                    <textarea
                      value={formData.excerpt}
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                      rows={2}
                      className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm text-[#7a82a0]">Content</label>
                    <RichTextEditor
                      content={formData.content}
                      onChange={(content) => setFormData({ ...formData, content })}
                      placeholder="Write your blog content... (supports bold, italic, colors, highlights)"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm text-[#7a82a0]">Featured Image</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.featured_image}
                        onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                        placeholder="Image URL"
                        className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                      />
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-[#7a82a0] hover:text-white">
                        {uploading ? 'Uploading...' : 'Upload'}
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                    </div>
                    {formData.featured_image && (
                      <img src={formData.featured_image} alt="Preview" className="mt-2 h-32 rounded-lg object-cover" />
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm text-[#7a82a0]">Category</label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-[#7a82a0]">Tags (comma-separated)</label>
                      <input
                        type="text"
                        value={formData.tags}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                        placeholder="3D Printing, Tips, Tutorial"
                        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-[#7a82a0]">Meta Keywords (comma-separated, for SEO)</label>
                      <input
                        type="text"
                        value={formData.meta_keywords}
                        onChange={(e) => setFormData({ ...formData, meta_keywords: e.target.value })}
                        placeholder="3D printing India, Flux3D blog, rapid prototyping tips"
                        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm text-[#7a82a0]">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' })}
                      className="w-full rounded-lg border border-white/10 bg-[#0d1120] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 rounded-xl bg-[#FF5C1A] py-2.5 text-sm font-semibold text-white hover:opacity-90"
                    >
                      {editingPost ? 'Update' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false)
                        setEditingPost(null)
                        resetForm()
                      }}
                      className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-sm font-medium text-white hover:bg-white/[0.07]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}

          {/* Posts List */}
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-[#0a0f1e] p-8 text-center text-sm text-[#7a82a0]">
              Loading posts...
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#0a0f1e] p-8 text-center">
              <Eye className="mx-auto h-12 w-12 text-[#7a82a0]" />
              <p className="mt-4 text-sm text-[#7a82a0]">No blog posts yet. Create your first post!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl border border-white/10 bg-[#0a0f1e] p-5 hover:border-[#FF5C1A]/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {post.featured_image && (
                        <img
                          src={post.featured_image}
                          alt={post.title}
                          className="h-20 w-20 rounded-xl object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-white">{post.title}</h3>
                          {post.status === 'published' ? (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                              <Eye className="h-3 w-3" />
                              Published
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 rounded-full bg-[#7a82a0]/10 px-2 py-0.5 text-xs text-[#7a82a0]">
                              <EyeOff className="h-3 w-3" />
                              Draft
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-[#7a82a0] line-clamp-2">{post.excerpt}</p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-[#7a82a0]">
                          <span>{post.category}</span>
                          <span>{post.views || 0} views</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        className="rounded-lg border border-[#7dd3fc]/20 bg-[#7dd3fc]/10 p-2 text-[#7dd3fc] hover:bg-[#7dd3fc]/20"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleEdit(post)}
                        className="rounded-lg border border-[#7dd3fc]/20 bg-[#7dd3fc]/10 p-2 text-[#7dd3fc] hover:bg-[#7dd3fc]/20"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(post.slug)}
                        className="rounded-lg border border-rose-400/20 bg-rose-400/10 p-2 text-rose-400 hover:bg-rose-400/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="mx-4 w-full max-w-md rounded-2xl border border-rose-400/20 bg-[#0d1120] p-6"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-400/10">
                  <Trash2 className="h-6 w-6 text-rose-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Delete Post?</h3>
                <p className="mt-2 text-sm text-[#7a82a0]">
                  This action cannot be undone. This will permanently delete the blog post.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-sm font-medium text-white hover:bg-white/[0.07]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-semibold text-white hover:bg-rose-600"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Toast Message */}
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
                toast.type === 'success' 
                  ? 'bg-emerald-500/90 text-white' 
                  : 'bg-rose-500/90 text-white'
              }`}
            >
              {toast.type === 'success' ? (
                <Check className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {toast.message}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
