'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useRouter } from 'next/navigation'
import type { ShopCategory, ShopProduct, ShopSku, ShopVariantOption } from '@/lib/shop/admin-types'
import { slugifyShopValue, stableStringify } from '@/lib/shop/admin-types'
import type { ProductForm, ProductFormErrors } from '@/lib/shop/product-schema'
import { getPublishBlockers } from '@/lib/shop/product-schema'
import type { AiGenerationKind, AiGenerateResult, AiTone } from '@/lib/shop/ai'
import { uploadFileWithProgress } from '@/lib/shop/upload'
import type { ProductTemplate } from '@/lib/shop/templates'
import { templateLongDescription } from '@/lib/shop/templates'
import { addRevision, clearRevisions, loadRevisions, type ShopRevision } from '@/lib/shop/revisions'
import type { AdminToastState } from '@/components/admin/AdminToast'
import { useProductForm, type EditorExtras } from './useProductForm'
import {
  type DraftSku,
  type DraftVariant,
  type SaveStatus,
  type UploadState,
  buildProductPayload,
  cartesianProduct,
  emptyProduct,
  toProductForm,
} from './types'

const AUTOSAVE_DELAY = 2000

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken'

type ProductEditorContextValue = {
  mode: 'new' | 'edit'
  productId?: string
  product: ProductForm
  errors: ProductFormErrors
  touched: Set<string>
  canUndo: boolean
  canRedo: boolean
  dirty: boolean
  saving: boolean
  loading: boolean
  categories: ShopCategory[]
  slugStatus: SlugStatus
  uploadState: UploadState
  variants: DraftVariant[]
  skus: DraftSku[]
  defaultWeight: string
  skuSectionRef: RefObject<HTMLDivElement | null>
  dragImage: string | null
  dragVariant: string | null
  toast: AdminToastState
  publishBlockers: string[]
  aiTone: AiTone
  aiBusy: Partial<Record<AiGenerationKind, boolean>>

  updateProduct: <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => void
  markTouched: (key: keyof ProductForm) => void
  undo: () => void
  redo: () => void
  markSlugTouched: () => void
  saveProduct: (status?: SaveStatus) => Promise<void>
  archiveProduct: () => Promise<void>
  setToast: (toast: AdminToastState) => void
  setDragImage: (value: string | null) => void
  setDragVariant: (value: string | null) => void
  setAiTone: (tone: AiTone) => void
  generateAi: (kind: AiGenerationKind) => Promise<void>
  setDefaultWeight: (value: string) => void
  applyTemplate: (template: ProductTemplate) => Promise<void>
  duplicateProduct: () => Promise<void>
  revisions: ShopRevision[]
  restoreRevision: (timestamp: number) => Promise<void>
  clearRevisionHistory: () => void

  uploadImage: (file: File, target?: 'gallery' | 'variant', skuId?: string) => Promise<void>
  uploadModel: (file: File) => Promise<void>
  removeModel: () => void
  setThumbnail: (url: string) => void
  removeImage: (url: string) => void
  handleImageDrop: (url: string) => void
  setImageAlt: (url: string, alt: string) => void

  addVariant: () => Promise<void>
  updateVariant: <K extends keyof ShopVariantOption>(variantId: string, key: K, value: ShopVariantOption[K]) => void
  deleteVariant: (variant: DraftVariant) => Promise<void>
  reorderVariants: (targetId: string) => Promise<void>

  generateSkus: () => Promise<void>
  updateSku: <K extends keyof ShopSku>(skuId: string, key: K, value: ShopSku[K]) => void
  bulkUpdateSkus: (partial: Partial<ShopSku>, ids?: string[]) => void
  saveAllSkus: () => Promise<void>
}

const ProductEditorContext = createContext<ProductEditorContextValue | null>(null)

export function useProductEditor() {
  const context = useContext(ProductEditorContext)
  if (!context) throw new Error('useProductEditor must be used within ProductEditorProvider')
  return context
}

