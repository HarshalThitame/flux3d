'use client'

import { useCallback, useRef, useState } from 'react'
import type { ProductForm, ProductFormErrors } from '@/lib/shop/product-schema'
import { validateField, validateProduct } from '@/lib/shop/product-schema'
import type { DraftSku, DraftVariant } from './types'

const HISTORY_LIMIT = 50
const COALESCE_MS = 800

export type EditorExtras = {
  variants: DraftVariant[]
  skus: DraftSku[]
}

type Snapshot = {
  product: ProductForm
  extras?: EditorExtras
}

type HistoryEntry = Snapshot & { timestamp: number }

export function useProductForm(
  initialProduct: ProductForm,
  getExtras?: () => EditorExtras,
  onRestoreExtras?: (extras: EditorExtras) => void
) {
  const [product, setProduct] = useState<ProductForm>(initialProduct)
  const [past, setPast] = useState<HistoryEntry[]>([])
  const [future, setFuture] = useState<HistoryEntry[]>([])
  const [dirty, setDirty] = useState(false)
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<ProductFormErrors>(validateProduct(initialProduct))

  const productRef = useRef<ProductForm>(initialProduct)
  const pastRef = useRef<HistoryEntry[]>([])
  const futureRef = useRef<HistoryEntry[]>([])
  const lastUpdateAt = useRef(0)

  const buildSnapshot = useCallback((): Snapshot => {
    return { product: productRef.current, extras: getExtras?.() }
  }, [getExtras])

  const pushHistory = useCallback((snapshot: Snapshot) => {
    const now = Date.now()
    const coalesce = now - lastUpdateAt.current < COALESCE_MS && pastRef.current.length > 0
    const record: HistoryEntry = { ...snapshot, timestamp: now }
    if (coalesce) {
      pastRef.current = [...pastRef.current.slice(0, -1), record].slice(-HISTORY_LIMIT)
    } else {
      pastRef.current = [...pastRef.current, record].slice(-HISTORY_LIMIT)
    }
    lastUpdateAt.current = now
    futureRef.current = []
    setPast(pastRef.current)
    setFuture([])
  }, [])

  const applySnapshot = useCallback(
    (snapshot: Snapshot) => {
      productRef.current = snapshot.product
      setProduct(snapshot.product)
      setDirty(true)
      setErrors(validateProduct(snapshot.product))
      if (snapshot.extras) {
        onRestoreExtras?.(snapshot.extras)
      }
    },
    [onRestoreExtras]
  )

  const pushUndoPoint = useCallback(() => {
    pushHistory(buildSnapshot())
  }, [buildSnapshot, pushHistory])

  const update = useCallback(
    <K extends keyof ProductForm>(
      key: K,
      value: ProductForm[K],
      opts?: { recordHistory?: boolean; markTouched?: boolean }
    ) => {
      const current = buildSnapshot()
      if (opts?.recordHistory !== false) pushHistory(current)

      const next = { ...productRef.current, [key]: value }
      productRef.current = next
      setProduct(next)
      setDirty(true)

      const error = validateField(key, value)
      setErrors((prev) => {
        const nextErrors = { ...prev }
        if (error) nextErrors[key] = error
        else delete nextErrors[key]
        return nextErrors
      })

      if (opts?.markTouched !== false) {
        setTouched((prev) => new Set(prev).add(key))
      }
    },
    [buildSnapshot, pushHistory]
  )

  const updateMany = useCallback(
    (partial: Partial<ProductForm>, opts?: { recordHistory?: boolean; markTouched?: boolean }) => {
      const current = buildSnapshot()
      if (opts?.recordHistory !== false) pushHistory(current)

      const next = { ...productRef.current, ...partial }
      productRef.current = next
      setProduct(next)
      setDirty(true)

      setErrors((prev) => {
        const nextErrors = { ...prev }
        for (const [key, value] of Object.entries(partial) as [keyof ProductForm, ProductForm[keyof ProductForm]][]) {
          const error = validateField(key, value)
          if (error) nextErrors[key] = error
          else delete nextErrors[key]
        }
        return nextErrors
      })

      if (opts?.markTouched !== false) {
        setTouched((prev) => {
          const nextTouched = new Set(prev)
          for (const key of Object.keys(partial)) nextTouched.add(key)
          return nextTouched
        })
      }
    },
    [buildSnapshot, pushHistory]
  )

  const patchLocal = useCallback((partial: Partial<ProductForm>) => {
    const next = { ...productRef.current, ...partial }
    productRef.current = next
    setProduct(next)
    setDirty(true)
    setErrors((prev) => {
      const nextErrors = { ...prev }
      for (const [key, value] of Object.entries(partial) as [keyof ProductForm, ProductForm[keyof ProductForm]][]) {
        const error = validateField(key, value)
        if (error) nextErrors[key] = error
        else delete nextErrors[key]
      }
      return nextErrors
    })
  }, [])

  const markSaved = useCallback((next: ProductForm) => {
    productRef.current = next
    setProduct(next)
    setDirty(false)
    setErrors(validateProduct(next))
  }, [])

  const reset = useCallback((next: ProductForm) => {
    productRef.current = next
    pastRef.current = []
    futureRef.current = []
    setProduct(next)
    setPast([])
    setFuture([])
    setDirty(false)
    setTouched(new Set())
    setErrors(validateProduct(next))
  }, [])

  const markTouched = useCallback((key: keyof ProductForm) => {
    setTouched((prev) => new Set(prev).add(key))
    const value = productRef.current[key]
    const error = validateField(key, value)
    setErrors((prev) => {
      const next = { ...prev }
      if (error) next[key] = error
      else delete next[key]
      return next
    })
  }, [])

  const markAllTouched = useCallback(() => {
    setTouched((prev) => new Set([...prev, ...Object.keys(productRef.current)]))
  }, [])

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return
    const last = pastRef.current[pastRef.current.length - 1]
    const current = buildSnapshot()
    pastRef.current = pastRef.current.slice(0, -1)
    futureRef.current = [...futureRef.current, { ...current, timestamp: Date.now() }].slice(-HISTORY_LIMIT)
    setPast(pastRef.current)
    setFuture(futureRef.current)
    applySnapshot(last)
  }, [applySnapshot, buildSnapshot])

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return
    const next = futureRef.current[futureRef.current.length - 1]
    const current = buildSnapshot()
    futureRef.current = futureRef.current.slice(0, -1)
    pastRef.current = [...pastRef.current, { ...current, timestamp: Date.now() }].slice(-HISTORY_LIMIT)
    setPast(pastRef.current)
    setFuture(futureRef.current)
    applySnapshot(next)
  }, [applySnapshot, buildSnapshot])

  return {
    product,
    past,
    future,
    dirty,
    touched,
    errors,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    productRef,
    update,
    updateMany,
    patchLocal,
    pushUndoPoint,
    markSaved,
    reset,
    markTouched,
    markAllTouched,
    undo,
    redo,
    setDirty,
  }
}
