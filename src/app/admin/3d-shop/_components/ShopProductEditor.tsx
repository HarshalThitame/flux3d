'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import {
  Archive,
  ChevronDown,
  ChevronRight,
  GripVertical,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import type { ShopCategory, ShopProduct, ShopSku, ShopVariantOption } from '@/lib/shop/admin-types'
import { slugifyShopValue, stableStringify } from '@/lib/shop/admin-types'

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
  ssr: false,
  loading: () => <div className="min-h-[220px] rounded-xl border border-[#6d28d9]/10 bg-gray-50" aria-busy="true" />,
})

type ProductForm = {
  id?: string
  name: string
  slug: string
  description: string
  long_description: string
  category_id: string
  tags: string[]
  occasion_tags: string[]
  thumbnail_url: string
  image_urls: string[]
  base_price: number
  is_customizable: boolean
  customization_label: string
  is_featured: boolean
  is_active: boolean
  is_archived: boolean
  meta_title: string
  meta_description: string
}

type DraftVariant = ShopVariantOption & {
  dirty?: boolean
}

type DraftSku = ShopSku & {
  dirty?: boolean
}

type UploadState = Record<string, 'uploading' | 'done' | 'error'>

const emptyProduct: ProductForm = {
  name: '',
  slug: '',
  description: '',
  long_description: '',
  category_id: '',
  tags: [],
  occasion_tags: [],
  thumbnail_url: '',
  image_urls: [],
  base_price: 0,
  is_customizable: false,
  customization_label: '',
  is_featured: false,
  is_active: false,
  is_archived: false,
  meta_title: '',
  meta_description: '',
}

const occasionTags = [
  'Diwali',
  'Eid',
  'Christmas',
  'Birthday',
  'Anniversary',
  'Gaming Setup',
  'Office Desk',
  'Home Decor',
  'Wedding Gift',
]

const presetOptionNames = ['Size', 'Color', 'Material', 'Finish', 'Style', 'Pack Size', 'LED', 'Engraving', 'Custom...']
const optionTypes: ShopVariantOption['option_type'][] = ['button', 'swatch_color', 'dropdown', 'toggle', 'text_input']

function toProductForm(product: ShopProduct): ProductForm {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description ?? '',
    long_description: product.long_description ?? '',
    category_id: product.category_id ?? '',
    tags: product.tags ?? [],
    occasion_tags: product.occasion_tags ?? [],
    thumbnail_url: product.thumbnail_url ?? '',
    image_urls: product.image_urls ?? [],
    base_price: Number(product.base_price ?? 0),
    is_customizable: product.is_customizable ?? false,
    customization_label: product.customization_label ?? '',
    is_featured: product.is_featured ?? false,
    is_active: product.is_active ?? false,
    is_archived: product.is_archived ?? false,
    meta_title: product.meta_title ?? '',
    meta_description: product.meta_description ?? '',
  }
}

function getStatusLabel(product: ProductForm) {
  if (product.is_archived) return 'Archived'
  return product.is_active ? 'Published' : 'Draft'
}

function getStatusClasses(product: ProductForm) {
  if (product.is_archived) return 'bg-rose-100 text-rose-700'
  return product.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'
}

function comboLabel(combo: Record<string, string | boolean>) {
  const entries = Object.entries(combo)
  if (entries.length === 0) return 'Standard'
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(' · ')
}

function cartesianProduct(options: { name: string; values: string[] }[]) {
  if (options.length === 0) return [{}] as Record<string, string>[]
  return options.reduce<Record<string, string>[]>(
    (acc, option) =>
      acc.flatMap((combo) =>
        option.values.map((value) => ({
          ...combo,
          [option.name]: value,
        }))
      ),
    [{}]
  )
}

function imageList(product: ProductForm) {
  return [product.thumbnail_url, ...product.image_urls].filter(Boolean)
}