export function ProductEditorProvider({
  mode,
  productId,
  children,
}: {
  mode: 'new' | 'edit'
  productId?: string
  children: ReactNode
}) {
  const router = useRouter()
  const [categories, setCategories] = useState<ShopCategory[]>([])
  const [variants, setVariants] = useState<DraftVariant[]>([])
  const [skus, setSkus] = useState<DraftSku[]>([])
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle')
  const [uploadState, setUploadState] = useState<UploadState>({})
  const [dragImage, setDragImage] = useState<string | null>(null)
  const [dragVariant, setDragVariant] = useState<string | null>(null)
  const [defaultWeight, setDefaultWeight] = useState('')
  const [toast, setToast] = useState<AdminToastState>(null)
  const [aiTone, setAiTone] = useState<AiTone>('professional')
  const [aiBusy, setAiBusy] = useState<Partial<Record<AiGenerationKind, boolean>>>({})
  const [revisions, setRevisions] = useState<ShopRevision[]>([])
  const skuSectionRef = useRef<HTMLDivElement | null>(null)

  const slugTouchedRef = useRef(mode === 'edit')
  const savingRef = useRef(false)
  const autosaveTimerRef = useRef<number | null>(null)
  const variantsRef = useRef<DraftVariant[]>([])
  const skusRef = useRef<DraftSku[]>([])

  useEffect(() => {
    variantsRef.current = variants
    skusRef.current = skus
  }, [variants, skus])

  const getEditorExtras = useCallback<() => EditorExtras>(
    () => ({ variants: variantsRef.current, skus: skusRef.current }),
    []
  )
  const restoreEditorExtras = useCallback((extras: EditorExtras) => {
    setVariants(extras.variants.map((variant) => ({ ...variant, dirty: true })))
    setSkus(extras.skus.map((sku) => ({ ...sku, dirty: true })))
  }, [])

  const form = useProductForm(emptyProduct, getEditorExtras, restoreEditorExtras)

  const publishBlockers = getPublishBlockers(form.product)

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
        form.reset(toProductForm(productData.product))
        setRevisions(loadRevisions(productId))
        await Promise.all([loadVariants(productId), loadSkus(productId)])
      }
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load product.' })
    } finally {
      setLoading(false)
    }
  }, [form, loadSkus, loadVariants, mode, productId])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadInitialData()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [loadInitialData])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!form.dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [form.dirty])

  const updateProduct = useCallback(
    <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
      if (key === 'name' && !slugTouchedRef.current) {
        form.updateMany({ name: value as string, slug: slugifyShopValue(String(value)) })
      } else {
        form.update(key, value)
      }
    },
    [form]
  )

  const checkSlug = useCallback(async (slug: string, id?: string) => {
    if (!slug) return
    setSlugStatus('checking')
    const params = new URLSearchParams({ slug })
    if (id) params.set('exclude_id', id)
    const response = await fetch(`/api/3d-shop/admin/products?${params.toString()}`)
    const data = (await response.json().catch(() => ({}))) as { available?: boolean }
    setSlugStatus(data.available ? 'available' : 'taken')
  }, [])

  const slugCheckTimerRef = useRef<number | null>(null)
  useEffect(() => {
    const slug = form.product.slug
    if (!slug) return
    if (slugCheckTimerRef.current) window.clearTimeout(slugCheckTimerRef.current)
    slugCheckTimerRef.current = window.setTimeout(() => {
      void checkSlug(slug, form.product.id)
    }, 500)
    return () => {
      if (slugCheckTimerRef.current) window.clearTimeout(slugCheckTimerRef.current)
    }
  }, [form.product.slug, form.product.id, checkSlug])

  const ensureProductId = useCallback(async () => {
    const current = form.productRef.current
    if (current.id) return current.id
    if (!current.name.trim()) throw new Error('Add a product name before saving.')
    if (!current.slug.trim()) throw new Error('Add a product slug before saving.')

    const response = await fetch('/api/3d-shop/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildProductPayload(current, 'draft')),
    })
    const data = (await response.json()) as { product?: ShopProduct; error?: string }
    if (!response.ok || !data.product) throw new Error(data.error || 'Failed to create product.')

    form.markSaved(toProductForm(data.product))
    slugTouchedRef.current = true
    setRevisions(loadRevisions(data.product.id))
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/admin/3d-shop/products/${data.product.id}/edit`)
    }
    return data.product.id
  }, [form])

  const saveAllVariants = useCallback(async () => {
    const id = form.productRef.current.id
    if (!id) return
    const dirtyVariants = variantsRef.current.filter((variant) => variant.dirty)
    if (dirtyVariants.length === 0) return
    await Promise.all(
      dirtyVariants.map(async (variant) => {
        const { dirty: _discard, ...payload } = variant
        void _discard
        let response = await fetch(`/api/3d-shop/admin/products/${id}/variants`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!response.ok) {
          response = await fetch(`/api/3d-shop/admin/products/${id}/variants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        }
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        if (!response.ok) throw new Error(data.error || 'Failed to save variant option.')
      })
    )
    setVariants((current) => current.map((variant) => ({ ...variant, dirty: false })))
  }, [form])

  const saveAllSkus = useCallback(async () => {
    const id = form.productRef.current.id
    if (!id) return
    const dirtySkus = skusRef.current.filter((sku) => sku.dirty)
    if (dirtySkus.length === 0) return
    await Promise.all(
      dirtySkus.map(async (sku) => {
        const { dirty: _discard, ...payload } = sku
        void _discard
        let response = await fetch(`/api/3d-shop/admin/products/${id}/skus`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!response.ok) {
          response = await fetch(`/api/3d-shop/admin/products/${id}/skus`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skus: [payload] }),
          })
        }
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        if (!response.ok) throw new Error(data.error || 'Failed to save SKU.')
      })
    )
    setSkus((current) => current.map((sku) => ({ ...sku, dirty: false })))
    const availablePrices = skusRef.current
      .filter((sku) => sku.is_available !== false)
      .map((sku) => Number(sku.price))
      .filter(Number.isFinite)
    if (availablePrices.length > 0) {
      form.patchLocal({ base_price: Math.min(...availablePrices) })
    }
  }, [form])

  const captureRevision = useCallback(
    (productId: string) => {
      const revision: ShopRevision = {
        timestamp: Date.now(),
        product: form.productRef.current,
        variants: variantsRef.current.map((variant) => {
          const { dirty: _discard, ...rest } = variant
          void _discard
          return rest
        }),
        skus: skusRef.current.map((sku) => {
          const { dirty: _discard, ...rest } = sku
          void _discard
          return rest
        }),
      }
      setRevisions(addRevision(productId, revision))
    },
    [form]
  )

  const persist = useCallback(
    async (status?: SaveStatus, opts?: { silent?: boolean }) => {
      if (savingRef.current) return { ok: false }
      savingRef.current = true
      setSaving(true)
      try {
        const current = form.productRef.current
        if (!current.name.trim()) throw new Error('Add a product name before saving.')

        const id = await ensureProductId()

        const response = await fetch('/api/3d-shop/admin/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...buildProductPayload(form.productRef.current, status), id }),
        })
        const data = (await response.json()) as { product?: ShopProduct; error?: string }
        if (!response.ok || !data.product) throw new Error(data.error || 'Failed to save product.')

        form.markSaved(toProductForm(data.product))
        form.setDirty(true)
        await saveAllVariants()
        await saveAllSkus()
        form.markSaved(form.productRef.current)
        captureRevision(id)

        if (!opts?.silent) {
          setToast({ type: 'success', message: status === 'publish' ? 'Product published.' : 'Product saved.' })
        }
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save product.'
        if (!opts?.silent) setToast({ type: 'error', message })
        return { ok: false, error: message }
      } finally {
        savingRef.current = false
        setSaving(false)
      }
    },
    [captureRevision, ensureProductId, form, saveAllSkus, saveAllVariants]
  )

  const saveProduct = useCallback(
    async (status?: SaveStatus) => {
      if (status === 'publish') {
        const blockers = getPublishBlockers(form.productRef.current)
        if (blockers.length > 0) {
          form.markAllTouched()
          setToast({ type: 'error', message: `Publish blocked: ${blockers.join(' · ')}` })
          await persist('draft', { silent: true })
          return
        }
      }
      await persist(status)
    },
    [form, persist]
  )

  const applyAiResult = useCallback(
    (kind: AiGenerationKind, result: AiGenerateResult) => {
      const cleanString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
      switch (kind) {
        case 'short_description':
          form.update('description', cleanString(result))
          break
        case 'long_description':
          form.update('long_description', cleanString(result))
          break
        case 'meta_title':
          form.update('meta_title', cleanString(result).slice(0, 60))
          break
        case 'meta_description':
          form.update('meta_description', cleanString(result).slice(0, 160))
          break
        case 'tags':
          form.update('tags', Array.isArray(result) ? result.slice(0, 12) : [])
          break
        case 'occasion_tags':
          form.update('occasion_tags', Array.isArray(result) ? result.slice(0, 12) : [])
          break
        case 'all': {
          const all = result as Extract<AiGenerateResult, Record<string, unknown>>
          form.updateMany({
            description: cleanString(all.short_description).slice(0, 200),
            long_description: cleanString(all.long_description),
            meta_title: cleanString(all.meta_title).slice(0, 60),
            meta_description: cleanString(all.meta_description).slice(0, 160),
            tags: Array.isArray(all.tags) ? all.tags.slice(0, 12) : [],
            occasion_tags: Array.isArray(all.occasion_tags) ? all.occasion_tags.slice(0, 12) : [],
          })
          break
        }
      }
    },
    [form]
  )

  const generateAi = useCallback(
    async (kind: AiGenerationKind) => {
      const current = form.productRef.current
      if (!current.name.trim()) {
        setToast({ type: 'error', message: 'Add a product name first so AI has context.' })
        return
      }
      setAiBusy((prev) => ({ ...prev, [kind]: true }))
      try {
        const categoryName = categories.find((category) => category.id === current.category_id)?.name ?? ''
        const response = await fetch('/api/3d-shop/admin/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind,
            name: current.name,
            category: categoryName,
            description: current.description,
            tags: current.tags,
            occasion_tags: current.occasion_tags,
            tone: aiTone,
            existing: kind === 'long_description' ? current.long_description : undefined,
          }),
        })
        const data = (await response.json().catch(() => ({}))) as { result?: AiGenerateResult; error?: string }
        if (!response.ok || data.result === undefined) throw new Error(data.error || 'AI generation failed.')
        applyAiResult(kind, data.result)
        setToast({ type: 'success', message: 'AI copy generated.' })
      } catch (error) {
        setToast({ type: 'error', message: error instanceof Error ? error.message : 'AI generation failed.' })
      } finally {
        setAiBusy((prev) => ({ ...prev, [kind]: false }))
      }
    },
    [aiTone, applyAiResult, categories, form]
  )

  const applyTemplate = useCallback(
    async (template: ProductTemplate) => {
      const hasExisting = variantsRef.current.length > 0 || skusRef.current.length > 0
      if (hasExisting && !window.confirm('Applying a template will replace current variant options and SKUs. Continue?')) return
      try {
        const id = await ensureProductId()
        if (hasExisting) {
          for (const sku of skusRef.current) {
            await fetch(`/api/3d-shop/admin/products/${id}/skus?id=${sku.id}`, { method: 'DELETE' })
          }
          for (const variant of variantsRef.current) {
            await fetch(`/api/3d-shop/admin/products/${id}/variants?id=${variant.id}`, { method: 'DELETE' })
          }
          setSkus([])
          setVariants([])
        }

        const currentName = form.productRef.current.name.trim() || template.name
        const updates: Partial<ProductForm> = {
          name: currentName,
          description: template.short_description,
          long_description: templateLongDescription(template, currentName),
          tags: template.tags,
          occasion_tags: template.occasion_tags,
          is_customizable: template.is_customizable,
          customization_label: template.customization_label,
        }
        if (!slugTouchedRef.current) updates.slug = slugifyShopValue(currentName)
        form.updateMany(updates)

        const created: DraftVariant[] = []
        for (let index = 0; index < template.variants.length; index += 1) {
          const variant = template.variants[index]
          const response = await fetch(`/api/3d-shop/admin/products/${id}/variants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              option_name: variant.option_name,
              option_type: variant.option_type,
              values: variant.values,
              display_order: index,
              is_required: variant.is_required,
            }),
          })
          const data = (await response.json()) as { variant?: ShopVariantOption; error?: string }
          if (!response.ok || !data.variant) throw new Error(data.error || 'Failed to apply template variant.')
          created.push(data.variant as DraftVariant)
        }
        setVariants(created)
        setToast({
          type: 'success',
          message: `Template "${template.name}" applied. Add images, then generate SKUs to finish.`,
        })
      } catch (error) {
        setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to apply template.' })
      }
    },
    [ensureProductId, form]
  )

  const duplicateProduct = useCallback(async () => {
    const current = form.productRef.current
    if (!current.name.trim()) {
      setToast({ type: 'error', message: 'Add a product name before duplicating.' })
      return
    }
    try {
      const copyName = `${current.name.trim()} Copy`
      const baseSlug = slugifyShopValue(copyName)
      let slug = baseSlug
      let suffix = 2
      const slugExists = async (candidate: string) => {
        const res = await fetch(`/api/3d-shop/admin/products?slug=${encodeURIComponent(candidate)}`)
        const data = (await res.json().catch(() => ({}))) as { available?: boolean }
        return data.available === false
      }
      while (await slugExists(slug)) {
        slug = `${baseSlug}-${suffix}`
        suffix += 1
      }

      const payload = buildProductPayload({
        ...current,
        name: copyName,
        slug,
        is_active: false,
        is_archived: false,
        is_featured: false,
        published_at: null,
      })
      delete payload.id

      const response = await fetch('/api/3d-shop/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = (await response.json()) as { product?: ShopProduct; error?: string }
      if (!response.ok || !data.product) throw new Error(data.error || 'Failed to duplicate product.')
      const newId = data.product.id

      for (let index = 0; index < variantsRef.current.length; index += 1) {
        const variant = variantsRef.current[index]
        const res = await fetch(`/api/3d-shop/admin/products/${newId}/variants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            option_name: variant.option_name,
            option_type: variant.option_type,
            values: variant.values ?? [],
            display_order: variant.display_order ?? index,
            is_required: variant.is_required ?? true,
          }),
        })
        const vData = (await res.json()) as { error?: string }
        if (!res.ok) throw new Error(vData.error || 'Failed to duplicate variants.')
      }

      const skuRows = skusRef.current.map((sku, index) => ({
        sku_code: `${slug.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-${Date.now().toString(36).toUpperCase()}-${index + 1}`,
        variant_combination: sku.variant_combination,
        price: sku.price,
        compare_at_price: sku.compare_at_price,
        stock_quantity: sku.stock_quantity,
        low_stock_threshold: sku.low_stock_threshold,
        weight_grams: sku.weight_grams,
        variant_image_url: sku.variant_image_url,
        is_available: sku.is_available,
      }))
      if (skuRows.length > 0) {
        const res = await fetch(`/api/3d-shop/admin/products/${newId}/skus`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skus: skuRows }),
        })
        const sData = (await res.json()) as { error?: string }
        if (!res.ok) throw new Error(sData.error || 'Failed to duplicate SKUs.')
      }

      setToast({ type: 'success', message: 'Product duplicated. Opening the copy…' })
      router.push(`/admin/3d-shop/products/${newId}/edit`)
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to duplicate product.' })
    }
  }, [form, router])

  const restoreRevision = useCallback(
    async (timestamp: number) => {
      const target = revisions.find((revision) => revision.timestamp === timestamp)
      if (!target) return
      if (!window.confirm('Restore this version? Your current changes will be replaced by the snapshot.')) return
      try {
        form.updateMany(target.product)
        setVariants(target.variants.map((variant) => ({ ...variant, dirty: true })))
        setSkus(target.skus.map((sku) => ({ ...sku, dirty: true })))
        setToast({ type: 'info', message: 'Snapshot restored — saving…' })
        await persist('draft')
      } catch (error) {
        setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to restore version.' })
      }
    },
    [form, persist, revisions]
  )

  const clearRevisionHistory = useCallback(() => {
    const id = form.productRef.current.id
    if (!id) return
    if (!window.confirm('Clear all saved revisions for this product?')) return
    clearRevisions(id)
    setRevisions([])
    setToast({ type: 'success', message: 'Revision history cleared.' })
  }, [form])

  useEffect(() => {
    if (!form.dirty) return
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = window.setTimeout(() => {
      void persist('draft', { silent: true })
    }, AUTOSAVE_DELAY)
    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    }
  }, [form.dirty, form.product, persist])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isEditable =
        target?.isContentEditable === true ||
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT'

      const mod = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()

      if (mod && key === 's') {
        event.preventDefault()
        void saveProduct('draft')
        return
      }
      if (mod && event.shiftKey && key === 'p') {
        event.preventDefault()
        void saveProduct('publish')
        return
      }
      if (!isEditable && mod && key === 'z') {
        event.preventDefault()
        if (event.shiftKey) form.redo()
        else form.undo()
        return
      }
      if (!isEditable && mod && key === 'y') {
        event.preventDefault()
        form.redo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [form, saveProduct])

  const uploadImage = useCallback(
    async (file: File, target: 'gallery' | 'variant' = 'gallery', skuId?: string) => {
      const id = await ensureProductId()
      const tempKey = `${file.name}-${Date.now()}`
      setUploadState((current) => ({ ...current, [tempKey]: { status: 'uploading', progress: 0 } }))
      try {
        const { publicUrl } = await uploadFileWithProgress('/api/3d-shop/admin/upload', file, id, (progress) => {
          setUploadState((current) => ({ ...current, [tempKey]: { status: 'uploading', progress } }))
        })
        setUploadState((current) => ({ ...current, [tempKey]: { status: 'done', progress: 100 } }))

        if (target === 'variant' && skuId) {
          form.pushUndoPoint()
          setSkus((current) =>
            current.map((sku) => (sku.id === skuId ? { ...sku, variant_image_url: publicUrl, dirty: true } : sku))
          )
          form.setDirty(true)
          return
        }

        const current = form.productRef.current
        const hasThumbnail = Boolean(current.thumbnail_url)
        const partial = hasThumbnail
          ? { image_urls: [...current.image_urls, publicUrl] }
          : { thumbnail_url: publicUrl }
        form.patchLocal(partial)

        const productResponse = await fetch('/api/3d-shop/admin/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...buildProductPayload({ ...current, ...partial }, undefined), id }),
        }).catch(() => null)
        if (!productResponse?.ok) {
          throw new Error('Upload succeeded but failed to attach image to product. It will be saved by autosave.')
        }
      } catch (error) {
        setUploadState((current) => ({ ...current, [tempKey]: { status: 'error', progress: 0 } }))
        throw error
      }
    },
    [ensureProductId, form]
  )

  const uploadModel = useCallback(
    async (file: File) => {
      const id = await ensureProductId()
      const tempKey = `model-${file.name}-${Date.now()}`
      setUploadState((current) => ({ ...current, [tempKey]: { status: 'uploading', progress: 0 } }))
      try {
        const { publicUrl } = await uploadFileWithProgress('/api/3d-shop/admin/models/upload', file, id, (progress) => {
          setUploadState((current) => ({ ...current, [tempKey]: { status: 'uploading', progress } }))
        })
        setUploadState((current) => ({ ...current, [tempKey]: { status: 'done', progress: 100 } }))
        updateProduct('model_url', publicUrl)
      } catch (error) {
        setUploadState((current) => ({ ...current, [tempKey]: { status: 'error', progress: 0 } }))
        throw error
      }
    },
    [ensureProductId, updateProduct]
  )

  const removeModel = useCallback(() => {
    updateProduct('model_url', '')
  }, [updateProduct])

  const setThumbnail = useCallback(
    (url: string) => {
      form.updateMany({
        thumbnail_url: url,
        image_urls: [form.productRef.current.thumbnail_url, ...form.productRef.current.image_urls]
          .filter((item) => item !== url)
          .filter(Boolean),
      })
    },
    [form]
  )

  const removeImage = useCallback(
    (url: string) => {
      const images = [form.productRef.current.thumbnail_url, ...form.productRef.current.image_urls]
        .filter((item) => item && item !== url) as string[]
      const imageAlt = { ...form.productRef.current.image_alt }
      delete imageAlt[url]
      form.updateMany({
        thumbnail_url: images[0] ?? '',
        image_urls: images.slice(1),
        image_alt: imageAlt,
      })
    },
    [form]
  )

  const setImageAlt = useCallback(
    (url: string, alt: string) => {
      const trimmed = alt.trim()
      const imageAlt = { ...form.productRef.current.image_alt }
      if (trimmed) imageAlt[url] = trimmed
      else delete imageAlt[url]
      form.update('image_alt', imageAlt)
    },
    [form]
  )

  const handleImageDrop = useCallback(
    (targetUrl: string) => {
      if (!dragImage || dragImage === targetUrl) return
      const images = [form.productRef.current.thumbnail_url, ...form.productRef.current.image_urls].filter(Boolean)
      const from = images.indexOf(dragImage)
      const to = images.indexOf(targetUrl)
      if (from < 0 || to < 0) return
      const [moved] = images.splice(from, 1)
      images.splice(to, 0, moved)
      form.updateMany({ thumbnail_url: images[0] ?? '', image_urls: images.slice(1) })
      setDragImage(null)
    },
    [dragImage, form]
  )

  const addVariant = useCallback(async () => {
    try {
      const id = await ensureProductId()
      form.pushUndoPoint()
      const response = await fetch(`/api/3d-shop/admin/products/${id}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          option_name: 'Size',
          option_type: 'button',
          values: [],
          display_order: variantsRef.current.length,
          is_required: true,
        }),
      })
      const data = (await response.json()) as { variant?: ShopVariantOption; error?: string }
      if (!response.ok || !data.variant) throw new Error(data.error || 'Failed to add variant.')
      setVariants((current) => [...current, data.variant as DraftVariant])
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to add variant.' })
    }
  }, [ensureProductId, form])

  const updateVariant = useCallback(
    <K extends keyof ShopVariantOption>(variantId: string, key: K, value: ShopVariantOption[K]) => {
      form.pushUndoPoint()
      setVariants((current) =>
        current.map((variant) => (variant.id === variantId ? { ...variant, [key]: value, dirty: true } : variant))
      )
      form.setDirty(true)
    },
    [form]
  )

  const deleteVariant = useCallback(
    async (variant: DraftVariant) => {
      const id = form.productRef.current.id
      if (!id || !window.confirm(`Delete variant option "${variant.option_name}"?`)) return
      form.pushUndoPoint()
      const response = await fetch(`/api/3d-shop/admin/products/${id}/variants?id=${variant.id}`, { method: 'DELETE' })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        setToast({ type: 'error', message: data.error || 'Failed to delete variant.' })
        return
      }
      setVariants((current) => current.filter((item) => item.id !== variant.id))
    },
    [form]
  )

  const reorderVariants = useCallback(
    async (targetId: string) => {
      const id = form.productRef.current.id
      if (!dragVariant || dragVariant === targetId || !id) return
      const current = [...variantsRef.current]
      const from = current.findIndex((variant) => variant.id === dragVariant)
      const to = current.findIndex((variant) => variant.id === targetId)
      if (from < 0 || to < 0) return
      form.pushUndoPoint()
      const [moved] = current.splice(from, 1)
      current.splice(to, 0, moved)
      const ordered = current.map((variant, index) => ({ ...variant, display_order: index }))
      setVariants(ordered)
      setDragVariant(null)
      const response = await fetch(`/api/3d-shop/admin/products/${id}/variants`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: ordered.map((variant) => ({ id: variant.id, display_order: variant.display_order ?? 0 })) }),
      })
      if (!response.ok) setToast({ type: 'error', message: 'Failed to save variant order.' })
    },
    [dragVariant, form]
  )

  const generateSkus = useCallback(async () => {
    try {
      const id = await ensureProductId()
      await saveAllVariants()
      const discreteOptions = variantsRef.current
        .filter((variant) => !['toggle', 'text_input'].includes(variant.option_type))
        .map((variant) => ({ name: variant.option_name, values: (variant.values ?? []).filter(Boolean) }))
        .filter((variant) => variant.values.length > 0)

      const combinations = cartesianProduct(discreteOptions)
      if (!window.confirm(`This will generate ${combinations.length} SKU combination${combinations.length === 1 ? '' : 's'}. Continue?`))
        return
      form.pushUndoPoint()

      const product = form.productRef.current
      const existingKeys = new Set(skusRef.current.map((sku) => stableStringify(sku.variant_combination)))
      const rows = combinations
        .filter((combo) => !existingKeys.has(stableStringify(combo)))
        .map((combo, index) => ({
          sku_code: `${product.slug.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-${Date.now().toString(36).toUpperCase()}-${index + 1}`,
          variant_combination: combo,
          price: product.base_price || 0,
          stock_quantity: 0,
          low_stock_threshold: 5,
          weight_grams: defaultWeight ? Number(defaultWeight) || null : null,
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
      setToast({
        type: 'success',
        message: `Generated ${data.inserted ?? 0} SKU${data.inserted === 1 ? '' : 's'}. Skipped ${data.skipped ?? 0}.`,
      })
      window.setTimeout(() => skuSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to generate SKUs.' })
    }
  }, [defaultWeight, ensureProductId, form, saveAllVariants])

  const syncBasePriceFromSkus = useCallback(
    (rows: ShopSku[]) => {
      const prices = rows
        .filter((sku) => sku.is_available !== false)
        .map((sku) => Number(sku.price))
        .filter(Number.isFinite)
      if (prices.length > 0) form.patchLocal({ base_price: Math.min(...prices) })
    },
    [form]
  )

  const updateSku = useCallback(
    <K extends keyof ShopSku>(skuId: string, key: K, value: ShopSku[K]) => {
      form.pushUndoPoint()
      setSkus((current) => current.map((sku) => (sku.id === skuId ? { ...sku, [key]: value, dirty: true } : sku)))
      if (key === 'price' || key === 'is_available') {
        syncBasePriceFromSkus(skusRef.current.map((sku) => (sku.id === skuId ? { ...sku, [key]: value } : sku)))
      }
      form.setDirty(true)
    },
    [form, syncBasePriceFromSkus]
  )

  const bulkUpdateSkus = useCallback(
    (partial: Partial<ShopSku>, ids?: string[]) => {
      form.pushUndoPoint()
      const targetIds = ids && ids.length > 0 ? new Set(ids) : null
      setSkus((current) =>
        current.map((sku) => (targetIds && !targetIds.has(sku.id) ? sku : { ...sku, ...partial, dirty: true }))
      )
      if ('price' in partial || 'is_available' in partial) {
        const updated = skusRef.current.map((sku) =>
          targetIds && !targetIds.has(sku.id) ? sku : { ...sku, ...partial }
        )
        syncBasePriceFromSkus(updated)
      }
      form.setDirty(true)
    },
    [form, syncBasePriceFromSkus]
  )

  const saveAllSkusWithToast = useCallback(async () => {
    try {
      await saveAllSkus()
      setToast({ type: 'success', message: 'SKUs saved.' })
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to save SKUs.' })
    }
  }, [saveAllSkus])

  const archiveProduct = useCallback(async () => {
    const id = form.productRef.current.id
    if (!id || !window.confirm('Archive this product?')) return
    const response = await fetch(`/api/3d-shop/admin/products?id=${id}`, { method: 'DELETE' })
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    if (!response.ok) {
      setToast({ type: 'error', message: data.error || 'Failed to archive product.' })
      return
    }
    setToast({ type: 'success', message: 'Product archived.' })
    window.setTimeout(() => {
      router.push('/admin/3d-shop/products')
    }, 300)
  }, [form, router])

  const value: ProductEditorContextValue = {
    mode,
    productId,
    product: form.product,
    errors: form.errors,
    touched: form.touched,
    canUndo: form.canUndo,
    canRedo: form.canRedo,
    dirty: form.dirty,
    saving,
    loading,
    categories,
    slugStatus: form.product.slug ? slugStatus : 'idle',
    uploadState,
    variants,
    skus,
    defaultWeight,
    skuSectionRef,
    dragImage,
    dragVariant,
    toast,
    publishBlockers,
    aiTone,
    aiBusy,
    updateProduct,
    markTouched: form.markTouched,
    undo: form.undo,
    redo: form.redo,
    markSlugTouched: () => {
      slugTouchedRef.current = true
    },
    saveProduct,
    archiveProduct,
    setToast,
    setDragImage,
    setDragVariant,
    setAiTone,
    generateAi,
    setDefaultWeight,
    applyTemplate,
    duplicateProduct,
    revisions,
    restoreRevision,
    clearRevisionHistory,
    uploadImage,
    uploadModel,
    removeModel,
    setThumbnail,
    removeImage,
    handleImageDrop,
    setImageAlt,
    addVariant,
    updateVariant,
    deleteVariant,
    reorderVariants,
    generateSkus,
    updateSku,
    bulkUpdateSkus,
    saveAllSkus: saveAllSkusWithToast,
  }

  return <ProductEditorContext.Provider value={value}>{children}</ProductEditorContext.Provider>
}
