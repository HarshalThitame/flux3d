"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, Eye, EyeOff, ImagePlus, Loader2, Pencil, Sparkles, Star, Trash2, Upload, X } from "lucide-react";
import AdminToast, { type AdminToastState } from "@/components/admin/AdminToast";
import { uploadFormFileWithProgress, validateImageFile } from "@/lib/shop/upload";
import type { GalleryItem, GalleryStatus } from "@/lib/gallery/types";

type EditorForm = {
  id?: string;
  title: string;
  description: string;
  image_url: string;
  alt_text: string;
  category: string;
  materials: string;
  status: GalleryStatus;
  is_featured: boolean;
  display_order: number;
};

const blankForm: EditorForm = { title: "", description: "", image_url: "", alt_text: "", category: "Studio work", materials: "", status: "draft", is_featured: false, display_order: 0 };

function toForm(item: GalleryItem): EditorForm {
  return { id: item.id, title: item.title, description: item.description ?? "", image_url: item.image_url, alt_text: item.alt_text, category: item.category, materials: item.materials.join(", "), status: item.status, is_featured: item.is_featured, display_order: item.display_order };
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export default function GalleryAdminClient() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<EditorForm>(blankForm);
  const [toast, setToast] = useState<AdminToastState>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/gallery");
      const json = (await response.json().catch(() => ({}))) as { items?: GalleryItem[]; error?: string };
      if (!response.ok) throw new Error(json.error || "Could not load gallery items.");
      setItems(json.items ?? []);
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Could not load gallery items." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function change<K extends keyof EditorForm>(key: K, value: EditorForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openNew() {
    setForm({ ...blankForm, display_order: items.length });
    setUploadProgress(0);
    setEditorOpen(true);
  }

  function openEdit(item: GalleryItem) {
    setForm(toForm(item));
    setUploadProgress(0);
    setEditorOpen(true);
  }

  async function uploadImage(file: File) {
    const validation = validateImageFile(file);
    if (validation) throw new Error(validation);
    setUploading(true);
    setUploadProgress(0);
    try {
      const result = await uploadFormFileWithProgress("/api/3d-shop/admin/upload", file, { productId: "gallery" }, setUploadProgress);
      const imageUrl = typeof result.publicUrl === "string" ? result.publicUrl : "";
      if (!imageUrl) throw new Error("The image upload did not return a URL.");
      setForm((current) => ({ ...current, image_url: imageUrl, alt_text: current.alt_text || current.title || file.name.replace(/\.[^.]+$/, "") }));
      setToast({ type: "success", message: "Raw image uploaded. Add its editorial details, then save." });
    } finally {
      setUploading(false);
    }
  }

  async function chooseImage(file?: File) {
    if (!file) return;
    try { await uploadImage(file); } catch (error) { setToast({ type: "error", message: error instanceof Error ? error.message : "Upload failed." }); }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.image_url) {
      setToast({ type: "error", message: "Upload an image and give the work a title before saving." });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, title: form.title.trim(), description: form.description.trim(), alt_text: form.alt_text.trim() || form.title.trim(), category: form.category.trim() || "Studio work", materials: form.materials.split(",").map((value) => value.trim()).filter(Boolean) };
      const response = await fetch("/api/admin/gallery", { method: form.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = (await response.json().catch(() => ({}))) as { item?: GalleryItem; error?: string };
      if (!response.ok || !json.item) throw new Error(json.error || "Could not save gallery item.");
      setItems((current) => form.id ? current.map((item) => item.id === json.item!.id ? json.item! : item) : [...current, json.item!]);
      setEditorOpen(false);
      setToast({ type: "success", message: form.id ? "Gallery item updated." : "Gallery item added." });
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Could not save gallery item." });
    } finally { setSaving(false); }
  }

  async function patch(item: GalleryItem, changes: Partial<EditorForm>, successMessage: string) {
    try {
      const response = await fetch("/api/admin/gallery", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, ...changes }) });
      const json = (await response.json().catch(() => ({}))) as { item?: GalleryItem; error?: string };
      if (!response.ok || !json.item) throw new Error(json.error || "Could not update gallery item.");
      setItems((current) => current.map((entry) => entry.id === item.id ? json.item! : entry));
      setToast({ type: "success", message: successMessage });
    } catch (error) { setToast({ type: "error", message: error instanceof Error ? error.message : "Could not update gallery item." }); }
  }

  async function remove(item: GalleryItem) {
    if (!window.confirm(`Remove “${item.title}” from the gallery? The original uploaded asset is retained in the shared media library.`)) return;
    try {
      const response = await fetch(`/api/admin/gallery?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
      const json = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(json.error || "Could not remove gallery item.");
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setToast({ type: "success", message: "Gallery item removed." });
    } catch (error) { setToast({ type: "error", message: error instanceof Error ? error.message : "Could not remove gallery item." }); }
  }

  const published = items.filter((item) => item.status === "published").length;

  return <>
    <div className="mx-auto max-w-7xl space-y-7 text-[#111827]">
      <header className="relative overflow-hidden rounded-2xl border border-[#e3dfd7] bg-[#fbfaf7] px-6 py-7 shadow-sm sm:px-8"><div aria-hidden="true" className="absolute right-[-3rem] top-[-4rem] h-48 w-48 rounded-full bg-violet-100 blur-3xl" /><div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.17em] text-violet-800"><Sparkles className="h-3.5 w-3.5" /> Studio curation</div><h1 className="mt-3 text-3xl font-bold tracking-[-.035em] text-[#111827] sm:text-4xl">Gallery control room</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Upload raw product photography, add the right context, and decide exactly what reaches the public collection.</p></div><button type="button" onClick={openNew} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#17122a] px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(23,18,42,.16)] transition hover:-translate-y-0.5 hover:bg-violet-900"><ImagePlus className="h-4 w-4" /> Add gallery work</button></div></header>
      <section className="grid gap-4 sm:grid-cols-3"><div className="rounded-xl border border-[#e3dfd7] bg-white p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Total assets</p><p className="mt-2 text-3xl font-bold text-[#17122a]">{items.length}</p></div><div className="rounded-xl border border-[#e3dfd7] bg-white p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Published</p><p className="mt-2 text-3xl font-bold text-[#17122a]">{published}</p></div><div className="rounded-xl border border-[#e3dfd7] bg-white p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">In review</p><p className="mt-2 text-3xl font-bold text-[#17122a]">{items.length - published}</p></div></section>
      {loading ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-80 animate-pulse rounded-2xl bg-slate-200" />)}</div> : items.length ? <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <article key={item.id} className="overflow-hidden rounded-2xl border border-[#e3dfd7] bg-white shadow-sm"><div className="relative aspect-[1.25] bg-[#e9e6df]"><Image src={item.image_url} alt={item.alt_text} fill sizes="(min-width: 1280px) 28vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />{item.is_featured && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#17122a]/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-white"><Star className="h-3 w-3 fill-current" /> Feature</span>}<span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] ${item.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{item.status}</span></div><div className="p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-violet-800">{item.category}</p><h2 className="mt-1 truncate text-lg font-bold text-[#17122a]">{item.title}</h2></div><button type="button" onClick={() => openEdit(item)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#e2ddd5] text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800" aria-label={`Edit ${item.title}`}><Pencil className="h-3.5 w-3.5" /></button></div><p className="mt-2 text-xs text-slate-500">Added {displayDate(item.created_at)} · Order {item.display_order}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => patch(item, { status: item.status === "published" ? "draft" : "published" }, item.status === "published" ? "Moved to drafts." : "Published to gallery.")} className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2ddd5] px-3 py-2 text-xs font-bold text-[#272235] transition hover:bg-slate-50">{item.status === "published" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{item.status === "published" ? "Unpublish" : "Publish"}</button><button type="button" onClick={() => patch(item, { is_featured: !item.is_featured }, item.is_featured ? "Removed from featured." : "Set as featured.")} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition ${item.is_featured ? "border-violet-200 bg-violet-50 text-violet-800" : "border-[#e2ddd5] text-[#272235] hover:bg-slate-50"}`}><Star className={`h-3.5 w-3.5 ${item.is_featured ? "fill-current" : ""}`} />{item.is_featured ? "Featured" : "Feature"}</button><button type="button" onClick={() => remove(item)} className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-rose-600 transition hover:bg-rose-50" aria-label={`Remove ${item.title}`}><Trash2 className="h-3.5 w-3.5" /></button></div></div></article>)}</section> : <section className="rounded-2xl border border-dashed border-[#d8d3ca] bg-white p-12 text-center"><ImagePlus className="mx-auto h-8 w-8 text-violet-700" /><h2 className="mt-4 text-xl font-bold text-[#17122a]">Your gallery is ready for its first raw image.</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Upload a product photo, label the material or process, then publish whenever it is ready to appear on the storefront.</p><button type="button" onClick={openNew} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#17122a] px-5 py-3 text-sm font-bold text-white"><Upload className="h-4 w-4" /> Upload image</button></section>}
    </div>
    {editorOpen && <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={form.id ? "Edit gallery item" : "Add gallery item"}><form onSubmit={save} className="mx-auto my-4 max-w-4xl overflow-hidden rounded-2xl bg-[#fbfaf7] shadow-2xl"><div className="flex items-center justify-between border-b border-[#e3dfd7] p-5 sm:p-6"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-violet-800">Gallery editor</p><h2 className="mt-1 text-xl font-bold text-[#17122a]">{form.id ? "Refine gallery work" : "Add a raw studio image"}</h2></div><button type="button" onClick={() => setEditorOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border border-[#e2ddd5] text-slate-600 hover:bg-white" aria-label="Close editor"><X className="h-5 w-5" /></button></div><div className="grid gap-7 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.8fr)]"><div><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => { void chooseImage(event.target.files?.[0]); event.target.value = ""; }} /><button type="button" onClick={() => fileInput.current?.click()} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); void chooseImage(event.dataTransfer.files[0]); }} className={`relative flex aspect-[1.2] w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition ${isDragging ? "border-violet-500 bg-violet-50" : "border-[#d8d3ca] bg-white hover:border-violet-300"}`}>{form.image_url ? <><Image src={form.image_url} alt="Gallery upload preview" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" /><span className="absolute bottom-3 left-3 rounded-lg bg-[#17122a]/90 px-3 py-2 text-xs font-bold text-white">Replace image</span></> : <>{uploading ? <Loader2 className="h-8 w-8 animate-spin text-violet-700" /> : <Upload className="h-8 w-8 text-violet-700" />}<span className="mt-3 text-sm font-bold text-[#17122a]">{uploading ? `Uploading ${uploadProgress}%` : "Drop a raw image or browse"}</span><span className="mt-1 text-xs text-slate-500">JPG, PNG, WebP, or GIF · 8MB max</span></>}</button>{uploading && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-violet-700 transition-all" style={{ width: `${uploadProgress}%` }} /></div>}</div><div className="space-y-4"><label className="block text-sm font-bold text-[#272235]">Title<input required value={form.title} onChange={(event) => change("title", event.target.value)} placeholder="e.g. Tactile storage insert" className="mt-1.5 w-full rounded-xl border border-[#dcd7cf] bg-white px-3.5 py-3 text-sm text-[#17122a] outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label><label className="block text-sm font-bold text-[#272235]">Category<input value={form.category} onChange={(event) => change("category", event.target.value)} placeholder="e.g. Functional parts" className="mt-1.5 w-full rounded-xl border border-[#dcd7cf] bg-white px-3.5 py-3 text-sm text-[#17122a] outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label><label className="block text-sm font-bold text-[#272235]">Materials / process<input value={form.materials} onChange={(event) => change("materials", event.target.value)} placeholder="PLA, 0.16 mm, satin finish" className="mt-1.5 w-full rounded-xl border border-[#dcd7cf] bg-white px-3.5 py-3 text-sm text-[#17122a] outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /><span className="mt-1 block text-xs font-normal text-slate-500">Separate labels with commas.</span></label><label className="block text-sm font-bold text-[#272235]">Description<textarea value={form.description} onChange={(event) => change("description", event.target.value)} rows={4} placeholder="What makes this work worth a closer look?" className="mt-1.5 w-full resize-y rounded-xl border border-[#dcd7cf] bg-white px-3.5 py-3 text-sm leading-6 text-[#17122a] outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label><label className="block text-sm font-bold text-[#272235]">Image description (alt text)<input value={form.alt_text} onChange={(event) => change("alt_text", event.target.value)} placeholder="Describe the finished product in this image" className="mt-1.5 w-full rounded-xl border border-[#dcd7cf] bg-white px-3.5 py-3 text-sm text-[#17122a] outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-bold text-[#272235]">Visibility<select value={form.status} onChange={(event) => change("status", event.target.value as GalleryStatus)} className="mt-1.5 w-full rounded-xl border border-[#dcd7cf] bg-white px-3.5 py-3 text-sm text-[#17122a] outline-none focus:border-violet-500"><option value="draft">Draft</option><option value="published">Published</option></select></label><label className="block text-sm font-bold text-[#272235]">Display order<input type="number" min="0" value={form.display_order} onChange={(event) => change("display_order", Number(event.target.value))} className="mt-1.5 w-full rounded-xl border border-[#dcd7cf] bg-white px-3.5 py-3 text-sm text-[#17122a] outline-none focus:border-violet-500" /></label></div><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#e0dbd3] bg-white p-3.5 text-sm font-bold text-[#272235]"><input type="checkbox" checked={form.is_featured} onChange={(event) => change("is_featured", event.target.checked)} className="h-4 w-4 accent-violet-700" /> Feature this work in the gallery hero</label></div></div><div className="flex flex-col-reverse gap-3 border-t border-[#e3dfd7] p-5 sm:flex-row sm:justify-end sm:p-6"><button type="button" onClick={() => setEditorOpen(false)} className="min-h-11 rounded-xl border border-[#dcd7cf] bg-white px-5 text-sm font-bold text-[#272235]">Cancel</button><button disabled={saving || uploading} type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#17122a] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"><Check className="h-4 w-4" />{saving ? "Saving…" : form.id ? "Save changes" : "Add to gallery"}</button></div></form></div>}
    <AdminToast toast={toast} />
  </>;
}