function Section({
  title,
  description,
  children,
  defaultOpen = true,
}: {
  title: string
  description?: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 border-b border-gray-100 px-5 py-4 text-left"
      >
        <div>
          <h2 className="font-[var(--font-syne)] text-lg font-bold text-[#0F1B3D]">{title}</h2>
          {description && <p className="mt-1 text-sm text-[#6F7192]">{description}</p>}
        </div>
        {open ? <ChevronDown className="h-5 w-5 text-[#6F7192]" /> : <ChevronRight className="h-5 w-5 text-[#6F7192]" />}
      </button>
      {open && <div className="space-y-5 p-5">{children}</div>}
    </section>
  )
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
      <div>
        <div className="text-sm font-semibold text-[#0F1B3D]">{label}</div>
        {description && <div className="mt-0.5 text-xs text-[#6F7192]">{description}</div>}
      </div>
      <button
        type="button"
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-[#6d28d9]' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}

function TagInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder: string
}) {
  const [draft, setDraft] = useState('')

  function commit(input = draft) {
    const next = input.trim()
    if (!next) return
    if (!value.includes(next)) onChange([...value, next])
    setDraft('')
  }

  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[#6F7192]">{label}</span>
      <div className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2">
        <div className="mb-2 flex flex-wrap gap-2">
          {value.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onChange(value.filter((item) => item !== tag))}
              className="inline-flex items-center gap-1 rounded-full bg-[#6d28d9]/10 px-2.5 py-1 text-xs font-medium text-[#6d28d9]"
            >
              {tag}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commit()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault()
              commit()
            }
          }}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-[#0F1B3D] outline-none placeholder:text-[#6F7192]"
        />
      </div>
    </label>
  )
}

