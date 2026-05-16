'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  FileText,
  Globe2,
  ImageIcon,
  Link2,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Plus,
  Save,
  Search,
  Send,
  Settings,
  Share2,
  Sparkles,
  Tag,
  Trash2,
  XCircle,
} from 'lucide-react'
import type { BlogAuthor, BlogPost } from '@/lib/blog/types'
import {
  BLOG_SCHEMA_TYPES,
  analyzeBlogSeo,
  publicBlogUrl,
  slugifyTitle,
  splitCsv,
  stripHtml,
  type BlogSchemaData,
  type BlogSchemaType,
  type FaqItem,
  type HowToStep,
  type SeoCheck,
} from '@/lib/blog/seo'
import RichTextEditor from '@/components/RichTextEditor'

type FormTab = 'content' | 'media' | 'seo' | 'settings'
type SocialPreview = 'linkedin' | 'whatsapp'
type AiAction =
  | 'generate-seo-title'
  | 'generate-meta-description'
  | 'suggest-focus-keyword'
  | 'generate-faq'
  | 'improve-readability'
  | 'generate-social-caption'
  | 'suggest-internal-links'

type SavePostFn = (
  statusOverride?: 'draft' | 'published',
  options?: { autosave?: boolean; keepOpen?: boolean }
) => Promise<BlogPost | null>

type LinkSuggestion = {
  title: string
  slug: string
  url: string
  reason: string
}

type BlogFormData = {
  title: string
  slug: string
  excerpt: string
  content: string
  featured_image: string
  featured_image_alt: string
  og_image_url: string
  category: string
  tags: string
  meta_keywords: string
  status: 'draft' | 'published'
  seo_title: string
  meta_description: string
  focus_keyword: string
  secondary_keywords: string
  canonical_url: string
  og_title: string
  og_description: string
  twitter_card_type: 'summary' | 'summary_large_image'
  schema_type: BlogSchemaType
  schema_data: BlogSchemaData
  author_id: string
  author_name: string
  published_at: string
  toc_enabled: boolean
  language: 'en' | 'hi' | 'mr'
}

const emptySchemaData: BlogSchemaData = {
  faqs: [],
  steps: [],
}

function createEmptyForm(): BlogFormData {
  return {
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featured_image: '',
    featured_image_alt: '',
    og_image_url: '',
    category: '',
    tags: '',
    meta_keywords: '',
    status: 'draft',
    seo_title: '',
    meta_description: '',
    focus_keyword: '',
    secondary_keywords: '',
    canonical_url: '',
    og_title: '',
    og_description: '',
    twitter_card_type: 'summary_large_image',
    schema_type: 'Article',
    schema_data: emptySchemaData,
    author_id: '',
    author_name: 'Flux3D Team',
    published_at: new Date().toISOString(),
    toc_enabled: true,
    language: 'en',
  }
}

