'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CalendarDays, Clock3, Search, Tag } from 'lucide-react'
import type { BlogPost } from '@/lib/blog/types'

const FALLBACK_IMAGE = '/pot.webp'
const date = (value?: string | null) => {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'Recent'
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
const minutes = (post: BlogPost) => post.reading_time_minutes || post.read_time || 1
const image = (post: BlogPost) => post.featured_image || FALLBACK_IMAGE

function PostImage({ post, priority = false }: { post: BlogPost; priority?: boolean }) {
  return <div className="relative aspect-[16/10] overflow-hidden bg-[#ece8e2]"><Image src={image(post)} alt={post.featured_image_alt || post.title} fill priority={priority} sizes="(min-width: 1024px) 44vw, 100vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" /></div>
}

function PostMeta({ post }: { post: BlogPost }) {
  return <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#3f465f]"><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-[#5b21b6]" />{date(post.published_at || post.created_at)}</span><span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-[#5b21b6]" />{minutes(post)} min read</span></div>
}

export default function BlogLightClient({ posts }: { posts: BlogPost[]; page: number; totalPages: number }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const allCategories = useMemo(() => ['All', ...Array.from(new Set(posts.map((post) => post.category?.trim()).filter((value): value is string => Boolean(value))))], [posts])
  const filtered = useMemo(() => posts.filter((post) => {
    const text = [post.title, post.excerpt, post.category, post.focus_keyword, ...(post.tags || [])].filter(Boolean).join(' ').toLowerCase()
    return (category === 'All' || post.category === category) && (!query.trim() || text.includes(query.trim().toLowerCase()))
  }), [category, posts, query])
  const featured = filtered[0]
  const latest = featured ? filtered.slice(1) : []
  return <main className="min-h-screen bg-[#f9f7f4] pb-20 pt-24 text-[#070b1d] sm:pt-28">
    <section className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10"><div className="relative overflow-hidden rounded-[2rem] border border-[#e1dcd3] bg-[#f3f0eb] px-6 py-12 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:px-10 sm:py-16"><div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-violet-200/50 blur-3xl" aria-hidden="true" /><div className="relative max-w-3xl"><p className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#4c1d95]"><Tag className="h-3.5 w-3.5" />Flux3D Journal</p><h1 className="font-[var(--font-syne)] text-4xl font-extrabold tracking-[-0.045em] text-[#070b1d] sm:text-5xl lg:text-6xl">3D Printing Insights, Guides &amp; Ideas</h1><p className="mt-5 max-w-2xl text-base leading-7 text-[#30364c] sm:text-lg">Clear, practical guidance on materials, design, prototyping, and making stronger 3D-printed parts.</p></div></div></section>
    <section className="mx-auto max-w-7xl px-5 pt-10 sm:px-8 lg:px-10"><div className="flex flex-col gap-4 rounded-2xl border border-[#e1dcd3] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-[#f7f5f2] px-4 py-3"><Search className="h-5 w-5 shrink-0 text-[#5b21b6]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search articles, materials, or printing tips" className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#070b1d] outline-none placeholder:text-[#667085]" /></label><div className="flex max-w-full gap-2 overflow-x-auto pb-1 sm:max-w-[55%] sm:pb-0">{allCategories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition ${category === item ? 'bg-[#4c1d95] text-white' : 'border border-[#ded9d1] bg-white text-[#242b42] hover:border-violet-300'}`}>{item}</button>)}</div></div></section>
    {featured ? <><section className="mx-auto max-w-7xl px-5 pt-12 sm:px-8 lg:px-10"><p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-[#5b21b6]">Featured article</p><Link href={`/blog/${featured.slug}`} className="group grid overflow-hidden rounded-[1.5rem] border border-[#e1dcd3] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)] lg:grid-cols-2"><PostImage post={featured} priority /><div className="flex flex-col justify-center p-7 sm:p-10">{featured.category && <span className="mb-5 w-fit rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-[#4c1d95]">{featured.category}</span>}<h2 className="font-[var(--font-syne)] text-3xl font-bold tracking-[-0.035em] text-[#070b1d] sm:text-4xl">{featured.title}</h2>{featured.excerpt && <p className="mt-5 text-base leading-7 text-[#3f465f]">{featured.excerpt}</p>}<div className="mt-7"><PostMeta post={featured} /></div><span className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#4c1d95]">Read article <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></div></Link></section><section className="mx-auto max-w-7xl px-5 pt-14 sm:px-8 lg:px-10"><div className="mb-7 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5b21b6]">Latest articles</p><h2 className="mt-2 font-[var(--font-syne)] text-3xl font-bold tracking-[-0.03em] text-[#070b1d]">Practical reading for better parts</h2></div><span className="hidden text-sm font-semibold text-[#4d556b] sm:block">{filtered.length} articles</span></div><div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{latest.map((post) => <Link key={post.id} href={`/blog/${post.slug}`} className="group overflow-hidden rounded-2xl border border-[#e1dcd3] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(15,23,42,0.1)]"><PostImage post={post} /><div className="p-5">{post.category && <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#5b21b6]">{post.category}</span>}<h3 className="mt-3 font-[var(--font-syne)] text-xl font-bold leading-tight text-[#070b1d]">{post.title}</h3>{post.excerpt && <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#4d556b]">{post.excerpt}</p>}<div className="mt-5"><PostMeta post={post} /></div></div></Link>)}</div></section></> : <section className="mx-auto max-w-3xl px-5 pt-16 text-center"><h2 className="font-[var(--font-syne)] text-3xl font-bold text-[#070b1d]">No matching articles yet</h2><p className="mt-3 text-[#3f465f]">Try a different topic or search phrase.</p></section>}
  </main>
}