export default function ShopProductEditor({
  mode,
  productId,
}: {
  mode: 'new' | 'edit'
  productId?: string
}) {
  const router = useRouter()
  const skuSectionRef = useRef<HTMLDivElement | null>(null)
  const [product, setProduct] = useState<ProductForm>(emptyProduct)
  const [categories, setCategories] = useState<ShopCategory[]>([])
  const [variants, setVariants] = useState<DraftVariant[]>([])
  const [skus, setSkus] = useState<DraftSku[]>([])
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [slugTouched, setSlugTouched] = useState(mode === 'edit')
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [uploadState, setUploadState] = useState<UploadState>({})
  const [dragImage, setDragImage] = useState<string | null>(null)
  const [dragVariant, setDragVariant] = useState<string | null>(null)
  const [quickPrice, setQuickPrice] = useState('')
  const [quickStock, setQuickStock] = useState('')
  const [toast, setToast] = useState<AdminToastState>(null)

  const loadVariants = useCallback(async (id: string) => {
    const response = await fetch(`/api/3d-shop/admin/products/${id}/variants`)
    const data = (await response.json()) as { variants?: ShopVariantOption[] }
    setVariants(data.variants ?? [])
  }, [])

  const loadSkus = useCallback(async (id: string) => {
    const response = await fetch(`/api/3d-shop/admin/products/${id}/skus`)
    const data = (await response.json()) as { skus?: ShopSku[] }
    setSkus(data.skus ?? [])
  }, [])

  const loadInitialData = useCallback(async () => {
    setLoading(true)
    try {
      const categoriesResponse = await fetch('/api/3d-shop/admin/categories')
      const categoriesData = (await categoriesResponse.json()) as { categories?: ShopCategory[] }
      setCategories(categoriesData.categories ?? [])

      if (mode === 'edit' && productId) {
        const productResponse = await fetch(`/api/3d-shop/admin/products?id=${productId}`)
        const productData = (await productResponse.json()) as { product?: ShopProduct; error?: string }
        if (!productResponse.ok || !productData.product) throw new Error(productData.error || 'Product not found.')
        setProduct(toProductForm(productData.product))
        await Promise.all([loadVariants(productId), loadSkus(productId)])
      }
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load product.' })
    } finally {
      setLoading(false)
    }
  }, [loadSkus, loadVariants, mode, productId])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadInitialData()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [loadInitialData])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  function updateProduct<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setProduct((current) => {
      const next = { ...current, [key]: value }
      if (key === 'name' && !slugTouched) {
        next.slug = slugifyShopValue(String(value))
      }
      return next
    })
    setDirty(true)
  }

  async function checkSlug() {
    if (!product.slug) return
    setSlugStatus('checking')
    const params = new URLSearchParams({ slug: product.slug })
    if (product.id) params.set('exclude_id', product.id)
    const response = await fetch(`/api/3d-shop/admin/products?${params.toString()}`)
    const data = (await response.json().catch(() => ({}))) as { available?: boolean }
    setSlugStatus(data.available ? 'available' : 'taken')
  }

  function productPayload(status?: 'draft' | 'publish') {
    return {
      id: product.id,
      name: product.name.trim(),
      slug: product.slug.trim(),
      category_id: product.category_id || null,
      description: product.description,
      long_description: product.long_description,
      tags: product.tags,
      occasion_tags: product.occasion_tags,
      thumbnail_url: product.thumbnail_url || null,
      image_urls: product.image_urls,
      base_price: product.base_price,
      is_customizable: product.is_customizable,
      customization_label: product.customization_label,
      is_featured: product.is_featured,
      is_active: status === 'publish' ? true : status === 'draft' ? false : product.is_active,
      is_archived: product.is_archived,
      meta_title: product.meta_title,
      meta_description: product.meta_description,
    }
  }

  async function ensureProductId() {
    if (product.id) return product.id
    if (!product.name.trim()) throw new Error('Add a product name before saving.')
    if (!product.slug.trim()) throw new Error('Add a product slug before saving.')

    const response = await fetch('/api/3d-shop/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productPayload('draft')),
    })
    const data = (await response.json()) as { product?: ShopProduct; error?: string }
    if (!response.ok || !data.product) throw new Error(data.error || 'Failed to create product.')
    setProduct(toProductForm(data.product))
    setDirty(false)
    router.replace(`/admin/3d-shop/products/${data.product.id}/edit`)
    return data.product.id
  }

  async function saveProduct(status?: 'draft' | 'publish') {
    setSaving(true)
    try {
      const id = await ensureProductId()
      const response = await fetch('/api/3d-shop/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...productPayload(status), id }),
      })
      const data = (await response.json()) as { product?: ShopProduct; error?: string }
      if (!response.ok || !data.product) throw new Error(data.error || 'Failed to save product.')
      setProduct(toProductForm(data.product))
      setDirty(false)
      setToast({ type: 'success', message: status === 'publish' ? 'Product published.' : 'Product saved.' })
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to save product.' })
    } finally {
      setSaving(false)
    }
  }

  async function uploadImage(file: File, target: 'gallery' | 'variant' = 'gallery', skuId?: string) {
    const id = await ensureProductId()
    const tempKey = `${file.name}-${Date.now()}`
    setUploadState((current) => ({ ...current, [tempKey]: 'uploading' }))
    const body = new FormData()
    body.append('file', file)
    body.append('productId', id)

    const response = await fetch('/api/3d-shop/admin/upload', { method: 'POST', body })
    const data = (await response.json()) as { publicUrl?: string; error?: string }
    if (!response.ok || !data.publicUrl) {
      setUploadState((current) => ({ ...current, [tempKey]: 'error' }))
      throw new Error(data.error || 'Upload failed.')
    }

    setUploadState((current) => ({ ...current, [tempKey]: 'done' }))
    if (target === 'variant' && skuId) {
      updateSku(skuId, 'variant_image_url', data.publicUrl)
    } else {
      setProduct((current) => {
        if (!current.thumbnail_url) return { ...current, thumbnail_url: data.publicUrl || '' }
        return { ...current, image_urls: [...current.image_urls, data.publicUrl || ''] }
      })
      setDirty(true)
    }
  }

  function setThumbnail(url: string) {
    setProduct((current) => {
      const images = imageList(current).filter((item) => item !== url)
      return { ...current, thumbnail_url: url, image_urls: images }
    })
    setDirty(true)
  }

  function removeImage(url: string) {
    setProduct((current) => {
      const images = imageList(current).filter((item) => item !== url)
      return { ...current, thumbnail_url: images[0] ?? '', image_urls: images.slice(1) }
    })
    setDirty(true)
  }

  function handleImageDrop(targetUrl: string) {
    if (!dragImage || dragImage === targetUrl) return
    const images = imageList(product)
    const from = images.indexOf(dragImage)
    const to = images.indexOf(targetUrl)
    if (from < 0 || to < 0) return
    const [moved] = images.splice(from, 1)
    images.splice(to, 0, moved)
    setProduct((current) => ({ ...current, thumbnail_url: images[0] ?? '', image_urls: images.slice(1) }))
    setDragImage(null)
    setDirty(true)
  }

  async function addVariant() {
    try {
      const id = await ensureProductId()
      const response = await fetch(`/api/3d-shop/admin/products/${id}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          option_name: 'Size',
          option_type: 'button',
          values: [],
          display_order: variants.length,
          is_required: true,
        }),
      })
      const data = (await response.json()) as { variant?: ShopVariantOption; error?: string }
      if (!response.ok || !data.variant) throw new Error(data.error || 'Failed to add variant.')
      setVariants((current) => [...current, data.variant as DraftVariant])
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to add variant.' })
    }
  }

  function updateVariant<K extends keyof ShopVariantOption>(variantId: string, key: K, value: ShopVariantOption[K]) {
    setVariants((current) =>
      current.map((variant) => (variant.id === variantId ? { ...variant, [key]: value, dirty: true } : variant))
    )
    setDirty(true)
  }

  async function saveAllVariants() {
    if (!product.id) return
    const dirtyVariants = variants.filter((variant) => variant.dirty)
    await Promise.all(
      dirtyVariants.map(async (variant) => {
        const response = await fetch(`/api/3d-shop/admin/products/${product.id}/variants`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(variant),
        })
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        if (!response.ok) throw new Error(data.error || 'Failed to save variant option.')
      })
    )
    setVariants((current) => current.map((variant) => ({ ...variant, dirty: false })))
  }

  async function deleteVariant(variant: DraftVariant) {
    if (!product.id || !window.confirm(`Delete variant option "${variant.option_name}"?`)) return
    const response = await fetch(`/api/3d-shop/admin/products/${product.id}/variants?id=${variant.id}`, { method: 'DELETE' })
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    if (!response.ok) {
      setToast({ type: 'error', message: data.error || 'Failed to delete variant.' })
      return
    }
    setVariants((current) => current.filter((item) => item.id !== variant.id))
  }

  async function reorderVariants(targetId: string) {
    if (!dragVariant || dragVariant === targetId || !product.id) return
    const current = [...variants]
    const from = current.findIndex((variant) => variant.id === dragVariant)
    const to = current.findIndex((variant) => variant.id === targetId)
    if (from < 0 || to < 0) return
    const [moved] = current.splice(from, 1)
    current.splice(to, 0, moved)
    const ordered = current.map((variant, index) => ({ ...variant, display_order: index }))
    setVariants(ordered)
    setDragVariant(null)
    const response = await fetch(`/api/3d-shop/admin/products/${product.id}/variants`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders: ordered.map((variant) => ({ id: variant.id, display_order: variant.display_order ?? 0 })) }),
    })
    if (!response.ok) setToast({ type: 'error', message: 'Failed to save variant order.' })
  }

  async function generateSkus() {
    try {
      const id = await ensureProductId()
      await saveAllVariants()
      const discreteOptions = variants
        .filter((variant) => !['toggle', 'text_input'].includes(variant.option_type))
        .map((variant) => ({ name: variant.option_name, values: (variant.values ?? []).filter(Boolean) }))
        .filter((variant) => variant.values.length > 0)

      const combinations = cartesianProduct(discreteOptions)
      if (!window.confirm(`This will generate ${combinations.length} SKU combination${combinations.length === 1 ? '' : 's'}. Continue?`)) return

      const existingKeys = new Set(skus.map((sku) => stableStringify(sku.variant_combination)))
      const rows = combinations
        .filter((combo) => !existingKeys.has(stableStringify(combo)))
        .map((combo, index) => ({
          sku_code: `${product.slug.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-${Date.now().toString(36).toUpperCase()}-${index + 1}`,
          variant_combination: combo,
          price: product.base_price || 0,
          stock_quantity: 0,
          low_stock_threshold: 5,
          is_available: true,
        }))

      const response = await fetch(`/api/3d-shop/admin/products/${id}/skus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skus: rows }),
      })
      const data = (await response.json()) as { skus?: ShopSku[]; inserted?: number; skipped?: number; error?: string }
      if (!response.ok) throw new Error(data.error || 'Failed to generate SKUs.')
      setSkus(data.skus ?? [])
      setToast({ type: 'success', message: `Generated ${data.inserted ?? 0} SKU${data.inserted === 1 ? '' : 's'}. Skipped ${data.skipped ?? 0}.` })
      window.setTimeout(() => skuSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to generate SKUs.' })
    }
  }

  function updateSku<K extends keyof ShopSku>(skuId: string, key: K, value: ShopSku[K]) {
    setSkus((current) => current.map((sku) => (sku.id === skuId ? { ...sku, [key]: value, dirty: true } : sku)))
    setDirty(true)
  }

  async function saveAllSkus() {
    if (!product.id) return
    setSaving(true)
    try {
      await Promise.all(
        skus
          .filter((sku) => sku.dirty)
          .map(async (sku) => {
            const response = await fetch(`/api/3d-shop/admin/products/${product.id}/skus`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(sku),
            })
            const data = (await response.json().catch(() => ({}))) as { error?: string }
            if (!response.ok) throw new Error(data.error || 'Failed to save SKU.')
          })
      )
      const availablePrices = skus.filter((sku) => sku.is_available !== false).map((sku) => Number(sku.price)).filter(Number.isFinite)
      if (availablePrices.length > 0) {
        const minPrice = Math.min(...availablePrices)
        setProduct((current) => ({ ...current, base_price: minPrice }))
        await fetch('/api/3d-shop/admin/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...productPayload(), id: product.id, base_price: minPrice }),
        })
      }
      setSkus((current) => current.map((sku) => ({ ...sku, dirty: false })))
      setDirty(false)
      setToast({ type: 'success', message: 'SKUs saved.' })
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to save SKUs.' })
    } finally {
      setSaving(false)
    }
  }

  function applyQuickPrice() {
    const value = Number(quickPrice)
    if (!Number.isFinite(value)) return
    setSkus((current) => current.map((sku) => ({ ...sku, price: value, dirty: true })))
    setDirty(true)
  }

  function applyQuickStock() {
    const value = Number(quickStock)
    if (!Number.isFinite(value)) return
    setSkus((current) => current.map((sku) => ({ ...sku, stock_quantity: value, dirty: true })))
    setDirty(true)
  }

  async function archiveProduct() {
    if (!product.id || !window.confirm('Archive this product?')) return
    const response = await fetch(`/api/3d-shop/admin/products?id=${product.id}`, { method: 'DELETE' })
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    if (!response.ok) {
      setToast({ type: 'error', message: data.error || 'Failed to archive product.' })
      return
    }
    setToast({ type: 'success', message: 'Product archived.' })
    router.push('/admin/3d-shop/products')
  }

  const allImages = imageList(product)
  const statusLabel = getStatusLabel(product)

  if (loading) {
    return <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-[#6F7192]">Loading product editor...</div>
  }

  return (
    <div className="space-y-6">
      <AdminToast toast={toast} />

      <div className="sticky top-[72px] z-20 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 flex-1">
            <input
              value={product.name}
              onChange={(event) => updateProduct('name', event.target.value)}
              placeholder="Product name"
              className="w-full bg-transparent font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D] outline-none placeholder:text-[#9ca3af]"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(product)}`}>{statusLabel}</span>
              {dirty && <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-700">Unsaved changes</span>}
              {product.id && <span className="text-xs text-[#6F7192]">ID: {product.id}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/3d-shop/products" className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-[#6F7192] hover:bg-gray-50">Back</Link>
            <button type="button" disabled={saving} onClick={() => void saveProduct('draft')} className="inline-flex items-center gap-2 rounded-xl border border-[#6d28d9]/20 px-4 py-2.5 text-sm font-semibold text-[#6d28d9] hover:bg-[#6d28d9]/5 disabled:opacity-60">
              <Save className="h-4 w-4" />
              Save Draft
            </button>
            <button type="button" disabled={saving || slugStatus === 'taken'} onClick={() => void saveProduct('publish')} className="inline-flex items-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5b21b6] disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Publish
            </button>
          </div>
        </div>
      </div>

      <Section title="Basic Info" description="Core product details, copy, tags, and categorization.">
        <div className="grid gap-5 lg:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[#6F7192]">Name</span>
            <input value={product.name} onChange={(event) => updateProduct('name', event.target.value)} className="w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3.5 py-2.5 text-sm text-[#0F1B3D] outline-none" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[#6F7192]">Slug</span>
            <div className="flex items-center gap-2">
              <input
                value={product.slug}
                onChange={(event) => {
                  setSlugTouched(true)
                  updateProduct('slug', slugifyShopValue(event.target.value))
                  setSlugStatus('idle')
                }}
                onBlur={() => void checkSlug()}
                className="w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3.5 py-2.5 text-sm text-[#0F1B3D] outline-none"
              />
              {slugStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-[#6F7192]" />}
              {slugStatus === 'available' && <span className="text-xs font-semibold text-emerald-700">Available</span>}
              {slugStatus === 'taken' && <span className="text-xs font-semibold text-rose-600">Taken</span>}
            </div>
          </label>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[#6F7192]">Category</span>
            <select value={product.category_id} onChange={(event) => updateProduct('category_id', event.target.value)} className="w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3.5 py-2.5 text-sm text-[#0F1B3D] outline-none">
              <option value="">Uncategorized</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[#6F7192]">Base Price</span>
            <input type="number" value={product.base_price} onChange={(event) => updateProduct('base_price', Number(event.target.value))} className="w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3.5 py-2.5 text-sm text-[#0F1B3D] outline-none" />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-[#6F7192]">Short Description</span>
          <textarea maxLength={200} rows={3} value={product.description} onChange={(event) => updateProduct('description', event.target.value)} className="w-full resize-none rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3.5 py-2.5 text-sm text-[#0F1B3D] outline-none" />
          <span className="mt-1 block text-right text-xs text-[#6F7192]">{product.description.length}/200</span>
        </label>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-[#6F7192]">Long Description</span>
          <RichTextEditor content={product.long_description} onChange={(value) => updateProduct('long_description', value)} placeholder="Write product details..." />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <TagInput label="Tags" value={product.tags} onChange={(value) => updateProduct('tags', value)} placeholder="Type tag and press Enter" />
          <div>
            <span className="mb-2 block text-xs font-medium text-[#6F7192]">Occasion Tags</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {occasionTags.map((tag) => (
                <label key={tag} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-[#0F1B3D]">
                  <input
                    type="checkbox"
                    checked={product.occasion_tags.includes(tag)}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...product.occasion_tags, tag]
                        : product.occasion_tags.filter((item) => item !== tag)
                      updateProduct('occasion_tags', next)
                    }}
                  />
                  {tag}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Images" description="Upload product images, pick a thumbnail, and reorder the gallery.">
        <label className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#6d28d9]/25 bg-[#6d28d9]/5 p-6 text-center">
          <Upload className="h-8 w-8 text-[#6d28d9]" />
          <span className="mt-3 text-sm font-semibold text-[#0F1B3D]">Drag-and-drop zone</span>
          <span className="mt-1 text-xs text-[#6F7192]">Choose multiple images. Each image uploads to Shop storage.</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? [])
              void Promise.all(files.map((file) => uploadImage(file))).catch((error) =>
                setToast({ type: 'error', message: error instanceof Error ? error.message : 'Upload failed.' })
              )
            }}
          />
        </label>
        {Object.entries(uploadState).some(([, state]) => state === 'uploading') && (
          <div className="text-sm text-[#6F7192]">Uploading images...</div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {allImages.map((url) => (
            <div
              key={url}
              draggable
              onDragStart={() => setDragImage(url)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleImageDrop(url)}
              className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50"
            >
              <div className="relative aspect-square">
                <Image src={url} alt="3D Shop product image" fill sizes="220px" className="object-cover" />
              </div>
              <div className="flex items-center justify-between gap-2 p-2">
                <GripVertical className="h-4 w-4 text-[#9ca3af]" />
                <button type="button" onClick={() => setThumbnail(url)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-[#6F7192] hover:bg-white">
                  <Star className={`h-3.5 w-3.5 ${product.thumbnail_url === url ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                  Thumbnail
                </button>
                <button type="button" onClick={() => removeImage(url)} className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Variant Options" description="Define configurable choices that drive SKU generation.">
        {variants.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
            <div className="text-sm font-semibold text-[#0F1B3D]">No variant options yet.</div>
            <button type="button" onClick={() => void addVariant()} className="mt-4 rounded-xl bg-[#6d28d9] px-4 py-2.5 text-sm font-semibold text-white">
              Add First Variant Option
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {variants.map((variant, index) => {
              const isCustomName = !presetOptionNames.includes(variant.option_name)
              return (
                <div
                  key={variant.id}
                  draggable
                  onDragStart={() => setDragVariant(variant.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => void reorderVariants(variant.id)}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="grid gap-3 lg:grid-cols-[auto_180px_170px_1fr_120px_80px_auto] lg:items-start">
                    <GripVertical className="mt-3 h-4 w-4 text-[#9ca3af]" />
                    <label>
                      <span className="mb-1 block text-xs text-[#6F7192]">Option Name</span>
                      <select
                        value={isCustomName ? 'Custom...' : variant.option_name}
                        onChange={(event) => {
                          const value = event.target.value === 'Custom...' ? '' : event.target.value
                          updateVariant(variant.id, 'option_name', value)
                        }}
                        className="w-full rounded-xl border border-[#6d28d9]/10 bg-white px-3 py-2.5 text-sm text-[#0F1B3D] outline-none"
                      >
                        {presetOptionNames.map((name) => <option key={name} value={name}>{name}</option>)}
                      </select>
                      {(isCustomName || !variant.option_name) && (
                        <input
                          value={variant.option_name}
                          onChange={(event) => updateVariant(variant.id, 'option_name', event.target.value)}
                          placeholder="Custom name"
                          className="mt-2 w-full rounded-xl border border-[#6d28d9]/10 bg-white px-3 py-2.5 text-sm text-[#0F1B3D] outline-none"
                        />
                      )}
                    </label>
                    <label>
                      <span className="mb-1 block text-xs text-[#6F7192]">Option Type</span>
                      <select value={variant.option_type} onChange={(event) => updateVariant(variant.id, 'option_type', event.target.value as ShopVariantOption['option_type'])} className="w-full rounded-xl border border-[#6d28d9]/10 bg-white px-3 py-2.5 text-sm text-[#0F1B3D] outline-none">
                        {optionTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </label>
                    {['toggle', 'text_input'].includes(variant.option_type) ? (
                      <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-xs text-[#6F7192]">No discrete values needed.</div>
                    ) : (
                      <TagInput
                        label="Values"
                        value={variant.values ?? []}
                        onChange={(values) => updateVariant(variant.id, 'values', values)}
                        placeholder="Type value and press Enter"
                      />
                    )}
                    <Toggle checked={variant.is_required ?? true} onChange={(checked) => updateVariant(variant.id, 'is_required', checked)} label="Required" />
                    <label>
                      <span className="mb-1 block text-xs text-[#6F7192]">Order</span>
                      <input type="number" value={variant.display_order ?? index} onChange={(event) => updateVariant(variant.id, 'display_order', Number(event.target.value))} className="w-full rounded-xl border border-[#6d28d9]/10 bg-white px-3 py-2.5 text-sm text-[#0F1B3D] outline-none" />
                    </label>
                    <button type="button" onClick={() => void deleteVariant(variant)} className="mt-6 rounded-xl border border-rose-200 p-2.5 text-rose-600 hover:bg-rose-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => void addVariant()} className="inline-flex items-center gap-2 rounded-xl border border-[#6d28d9]/20 px-4 py-2.5 text-sm font-semibold text-[#6d28d9] hover:bg-[#6d28d9]/5">
            <Plus className="h-4 w-4" />
            Add Variant Option
          </button>
          {variants.length > 0 && (
            <button type="button" onClick={() => void generateSkus()} className="inline-flex items-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5b21b6]">
              Generate SKUs →
            </button>
          )}
        </div>
      </Section>

      {skus.length > 0 && (
        <div ref={skuSectionRef}>
          <Section title="SKU Manager" description="Edit generated variants, pricing, inventory, and per-variant media.">
            <div className="flex flex-wrap gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3">
              <input value={quickPrice} onChange={(event) => setQuickPrice(event.target.value)} placeholder="Set all prices to ₹" type="number" className="rounded-xl border border-[#6d28d9]/10 bg-white px-3 py-2 text-sm outline-none" />
              <button type="button" onClick={applyQuickPrice} className="rounded-xl border border-[#6d28d9]/20 px-3 py-2 text-sm font-semibold text-[#6d28d9]">Apply price</button>
              <input value={quickStock} onChange={(event) => setQuickStock(event.target.value)} placeholder="Set all stock to" type="number" className="rounded-xl border border-[#6d28d9]/10 bg-white px-3 py-2 text-sm outline-none" />
              <button type="button" onClick={applyQuickStock} className="rounded-xl border border-[#6d28d9]/20 px-3 py-2 text-sm font-semibold text-[#6d28d9]">Apply stock</button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-gray-200">
              <table className="min-w-[1100px] w-full bg-white">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Variant Combo', 'Price', 'Compare At', 'Stock Qty', 'Low Stock', 'Weight', 'Variant Image', 'Available'].map((label) => (
                      <th key={label} className="px-3 py-3 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {skus.map((sku) => (
                    <tr key={sku.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-3 py-3 text-sm font-medium text-[#0F1B3D]">{comboLabel(sku.variant_combination)}</td>
                      <td className="px-3 py-3"><input type="number" value={sku.price} onChange={(event) => updateSku(sku.id, 'price', Number(event.target.value))} className="w-24 rounded-lg border border-gray-200 px-2 py-2 text-sm" /></td>
                      <td className="px-3 py-3"><input type="number" value={sku.compare_at_price ?? ''} onChange={(event) => updateSku(sku.id, 'compare_at_price', event.target.value ? Number(event.target.value) : null)} className="w-24 rounded-lg border border-gray-200 px-2 py-2 text-sm" /></td>
                      <td className="px-3 py-3"><input type="number" value={sku.stock_quantity} onChange={(event) => updateSku(sku.id, 'stock_quantity', Number(event.target.value))} className="w-20 rounded-lg border border-gray-200 px-2 py-2 text-sm" /></td>
                      <td className="px-3 py-3"><input type="number" value={sku.low_stock_threshold ?? 5} onChange={(event) => updateSku(sku.id, 'low_stock_threshold', Number(event.target.value))} className="w-20 rounded-lg border border-gray-200 px-2 py-2 text-sm" /></td>
                      <td className="px-3 py-3"><input type="number" value={sku.weight_grams ?? ''} onChange={(event) => updateSku(sku.id, 'weight_grams', event.target.value ? Number(event.target.value) : null)} className="w-24 rounded-lg border border-gray-200 px-2 py-2 text-sm" /></td>
                      <td className="px-3 py-3">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-2 py-2 text-xs text-[#6F7192]">
                          {sku.variant_image_url ? (
                            <span className="relative h-6 w-6 overflow-hidden rounded">
                              <Image src={sku.variant_image_url} alt="Variant" fill sizes="24px" className="object-cover" />
                            </span>
                          ) : (
                            <ImagePlus className="h-4 w-4" />
                          )}
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0]
                              if (!file) return
                              void uploadImage(file, 'variant', sku.id).catch((error) =>
                                setToast({ type: 'error', message: error instanceof Error ? error.message : 'Upload failed.' })
                              )
                            }}
                          />
                        </label>
                      </td>
                      <td className="px-3 py-3">
                        <button type="button" aria-pressed={sku.is_available ?? true} onClick={() => updateSku(sku.id, 'is_available', !(sku.is_available ?? true))} className={`relative h-6 w-11 rounded-full transition ${(sku.is_available ?? true) ? 'bg-[#6d28d9]' : 'bg-gray-200'}`}>
                          <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${(sku.is_available ?? true) ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" disabled={saving} onClick={() => void saveAllSkus()} className="rounded-xl bg-[#6d28d9] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              Save All SKUs
            </button>
          </Section>
        </div>
      )}

      <Section title="Customization" description="Allow optional personalization such as engraving or names.">
        <Toggle checked={product.is_customizable} onChange={(checked) => updateProduct('is_customizable', checked)} label="Is Customizable?" description="Adds a customer text field on the future storefront." />
        {product.is_customizable && (
          <div className="grid gap-5 lg:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[#6F7192]">Customization Label</span>
              <input value={product.customization_label} onChange={(event) => updateProduct('customization_label', event.target.value)} placeholder="Enter name for engraving" className="w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3.5 py-2.5 text-sm text-[#0F1B3D] outline-none" />
            </label>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">Preview</div>
              <label className="mt-3 block text-sm font-medium text-[#0F1B3D]">{product.customization_label || 'Enter name for engraving'}</label>
              <input disabled placeholder="Customer text appears here" className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#6F7192]" />
            </div>
          </div>
        )}
      </Section>

      <Section title="SEO & Visibility" description="Control merchandising, metadata, and archival state.">
        <div className="grid gap-5 lg:grid-cols-2">
          <Toggle checked={product.is_featured} onChange={(checked) => updateProduct('is_featured', checked)} label="Is Featured" description="Appears in the future Shop featured row." />
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[#6F7192]">Meta Title</span>
            <input value={product.meta_title} onChange={(event) => updateProduct('meta_title', event.target.value)} className="w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3.5 py-2.5 text-sm text-[#0F1B3D] outline-none" />
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-[#6F7192]">Meta Description</span>
          <textarea maxLength={160} rows={3} value={product.meta_description} onChange={(event) => updateProduct('meta_description', event.target.value)} className="w-full resize-none rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3.5 py-2.5 text-sm text-[#0F1B3D] outline-none" />
          <span className="mt-1 block text-right text-xs text-[#6F7192]">{product.meta_description.length}/160</span>
        </label>
        {product.id && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="text-sm font-semibold text-rose-700">Danger Zone</div>
            <p className="mt-1 text-sm text-rose-600">Archive hides this product without hard deleting it.</p>
            <button type="button" onClick={() => void archiveProduct()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white">
              <Archive className="h-4 w-4" />
              Archive Product
            </button>
          </div>
        )}
      </Section>
    </div>
  )
}
