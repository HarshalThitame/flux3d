"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Camera, ChevronRight, Grid2X2, Layers3, Maximize2, Sparkles, X } from "lucide-react";
import type { GalleryItem } from "@/lib/gallery/types";

type GalleryClientProps = { items: GalleryItem[] };

function itemGridClass(index: number) {
  if (index === 0) return "sm:col-span-2 sm:row-span-2";
  if (index % 7 === 4) return "xl:col-span-2";
  if (index % 7 === 6) return "sm:row-span-2";
  return "";
}

function GalleryImage({ item, preload = false }: { item: GalleryItem; preload?: boolean }) {
  return <Image src={item.image_url} alt={item.alt_text || item.title} fill preload={preload} sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-700 ease-out group-hover:scale-[1.035]" />;
}

export default function GalleryClient({ items }: GalleryClientProps) {
  const [activeCategory, setActiveCategory] = useState("All work");
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const reduceMotion = useReducedMotion();
  const categories = useMemo(() => ["All work", ...Array.from(new Set(items.map((item) => item.category))).sort()], [items]);
  const visibleItems = useMemo(() => activeCategory === "All work" ? items : items.filter((item) => item.category === activeCategory), [activeCategory, items]);
  const featured = items.find((item) => item.is_featured) ?? items[0] ?? null;

  useEffect(() => {
    if (!selectedItem) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedItem(null); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectedItem]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#f8f7f4] pt-20 text-[#111827]">
      <section className="relative overflow-hidden border-b border-[#e7e4dd] bg-[#f8f7f4] px-4 pb-14 pt-10 sm:px-6 md:px-10 lg:px-12 lg:pb-20">
        <div aria-hidden="true" className="absolute left-[-8rem] top-[-9rem] h-80 w-80 rounded-full bg-violet-200/40 blur-3xl" />
        <div aria-hidden="true" className="absolute bottom-[-10rem] right-[-4rem] h-80 w-80 rounded-full bg-amber-100/80 blur-3xl" />
        <div className="relative mx-auto grid max-w-[1320px] gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.17em] text-violet-800 shadow-sm"><Camera className="h-3.5 w-3.5" />The Flux3D edit</div>
            <h1 className="mt-5 max-w-4xl font-[var(--font-display)] text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-[#111827] sm:text-6xl lg:text-8xl">Made to be looked at closely.</h1>
            <p className="mt-6 max-w-2xl text-base font-medium leading-7 text-slate-600 sm:text-lg">An unfiltered study of the products, prototypes, surfaces, and small details leaving our studio. Every frame is a real Flux3D build.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/quote" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#17122a] px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(23,18,42,.18)] transition hover:-translate-y-0.5 hover:bg-violet-900">Start a custom project <ArrowRight className="h-4 w-4" /></Link>
              <a href="#the-collection" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#d9d5cc] bg-white px-5 text-sm font-bold text-[#272235] transition hover:border-violet-300 hover:bg-violet-50">Explore the collection <ChevronRight className="h-4 w-4" /></a>
            </div>
          </div>
          <div className="rounded-2xl border border-[#e4e0d8] bg-white/90 p-3 shadow-[0_20px_60px_rgba(32,26,42,.10)] backdrop-blur">
            {featured ? <button type="button" onClick={() => setSelectedItem(featured)} className="group block w-full text-left"><div className="relative aspect-[1.18] overflow-hidden rounded-xl bg-[#eae7e0]"><GalleryImage item={featured} preload /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent p-5 text-white"><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">Featured study</p><p className="mt-1 text-lg font-bold">{featured.title}</p></div><span className="grid h-9 w-9 place-items-center rounded-full border border-white/30 bg-white/15 backdrop-blur transition group-hover:bg-white group-hover:text-[#17122a]"><ArrowUpRight className="h-4 w-4" /></span></div></div></div></button> : <div className="flex aspect-[1.18] flex-col items-center justify-center rounded-xl border border-dashed border-[#d9d5cc] bg-[#fbfaf7] px-8 text-center"><Sparkles className="h-7 w-7 text-violet-700" /><p className="mt-4 text-lg font-bold text-[#282235]">The next frame is in the studio.</p><p className="mt-2 text-sm leading-6 text-slate-600">Published work will appear here as your team curates it.</p></div>}
          </div>
        </div>
      </section>

      <section id="the-collection" className="mx-auto max-w-[1320px] px-4 py-14 sm:px-6 md:px-10 lg:px-12 lg:py-20">
        <div className="flex flex-col gap-6 border-b border-[#e4e0d8] pb-7 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-violet-800"><Layers3 className="h-4 w-4" />Selected work</div><h2 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-[#111827] sm:text-4xl">The material library, in real life.</h2></div><div className="flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">{categories.map((category) => { const active = activeCategory === category; return <button key={category} type="button" onClick={() => setActiveCategory(category)} aria-pressed={active} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${active ? "bg-[#17122a] text-white shadow-sm" : "border border-[#dfdbd3] bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50"}`}>{category}</button>; })}</div></div>
        {visibleItems.length ? <motion.div layout className="mt-8 grid auto-rows-[250px] grid-cols-1 gap-4 sm:grid-cols-2 sm:auto-rows-[220px] xl:grid-cols-4 xl:auto-rows-[205px]"><AnimatePresence mode="popLayout">{visibleItems.map((item, index) => <motion.button key={item.id} type="button" layout initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.35, delay: reduceMotion ? 0 : Math.min(index * 0.025, 0.2) }} onClick={() => setSelectedItem(item)} className={`group relative overflow-hidden rounded-2xl bg-[#e9e6df] text-left shadow-sm ring-1 ring-black/[.03] focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300 ${itemGridClass(index)}`}><GalleryImage item={item} /><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent opacity-90 transition group-hover:from-black/80" /><div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5"><div className="flex items-end justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/75">{item.category}</p><h3 className="mt-1 truncate text-base font-bold sm:text-lg">{item.title}</h3></div><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/30 bg-white/10 opacity-0 backdrop-blur transition group-hover:opacity-100"><Maximize2 className="h-4 w-4" /></span></div></div></motion.button>)}</AnimatePresence></motion.div> : <div className="mt-8 rounded-2xl border border-dashed border-[#d9d5cc] bg-white p-10 text-center"><Grid2X2 className="mx-auto h-7 w-7 text-violet-700" /><h3 className="mt-4 text-xl font-bold text-[#17122a]">No published work in this view yet.</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Try another collection, or return soon—new raw studio work is added as it is approved.</p></div>}
      </section>

      <AnimatePresence>{selectedItem && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] overflow-y-auto bg-[#15111f]/80 p-4 backdrop-blur-sm sm:p-8" role="dialog" aria-modal="true" aria-label={`${selectedItem.title} details`} onMouseDown={() => setSelectedItem(null)}><motion.div initial={{ opacity: 0, y: reduceMotion ? 0 : 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} transition={{ duration: 0.26 }} className="mx-auto grid min-h-full max-w-6xl overflow-hidden rounded-2xl bg-[#fbfaf7] shadow-2xl lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]" onMouseDown={(event) => event.stopPropagation()}><div className="relative min-h-[42svh] bg-[#e9e6df] lg:min-h-[70svh]"><GalleryImage item={selectedItem} /></div><aside className="flex flex-col p-6 sm:p-8"><div className="flex items-start justify-between gap-5"><div><p className="text-[11px] font-bold uppercase tracking-[0.17em] text-violet-800">{selectedItem.category}</p><h2 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-[#111827]">{selectedItem.title}</h2></div><button type="button" onClick={() => setSelectedItem(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#ded9d0] bg-white text-[#302a3d] transition hover:bg-violet-50" aria-label="Close image detail"><X className="h-5 w-5" /></button></div>{selectedItem.description && <p className="mt-6 text-sm font-medium leading-7 text-slate-600">{selectedItem.description}</p>}{selectedItem.materials.length > 0 && <div className="mt-7 border-t border-[#e7e3db] pt-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Material & process</p><div className="mt-3 flex flex-wrap gap-2">{selectedItem.materials.map((material) => <span key={material} className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-900">{material}</span>)}</div></div>}<div className="mt-auto pt-8"><Link href="/quote" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#17122a] px-5 text-sm font-bold text-white transition hover:bg-violet-900">Create something similar <ArrowRight className="h-4 w-4" /></Link></div></aside></motion.div></motion.div>}</AnimatePresence>
    </main>
  );
}