function toDatetimeLocal(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

function fromDatetimeLocal(value: string) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function statusIcon(status: SeoCheck['status']) {
  if (status === 'pass') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
  if (status === 'warn') return <AlertTriangle className="h-4 w-4 text-amber-500" />
  return <XCircle className="h-4 w-4 text-rose-500" />
}

function scoreClasses(color: 'red' | 'orange' | 'green') {
  if (color === 'green') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (color === 'orange') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-rose-200 bg-rose-50 text-rose-700'
}

function fieldWarning(length: number, min: number, max: number) {
  if (length === 0) return 'text-[#6F7192]'
  if (length < min || length > max) return 'text-amber-600'
  return 'text-emerald-600'
}

function formFromPost(post: BlogPost): BlogFormData {
  return {
    title: post.title || '',
    slug: post.slug || '',
    excerpt: post.excerpt || '',
    content: post.content || '',
    featured_image: post.featured_image || '',
    featured_image_alt: post.featured_image_alt || post.title || '',
    og_image_url: post.og_image_url || '',
    category: post.category || '',
    tags: post.tags?.join(', ') || '',
    meta_keywords: post.meta_keywords?.join(', ') || '',
    status: post.status === 'published' ? 'published' : 'draft',
    seo_title: post.seo_title || post.title || '',
    meta_description: post.meta_description || post.excerpt || '',
    focus_keyword: post.focus_keyword || '',
    secondary_keywords: post.secondary_keywords?.join(', ') || '',
    canonical_url: post.canonical_url || publicBlogUrl(post.slug || ''),
    og_title: post.og_title || post.seo_title || post.title || '',
    og_description: post.og_description || post.meta_description || post.excerpt || '',
    twitter_card_type: post.twitter_card_type || 'summary_large_image',
    schema_type: post.schema_type || 'Article',
    schema_data: post.schema_data || emptySchemaData,
    author_id: post.author_id || '',
    author_name: post.author_name || post.author?.name || 'Flux3D Team',
    published_at: post.published_at || post.created_at || new Date().toISOString(),
    toc_enabled: post.toc_enabled ?? true,
    language: post.language || 'en',
  }
}

function CheckList({ title, checks }: { title: string; checks: SeoCheck[] }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-[#0F1B3D]">{title}</h4>
      <div className="space-y-2">
        {checks.map((check) => (
          <div key={check.id} className="flex gap-2 rounded-lg border border-gray-100 bg-white p-2">
            <div className="mt-0.5">{statusIcon(check.status)}</div>
            <div>
              <p className="text-xs font-medium text-[#0F1B3D]">{check.label}</p>
              <p className="mt-0.5 text-[11px] text-[#6F7192]">{check.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [authors, setAuthors] = useState<BlogAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [uploading, setUploading] = useState<'featured' | 'og' | null>(null)
  const [activeTab, setActiveTab] = useState<FormTab>('content')
  const [socialPreview, setSocialPreview] = useState<SocialPreview>('linkedin')
  const [seoPanelOpen, setSeoPanelOpen] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [lastAutosaveAt, setLastAutosaveAt] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState<AiAction | null>(null)
  const [aiTitleOptions, setAiTitleOptions] = useState<string[]>([])
  const [aiInternalLinks, setAiInternalLinks] = useState<LinkSuggestion[]>([])
  const [formData, setFormData] = useState<BlogFormData>(() => createEmptyForm())
  const savePostRef = useRef<SavePostFn | null>(null)
  const [autoDirty, setAutoDirty] = useState({
    slug: false,
    seoTitle: false,
    canonical: false,
    ogTitle: false,
    ogDescription: false,
  })

  const seoAnalysis = useMemo(
    () =>
      analyzeBlogSeo({
        title: formData.title,
        seoTitle: formData.seo_title,
        metaDescription: formData.meta_description,
        slug: formData.slug,
        focusKeyword: formData.focus_keyword,
        content: formData.content,
        featuredImage: formData.featured_image,
        featuredImageAlt: formData.featured_image_alt,
        ogImageUrl: formData.og_image_url,
        schemaType: formData.schema_type,
        canonicalUrl: formData.canonical_url,
      }),
    [formData]
  )

  const slugDuplicate = useMemo(
    () => posts.some((post) => post.slug === formData.slug && post.id !== editingPost?.id),
    [posts, formData.slug, editingPost?.id]
  )

  const localInternalLinks = useMemo<LinkSuggestion[]>(() => {
    const text = `${stripHtml(formData.content)} ${formData.title} ${formData.focus_keyword}`.toLowerCase()
    if (!text.trim()) return []

    return posts
      .filter((post) => post.status === 'published' && post.id !== editingPost?.id)
      .map((post) => {
        const terms = [
          post.title,
          post.focus_keyword || '',
          post.category || '',
          ...(post.tags || []),
        ]
          .flatMap((term) => term.toLowerCase().split(/[\s,-]+/))
          .filter((term) => term.length > 3)

        const score = terms.reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0)
        return {
          score,
          title: post.title,
          slug: post.slug,
          url: `/blog/${post.slug}`,
          reason: post.focus_keyword || post.category || 'Related published post',
        }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ title, slug, url, reason }) => ({ title, slug, url, reason }))
  }, [posts, formData.content, formData.title, formData.focus_keyword, editingPost?.id])

  const combinedLinkSuggestions = useMemo(() => {
    const seen = new Set<string>()
    return [...aiInternalLinks, ...localInternalLinks].filter((link) => {
      if (seen.has(link.slug)) return false
      seen.add(link.slug)
      return true
    }).slice(0, 5)
  }, [aiInternalLinks, localInternalLinks])

  useEffect(() => {
    fetchPosts()
    fetchAuthors()
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  savePostRef.current = savePost

  useEffect(() => {
    if (!showForm || !dirty || !formData.title.trim() || !formData.content.trim()) return
    const timer = setTimeout(() => {
      void savePostRef.current?.('draft', { autosave: true, keepOpen: true })
    }, 60000)

    return () => clearTimeout(timer)
  }, [showForm, dirty, formData])

  async function fetchPosts() {
    setLoading(true)
    try {
      const res = await fetch('/api/blog?status=all&limit=100')
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts || data)
      }
    } catch {
      // The empty state handles this.
    } finally {
      setLoading(false)
    }
  }

  async function fetchAuthors() {
    try {
      const res = await fetch('/api/admin/blog/authors')
      if (res.ok) {
        const data = await res.json()
        setAuthors(data.authors || [])
      }
    } catch {
      setAuthors([])
    }
  }

  function updateForm(patch: Partial<BlogFormData>) {
    setFormData((prev) => ({ ...prev, ...patch }))
    setDirty(true)
  }

  function handleTitleChange(title: string) {
    setFormData((prev) => {
      const slug = autoDirty.slug ? prev.slug : slugifyTitle(title)
      const seoTitle = autoDirty.seoTitle ? prev.seo_title : title
      return {
        ...prev,
        title,
        slug,
        seo_title: seoTitle,
        canonical_url: autoDirty.canonical ? prev.canonical_url : publicBlogUrl(slug),
        og_title: autoDirty.ogTitle ? prev.og_title : seoTitle,
      }
    })
    setDirty(true)
  }

  function handleMetaDescriptionChange(metaDescription: string) {
    setFormData((prev) => ({
      ...prev,
      meta_description: metaDescription,
      og_description: autoDirty.ogDescription ? prev.og_description : metaDescription,
    }))
    setDirty(true)
  }

  function handleSlugChange(slug: string) {
    const clean = slugifyTitle(slug)
    setAutoDirty((prev) => ({ ...prev, slug: true }))
    setFormData((prev) => ({
      ...prev,
      slug: clean,
      canonical_url: autoDirty.canonical ? prev.canonical_url : publicBlogUrl(clean),
    }))
    setDirty(true)
  }

  function resetForm() {
    setFormData(createEmptyForm())
    setEditingPost(null)
    setDirty(false)
    setLastAutosaveAt(null)
    setAiTitleOptions([])
    setAiInternalLinks([])
    setActiveTab('content')
    setAutoDirty({
      slug: false,
      seoTitle: false,
      canonical: false,
      ogTitle: false,
      ogDescription: false,
    })
  }

  function handleEdit(post: BlogPost) {
    setEditingPost(post)
    setFormData(formFromPost(post))
    setShowForm(true)
    setDirty(false)
    setLastAutosaveAt(null)
    setAiTitleOptions([])
    setAiInternalLinks([])
    setActiveTab('content')
    setAutoDirty({
      slug: Boolean(post.slug),
      seoTitle: Boolean(post.seo_title),
      canonical: Boolean(post.canonical_url),
      ogTitle: Boolean(post.og_title),
      ogDescription: Boolean(post.og_description),
    })
  }

  function buildPayload(statusOverride?: 'draft' | 'published') {
    const status = statusOverride || formData.status
    return {
      ...formData,
      status,
      tags: splitCsv(formData.tags),
      meta_keywords: splitCsv(formData.meta_keywords),
      secondary_keywords: splitCsv(formData.secondary_keywords),
      published_at: fromDatetimeLocal(toDatetimeLocal(formData.published_at)) || formData.published_at,
      schema_data: formData.schema_data,
      seo_score: seoAnalysis.score,
    }
  }

  async function savePost(
    statusOverride?: 'draft' | 'published',
    options: { autosave?: boolean; keepOpen?: boolean } = {}
  ): Promise<BlogPost | null> {
    if (!formData.title.trim() || !formData.content.trim()) {
      if (!options.autosave) {
        setToast({ type: 'error', message: 'Title and content are required.' })
      }
      return null
    }

    if (!formData.slug.trim() || slugDuplicate) {
      setToast({
        type: 'error',
        message: slugDuplicate ? 'Slug already exists. Choose a unique URL.' : 'Slug is required.',
      })
      return null
    }

    setSaving(true)
    try {
      const payload = buildPayload(statusOverride)
      const res = await fetch(editingPost ? `/api/blog/${editingPost.slug}` : '/api/blog', {
        method: editingPost ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()

      if (!res.ok) {
        setToast({ type: 'error', message: result.error || 'Failed to save post.' })
        return null
      }

      setEditingPost(result)
      setFormData(formFromPost(result))
      setDirty(false)

      if (options.autosave) {
        setLastAutosaveAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      } else {
        setToast({ type: 'success', message: statusOverride === 'published' ? 'Post published.' : 'Post saved.' })
      }

      if (!options.keepOpen) {
        setShowForm(false)
        resetForm()
      }

      await fetchPosts()
      return result
    } catch {
      setToast({ type: 'error', message: 'Failed to save post.' })
      return null
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(slug: string) {
    try {
      const res = await fetch(`/api/blog/${slug}`, { method: 'DELETE' })
      if (res.ok) {
        setToast({ type: 'success', message: 'Post deleted.' })
        setDeleteConfirm(null)
        fetchPosts()
      } else {
        setToast({ type: 'error', message: 'Failed to delete post.' })
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to delete post.' })
    }
  }

  async function handleImageUpload(e: ChangeEvent<HTMLInputElement>, target: 'featured' | 'og') {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(target)
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
        updateForm(target === 'featured' ? { featured_image: data.url } : { og_image_url: data.url })
        setToast({ type: 'success', message: 'Image uploaded.' })
      } else {
        const result = await res.json()
        setToast({ type: 'error', message: result.error || 'Failed to upload image.' })
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to upload image.' })
    } finally {
      setUploading(null)
      e.target.value = ''
    }
  }

  async function runAi(action: AiAction) {
    setAiLoading(action)
    try {
      const res = await fetch('/api/admin/blog/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          title: formData.title,
          excerpt: formData.excerpt,
          content: formData.content,
          focusKeyword: formData.focus_keyword,
        }),
      })
      const result = await res.json()

      if (!res.ok) {
        setToast({ type: 'error', message: result.error || 'AI action failed.' })
        return
      }

      if (action === 'generate-seo-title') {
        setAiTitleOptions(result.titles || [])
      }
      if (action === 'generate-meta-description' && result.metaDescription) {
        handleMetaDescriptionChange(result.metaDescription)
      }
      if (action === 'suggest-focus-keyword') {
        updateForm({
          focus_keyword: result.focusKeyword || formData.focus_keyword,
          secondary_keywords: Array.isArray(result.secondaryKeywords)
            ? result.secondaryKeywords.join(', ')
            : formData.secondary_keywords,
        })
      }
      if (action === 'generate-faq') {
        updateForm({
          schema_type: 'FAQ',
          schema_data: {
            ...formData.schema_data,
            faqs: Array.isArray(result.faqs) ? result.faqs : [],
          },
        })
        setActiveTab('settings')
      }
      if (action === 'improve-readability' && result.content) {
        updateForm({ content: result.content })
      }
      if (action === 'generate-social-caption') {
        updateForm({
          schema_data: {
            ...formData.schema_data,
            socialCaption: {
              linkedin: result.linkedinCaption || '',
              whatsapp: result.whatsappCaption || '',
            },
          },
        })
      }
      if (action === 'suggest-internal-links') {
        setAiInternalLinks(result.links || [])
      }
    } catch {
      setToast({ type: 'error', message: 'AI action failed.' })
    } finally {
      setAiLoading(null)
    }
  }

  function insertInternalLink(link: LinkSuggestion) {
    updateForm({
      content: `${formData.content || ''}<p>Related: <a href="${link.url}">${link.title}</a></p>`,
    })
  }

  async function openPreview() {
    const saved = await savePost('draft', { keepOpen: true })
    if (saved?.slug) {
      window.open(`/blog/${saved.slug}?preview=1`, '_blank', 'noopener,noreferrer')
    }
  }

  function updateFaq(index: number, patch: Partial<FaqItem>) {
    const faqs = [...(formData.schema_data.faqs || [])]
    faqs[index] = { ...(faqs[index] || { question: '', answer: '' }), ...patch }
    updateForm({ schema_data: { ...formData.schema_data, faqs } })
  }

  function updateStep(index: number, patch: Partial<HowToStep>) {
    const steps = [...(formData.schema_data.steps || [])]
    steps[index] = { ...(steps[index] || { name: '', text: '' }), ...patch }
    updateForm({ schema_data: { ...formData.schema_data, steps } })
  }

  const tabs: Array<{ id: FormTab; label: string; icon: ReactNode }> = [
    { id: 'content', label: 'Content', icon: <FileText className="h-4 w-4" /> },
    { id: 'media', label: 'Media', icon: <Camera className="h-4 w-4" /> },
    { id: 'seo', label: 'SEO', icon: <Search className="h-4 w-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-white text-[#0F1B3D]">
      <div className="px-4 py-8 md:px-8">
        <div className="mx-auto max-w-[1500px]">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <Link
              href="/admin"
              className="mb-4 inline-flex items-center gap-2 text-sm text-[#6F7192] hover:text-[#0F1B3D]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="font-[var(--font-syne)] text-3xl font-bold text-[#0F1B3D]">
                  <Eye className="mr-2 inline h-8 w-8 text-[#7C5CFF]" />
                  Blog Management
                </h1>
                <p className="mt-2 text-sm text-[#6F7192]">Create SEO-ready blog posts for Flux3D.</p>
              </div>
              <button
                onClick={() => {
                  resetForm()
                  setShowForm(true)
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-[#7C5CFF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6948f0]"
              >
                <Plus className="h-4 w-4" />
                New Post
              </button>
            </div>
          </motion.div>

          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-3 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.98, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="flex h-[92vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#0F1B3D]">
                      {editingPost ? 'Edit Blog Post' : 'New Blog Post'}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#6F7192]">
                      <span>{seoAnalysis.wordCount} words</span>
                      <span>{seoAnalysis.readingTimeMinutes} min read</span>
                      <span className={`rounded-full border px-2 py-0.5 ${scoreClasses(seoAnalysis.color)}`}>
                        SEO Score: {seoAnalysis.score}/100 - {seoAnalysis.label}
                      </span>
                      {lastAutosaveAt && <span>Autosaved {lastAutosaveAt}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={openPreview}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-[#0F1B3D] hover:bg-gray-50"
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeoPanelOpen((value) => !value)}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-[#0F1B3D] hover:bg-gray-50"
                    >
                      {seoPanelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                      SEO Panel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false)
                        resetForm()
                      }}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-[#0F1B3D] hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                <div className="flex border-b border-gray-200 px-5">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                        activeTab === tab.id
                          ? 'border-[#7C5CFF] text-[#7C5CFF]'
                          : 'border-transparent text-[#6F7192] hover:text-[#0F1B3D]'
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    void savePost(formData.status)
                  }}
                  className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]"
                >
                  <div className="min-h-0 overflow-y-auto p-5">
                    {activeTab === 'content' && (
                      <div className="space-y-5">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[#0F1B3D]">Post Title</label>
                          <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(event) => handleTitleChange(event.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#7C5CFF]"
                          />
                        </div>

                        <div>
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <label className="block text-sm font-medium text-[#0F1B3D]">Slug / URL</label>
                            <span className={slugDuplicate ? 'text-xs text-rose-600' : 'text-xs text-[#6F7192]'}>
                              {publicBlogUrl(formData.slug)}
                            </span>
                          </div>
                          <input
                            type="text"
                            value={formData.slug}
                            onChange={(event) => handleSlugChange(event.target.value)}
                            placeholder="best-3d-printing-pune-rapid-prototyping"
                            className={`w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#7C5CFF] ${
                              slugDuplicate ? 'border-rose-300' : 'border-gray-200'
                            }`}
                          />
                          <p className="mt-1 text-xs text-[#6F7192]">Lowercase letters, numbers, and hyphens only.</p>
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium text-[#0F1B3D]">Excerpt</label>
                          <textarea
                            value={formData.excerpt}
                            onChange={(event) => updateForm({ excerpt: event.target.value })}
                            rows={3}
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#7C5CFF]"
                          />
                        </div>

                        <div>
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <label className="block text-sm font-medium text-[#0F1B3D]">Content</label>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => runAi('improve-readability')}
                                disabled={aiLoading === 'improve-readability'}
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#0F1B3D] hover:bg-gray-50 disabled:opacity-60"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                Improve Readability
                              </button>
                              <button
                                type="button"
                                onClick={() => runAi('suggest-internal-links')}
                                disabled={aiLoading === 'suggest-internal-links'}
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#0F1B3D] hover:bg-gray-50 disabled:opacity-60"
                              >
                                <Link2 className="h-3.5 w-3.5" />
                                Suggest Internal Links
                              </button>
                            </div>
                          </div>
                          <RichTextEditor
                            content={formData.content}
                            onChange={(content) => updateForm({ content })}
                            placeholder="Write your blog content..."
                          />
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <h3 className="mb-3 text-sm font-semibold text-[#0F1B3D]">Suggested Internal Links</h3>
                          {combinedLinkSuggestions.length ? (
                            <div className="space-y-2">
                              {combinedLinkSuggestions.map((link) => (
                                <div key={link.slug} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-3">
                                  <div>
                                    <p className="text-sm font-medium text-[#0F1B3D]">{link.title}</p>
                                    <p className="text-xs text-[#6F7192]">{link.reason}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => insertInternalLink(link)}
                                    className="rounded-lg bg-[#7C5CFF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#6948f0]"
                                  >
                                    Insert link
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-[#6F7192]">No matching published posts yet.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === 'media' && (
                      <div className="grid gap-5 xl:grid-cols-2">
                        <div className="rounded-lg border border-gray-200 p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <ImageIcon className="h-4 w-4 text-[#7C5CFF]" />
                            <h3 className="text-sm font-semibold text-[#0F1B3D]">Featured Image</h3>
                          </div>
                          <input
                            type="url"
                            value={formData.featured_image}
                            onChange={(event) => updateForm({ featured_image: event.target.value })}
                            placeholder="Image URL"
                            className="mb-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#7C5CFF]"
                          />
                          <input
                            type="text"
                            required={Boolean(formData.featured_image)}
                            value={formData.featured_image_alt}
                            onChange={(event) => updateForm({ featured_image_alt: event.target.value })}
                            placeholder="Alt text for image SEO"
                            className="mb-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#7C5CFF]"
                          />
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-[#0F1B3D] hover:bg-gray-50">
                            {uploading === 'featured' ? 'Uploading...' : 'Upload Featured Image'}
                            <input type="file" accept="image/*" onChange={(event) => handleImageUpload(event, 'featured')} className="hidden" />
                          </label>
                          {formData.featured_image && (
                            <img src={formData.featured_image} alt={formData.featured_image_alt || 'Featured preview'} className="mt-4 h-48 w-full rounded-lg object-cover" />
                          )}
                        </div>

                        <div className="rounded-lg border border-gray-200 p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <Share2 className="h-4 w-4 text-[#7C5CFF]" />
                            <h3 className="text-sm font-semibold text-[#0F1B3D]">Open Graph Image</h3>
                          </div>
                          <input
                            type="url"
                            value={formData.og_image_url}
                            onChange={(event) => updateForm({ og_image_url: event.target.value })}
                            placeholder="1200x630px social image URL"
                            className="mb-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#7C5CFF]"
                          />
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-[#0F1B3D] hover:bg-gray-50">
                            {uploading === 'og' ? 'Uploading...' : 'Upload OG Image'}
                            <input type="file" accept="image/*" onChange={(event) => handleImageUpload(event, 'og')} className="hidden" />
                          </label>
                          {formData.og_image_url && (
                            <img src={formData.og_image_url} alt="Open Graph preview" className="mt-4 aspect-[1200/630] w-full rounded-lg object-cover" />
                          )}
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-amber-50 p-4 xl:col-span-2">
                          <p className="text-sm font-medium text-amber-800">
                            {seoAnalysis.missingAltCount > 0
                              ? `${seoAnalysis.missingAltCount} images missing alt text. Alt text is required for image SEO.`
                              : 'Image alt text check passed.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {activeTab === 'seo' && (
                      <div className="space-y-5">
                        <div className="grid gap-5 xl:grid-cols-2">
                          <div>
                            <div className="mb-1 flex items-center justify-between">
                              <label className="block text-sm font-medium text-[#0F1B3D]">SEO Title</label>
                              <span className={`text-xs ${fieldWarning(formData.seo_title.length, 50, 60)}`}>
                                {formData.seo_title.length}/60
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={formData.seo_title}
                                onChange={(event) => {
                                  setAutoDirty((prev) => ({ ...prev, seoTitle: true }))
                                  updateForm({ seo_title: event.target.value })
                                }}
                                placeholder="Best 3D Printing Service in Pune | Flux3D"
                                className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#7C5CFF]"
                              />
                              <button
                                type="button"
                                onClick={() => runAi('generate-seo-title')}
                                disabled={aiLoading === 'generate-seo-title'}
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-[#0F1B3D] hover:bg-gray-50 disabled:opacity-60"
                              >
                                <Sparkles className="h-4 w-4" />
                                Generate
                              </button>
                            </div>
                            {formData.seo_title.length > 60 && (
                              <p className="mt-1 text-xs text-amber-600">Google may truncate titles above 60 characters.</p>
                            )}
                            {aiTitleOptions.length > 0 && (
                              <div className="mt-2 space-y-2">
                                {aiTitleOptions.map((title) => (
                                  <button
                                    key={title}
                                    type="button"
                                    onClick={() => {
                                      setAutoDirty((prev) => ({ ...prev, seoTitle: true }))
                                      updateForm({ seo_title: title, og_title: autoDirty.ogTitle ? formData.og_title : title })
                                    }}
                                    className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs text-[#0F1B3D] hover:border-[#7C5CFF]"
                                  >
                                    {title}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium text-[#0F1B3D]">Focus Keyword</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={formData.focus_keyword}
                                onChange={(event) => updateForm({ focus_keyword: event.target.value })}
                                placeholder="3D printing Pune"
                                className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#7C5CFF]"
                              />
                              <button
                                type="button"
                                onClick={() => runAi('suggest-focus-keyword')}
                                disabled={aiLoading === 'suggest-focus-keyword'}
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-[#0F1B3D] hover:bg-gray-50 disabled:opacity-60"
                              >
                                <Sparkles className="h-4 w-4" />
                                Suggest
                              </button>
                            </div>
                            <p className="mt-1 text-xs text-[#6F7192]">
                              Density: {seoAnalysis.keywordDensity}% ({seoAnalysis.keywordOccurrences} uses)
                            </p>
                          </div>
                        </div>

                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <label className="block text-sm font-medium text-[#0F1B3D]">Meta Description</label>
                            <span className={`text-xs ${fieldWarning(formData.meta_description.length, 120, 160)}`}>
                              {formData.meta_description.length}/160
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <textarea
                              value={formData.meta_description}
                              onChange={(event) => handleMetaDescriptionChange(event.target.value)}
                              rows={3}
                              placeholder="Looking for fast 3D printing in Pune? Flux3D delivers precision prototypes in 24hrs. Serving Hinjewadi, Chakan & beyond."
                              className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#7C5CFF]"
                            />
                            <button
                              type="button"
                              onClick={() => runAi('generate-meta-description')}
                              disabled={aiLoading === 'generate-meta-description'}
                              className="inline-flex h-fit items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-[#0F1B3D] hover:bg-gray-50 disabled:opacity-60"
                            >
                              <Sparkles className="h-4 w-4" />
                              Generate
                            </button>
                          </div>
                          {(formData.meta_description.length > 0 && (formData.meta_description.length < 120 || formData.meta_description.length > 160)) && (
                            <p className="mt-1 text-xs text-amber-600">Target 120 to 160 characters for better SERP display.</p>
                          )}
                        </div>

                        <div className="grid gap-5 xl:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-sm font-medium text-[#0F1B3D]">Secondary Keywords</label>
                            <input
                              type="text"
                              value={formData.secondary_keywords}
                              onChange={(event) => updateForm({ secondary_keywords: event.target.value })}
                              placeholder="rapid prototyping Pune, 3D printing service India, SLA printing Pune, Bambu Lab prints"
                              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#7C5CFF]"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-[#0F1B3D]">Meta Keywords</label>
                            <input
                              type="text"
                              value={formData.meta_keywords}
                              onChange={(event) => updateForm({ meta_keywords: event.target.value })}
                              placeholder="3D printing India, Flux3D blog, rapid prototyping tips"
                              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#7C5CFF]"
                            />
                          </div>
                        </div>

                        <div className="grid gap-5 xl:grid-cols-2">
                          <div className="rounded-lg border border-gray-200 p-4">
                            <div className="mb-3 flex items-center gap-2">
                              <Search className="h-4 w-4 text-[#7C5CFF]" />
                              <h3 className="text-sm font-semibold text-[#0F1B3D]">Google Search Preview</h3>
                            </div>
                            <p className="text-xs text-[#188038]">flux3d.in &gt; blog &gt; {formData.slug || 'slug'}</p>
                            <p className="mt-1 text-xl text-[#1a0dab]">{formData.seo_title || formData.title || 'SEO Title'}</p>
                            <p className="mt-1 text-sm leading-5 text-[#4d5156]">
                              {formData.meta_description || 'Meta description preview appears here.'}
                            </p>
                          </div>

                          <div className="rounded-lg border border-gray-200 p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <Share2 className="h-4 w-4 text-[#7C5CFF]" />
                                <h3 className="text-sm font-semibold text-[#0F1B3D]">Social Preview</h3>
                              </div>
                              <div className="flex rounded-lg border border-gray-200 p-1">
                                {(['linkedin', 'whatsapp'] as SocialPreview[]).map((item) => (
                                  <button
                                    key={item}
                                    type="button"
                                    onClick={() => setSocialPreview(item)}
                                    className={`rounded-md px-2 py-1 text-xs font-medium capitalize ${
                                      socialPreview === item ? 'bg-[#7C5CFF] text-white' : 'text-[#6F7192]'
                                    }`}
                                  >
                                    {item}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                              <div className="aspect-[1200/630] bg-gray-200">
                                {formData.og_image_url || formData.featured_image ? (
                                  <img src={formData.og_image_url || formData.featured_image} alt="Social preview" className="h-full w-full object-cover" />
                                ) : null}
                              </div>
                              <div className="p-3">
                                <p className="text-xs uppercase text-[#6F7192]">flux3d.in</p>
                                <p className="mt-1 text-sm font-semibold text-[#0F1B3D]">{formData.og_title || formData.seo_title || formData.title || 'OG Title'}</p>
                                <p className="mt-1 line-clamp-2 text-xs text-[#6F7192]">{formData.og_description || formData.meta_description || 'OG description preview.'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'settings' && (
                      <div className="space-y-5">
                        <div className="grid gap-5 xl:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-sm font-medium text-[#0F1B3D]">Author</label>
                            <select
                              value={formData.author_id}
                              onChange={(event) => {
                                const author = authors.find((item) => item.id === event.target.value)
                                updateForm({
                                  author_id: author?.id || '',
                                  author_name: author?.name || 'Flux3D Team',
                                })
                              }}
                              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#7C5CFF]"
                            >
                              <option value="">Flux3D Team</option>
                              {authors.filter((author) => author.id).map((author) => (
                                <option key={author.id} value={author.id}>{author.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-[#0F1B3D]">Category</label>
                            <input
                              type="text"
                              value={formData.category}
                              onChange={(event) => updateForm({ category: event.target.value })}
                              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#7C5CFF]"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-[#0F1B3D]">Status</label>
                            <select
                              value={formData.status}
                              onChange={(event) => updateForm({ status: event.target.value as 'draft' | 'published' })}
                              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#7C5CFF]"
                            >
                              <option value="draft">Draft</option>
                              <option value="published">Published</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid gap-5 xl:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-sm font-medium text-[#0F1B3D]">Tags</label>
                            <input
                              type="text"
                              value={formData.tags}
                              onChange={(event) => updateForm({ tags: event.target.value })}
                              placeholder="3D Printing, Tips, Tutorial"
                              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#7C5CFF]"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-[#0F1B3D]">Published Date</label>
                            <input
                              type="datetime-local"
                              value={toDatetimeLocal(formData.published_at)}
                              onChange={(event) => updateForm({ published_at: fromDatetimeLocal(event.target.value) })}
                              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#7C5CFF]"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-[#0F1B3D]">Content Language</label>
                            <select
                              value={formData.language}
                              onChange={(event) => updateForm({ language: event.target.value as 'en' | 'hi' | 'mr' })}
                              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#7C5CFF]"
                            >
                              <option value="en">English</option>
                              <option value="hi">Hindi</option>
                              <option value="mr">Marathi</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <label className="block text-sm font-medium text-[#0F1B3D]">Canonical URL</label>
                            <span className="text-xs text-[#6F7192]" title="Use this if this article was originally published elsewhere to avoid duplicate content penalty">
                              Duplicate content control
                            </span>
                          </div>
                          <input
                            type="url"
                            value={formData.canonical_url}
                            onChange={(event) => {
                              setAutoDirty((prev) => ({ ...prev, canonical: true }))
                              updateForm({ canonical_url: event.target.value })
                            }}
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#7C5CFF]"
                          />
                        </div>

                        <div className="grid gap-5 xl:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-sm font-medium text-[#0F1B3D]">OG Title</label>
                            <input
                              type="text"
                              value={formData.og_title}
                              onChange={(event) => {
                                setAutoDirty((prev) => ({ ...prev, ogTitle: true }))
                                updateForm({ og_title: event.target.value })
                              }}
                              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#7C5CFF]"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-[#0F1B3D]">OG Description</label>
                            <input
                              type="text"
                              value={formData.og_description}
                              onChange={(event) => {
                                setAutoDirty((prev) => ({ ...prev, ogDescription: true }))
                                updateForm({ og_description: event.target.value })
                              }}
                              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#7C5CFF]"
                            />
                          </div>
                        </div>

                        <div className="grid gap-5 xl:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-sm font-medium text-[#0F1B3D]">Twitter Card</label>
                            <select
                              value={formData.twitter_card_type}
                              onChange={(event) => updateForm({ twitter_card_type: event.target.value as 'summary' | 'summary_large_image' })}
                              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#7C5CFF]"
                            >
                              <option value="summary_large_image">summary_large_image</option>
                              <option value="summary">summary</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-[#0F1B3D]">Schema Type</label>
                            <select
                              value={formData.schema_type}
                              onChange={(event) => updateForm({ schema_type: event.target.value as BlogSchemaType })}
                              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#7C5CFF]"
                            >
                              {BLOG_SCHEMA_TYPES.map((type) => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                          </div>
                          <label className="flex items-center gap-2 self-end rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-[#0F1B3D]">
                            <input
                              type="checkbox"
                              checked={formData.toc_enabled}
                              onChange={(event) => updateForm({ toc_enabled: event.target.checked })}
                            />
                            Auto-generate TOC
                          </label>
                        </div>

                        {formData.schema_type === 'FAQ' && (
                          <div className="rounded-lg border border-gray-200 p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-[#0F1B3D]">FAQ Schema</h3>
                              <button
                                type="button"
                                onClick={() => runAi('generate-faq')}
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#0F1B3D] hover:bg-gray-50"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                Generate FAQ
                              </button>
                            </div>
                            <div className="space-y-3">
                              {(formData.schema_data.faqs || []).map((faq, index) => (
                                <div key={index} className="grid gap-2 rounded-lg bg-gray-50 p-3">
                                  <input
                                    type="text"
                                    value={faq.question}
                                    onChange={(event) => updateFaq(index, { question: event.target.value })}
                                    placeholder="Question"
                                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7C5CFF]"
                                  />
                                  <textarea
                                    value={faq.answer}
                                    onChange={(event) => updateFaq(index, { answer: event.target.value })}
                                    placeholder="Answer"
                                    rows={2}
                                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7C5CFF]"
                                  />
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => updateForm({ schema_data: { ...formData.schema_data, faqs: [...(formData.schema_data.faqs || []), { question: '', answer: '' }] } })}
                              className="mt-3 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#0F1B3D] hover:bg-gray-50"
                            >
                              Add Q&A
                            </button>
                          </div>
                        )}

                        {formData.schema_type === 'HowTo' && (
                          <div className="rounded-lg border border-gray-200 p-4">
                            <h3 className="mb-3 text-sm font-semibold text-[#0F1B3D]">HowTo Steps</h3>
                            <div className="space-y-3">
                              {(formData.schema_data.steps || []).map((step, index) => (
                                <div key={index} className="grid gap-2 rounded-lg bg-gray-50 p-3">
                                  <input
                                    type="text"
                                    value={step.name}
                                    onChange={(event) => updateStep(index, { name: event.target.value })}
                                    placeholder="Step title"
                                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7C5CFF]"
                                  />
                                  <textarea
                                    value={step.text}
                                    onChange={(event) => updateStep(index, { text: event.target.value })}
                                    placeholder="Step instructions"
                                    rows={2}
                                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7C5CFF]"
                                  />
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => updateForm({ schema_data: { ...formData.schema_data, steps: [...(formData.schema_data.steps || []), { name: '', text: '' }] } })}
                              className="mt-3 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#0F1B3D] hover:bg-gray-50"
                            >
                              Add Step
                            </button>
                          </div>
                        )}

                        {formData.schema_data.socialCaption && (
                          <div className="rounded-lg border border-gray-200 p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-[#0F1B3D]">Social Caption</h3>
                              <button
                                type="button"
                                onClick={() => runAi('generate-social-caption')}
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#0F1B3D] hover:bg-gray-50"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                Regenerate
                              </button>
                            </div>
                            <div className="grid gap-3 xl:grid-cols-2">
                              <textarea readOnly value={formData.schema_data.socialCaption.linkedin || ''} rows={5} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs" />
                              <textarea readOnly value={formData.schema_data.socialCaption.whatsapp || ''} rows={5} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs" />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {seoPanelOpen && (
                    <aside className="min-h-0 overflow-y-auto border-l border-gray-200 bg-gray-50 p-4">
                      <div className={`mb-4 rounded-lg border p-4 ${scoreClasses(seoAnalysis.color)}`}>
                        <p className="text-sm font-semibold">SEO Score: {seoAnalysis.score}/100 - {seoAnalysis.label}</p>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
                          <div className="h-full rounded-full bg-current" style={{ width: `${seoAnalysis.score}%` }} />
                        </div>
                      </div>

                      <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg border border-gray-200 bg-white p-3">
                          <Clock className="mb-1 h-4 w-4 text-[#7C5CFF]" />
                          {seoAnalysis.readingTimeMinutes} min read
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-3">
                          <BookOpen className="mb-1 h-4 w-4 text-[#7C5CFF]" />
                          {seoAnalysis.wordCount} words
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-3">
                          <Tag className="mb-1 h-4 w-4 text-[#7C5CFF]" />
                          {seoAnalysis.keywordDensity}% density
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-3">
                          <Globe2 className="mb-1 h-4 w-4 text-[#7C5CFF]" />
                          {formData.language.toUpperCase()}
                        </div>
                      </div>

                      <div className="space-y-5">
                        <CheckList title="Focus Keyword Checks" checks={seoAnalysis.checks.focus} />
                        <CheckList title="Content Quality Checks" checks={seoAnalysis.checks.content} />
                        <CheckList title="Meta / Technical Checks" checks={seoAnalysis.checks.technical} />
                      </div>

                      <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        Have you linked to at least 1 authoritative external source?
                      </div>
                    </aside>
                  )}

                  <div className="col-span-full flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white px-5 py-4">
                    <div className="text-xs text-[#6F7192]">
                      Last modified updates on every save. Sitemap and schema update when published.
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => runAi('generate-social-caption')}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-[#0F1B3D] hover:bg-gray-50"
                      >
                        <Sparkles className="h-4 w-4" />
                        Social Caption
                      </button>
                      <button
                        type="button"
                        onClick={() => savePost('draft')}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-[#0F1B3D] hover:bg-gray-50 disabled:opacity-60"
                      >
                        <Save className="h-4 w-4" />
                        Save as Draft
                      </button>
                      <button
                        type="button"
                        onClick={() => savePost('published')}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#7C5CFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6948f0] disabled:opacity-60"
                      >
                        <Send className="h-4 w-4" />
                        Publish
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}

          {loading ? (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-[#6F7192]">
              Loading posts...
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
              <Eye className="mx-auto h-12 w-12 text-[#6F7192]" />
              <p className="mt-4 text-sm text-[#6F7192]">No blog posts yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-lg border border-gray-200 bg-white p-5 transition-colors hover:border-[#7C5CFF]/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      {post.featured_image && (
                        <img src={post.featured_image} alt={post.featured_image_alt || post.title} className="h-20 w-20 rounded-lg object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-[#0F1B3D]">{post.title}</h3>
                          {post.status === 'published' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                              <Eye className="h-3 w-3" />
                              Published
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-[#6F7192]">
                              <EyeOff className="h-3 w-3" />
                              Draft
                            </span>
                          )}
                          <span className={`rounded-full border px-2 py-0.5 text-xs ${scoreClasses((post.seo_score || 0) >= 75 ? 'green' : (post.seo_score || 0) >= 50 ? 'orange' : 'red')}`}>
                            SEO {post.seo_score || 0}/100
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-medium text-[#0F1B3D]">{post.seo_title || post.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-[#6F7192]">{post.excerpt}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-[#6F7192]">
                          {post.category && <span>{post.category}</span>}
                          <span>{post.reading_time_minutes || post.read_time || 1} min read</span>
                          <span>{post.views || 0} views</span>
                          <span>{new Date(post.published_at || post.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Link
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        className="rounded-lg border border-gray-200 p-2 text-[#6F7192] hover:bg-gray-50 hover:text-[#0F1B3D]"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleEdit(post)}
                        className="rounded-lg border border-gray-200 p-2 text-[#6F7192] hover:bg-gray-50 hover:text-[#0F1B3D]"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(post.slug)}
                        className="rounded-lg border border-rose-200 p-2 text-rose-500 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-md rounded-lg border border-rose-200 bg-white p-6 shadow-xl"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-rose-50">
                  <Trash2 className="h-6 w-6 text-rose-500" />
                </div>
                <h3 className="text-lg font-semibold text-[#0F1B3D]">Delete Post?</h3>
                <p className="mt-2 text-sm text-[#6F7192]">This action cannot be undone.</p>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-[#0F1B3D] hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    className="flex-1 rounded-lg bg-rose-500 py-2.5 text-sm font-semibold text-white hover:bg-rose-600"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`fixed right-4 top-4 z-50 flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
                toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}
            >
              {toast.type === 'success' ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {toast.message}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
