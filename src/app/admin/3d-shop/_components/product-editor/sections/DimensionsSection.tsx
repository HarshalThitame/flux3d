'use client'

import { useMemo } from 'react'
import { Ruler, Trash2 } from 'lucide-react'
import { useProductEditor } from '../editor-context'
import { Section } from '../ui'
import {
  DIMENSION_UNITS,
  WEIGHT_UNITS,
  convertLength,
  convertWeight,
  emptyDimensions,
  withComputedVolume,
} from '@/lib/shop/dimensions'
import type { DimensionUnit, ProductDimensions, WeightUnit } from '@/lib/shop/admin-types'

function sizeInputClass() {
  return 'w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/40'
}

function lengthToBase(value: number | null, unit: DimensionUnit): number | null {
  if (value === null) return null
  const converted = value * (unit === 'mm' ? 1 : unit === 'cm' ? 10 : 25.4)
  return Number(converted.toFixed(2))
}

function weightToBase(value: number | null, unit: WeightUnit): number | null {
  if (value === null) return null
  const converted = value * (unit === 'g' ? 1 : unit === 'kg' ? 1000 : unit === 'oz' ? 28.3495 : 453.592)
  return Number(converted.toFixed(2))
}

type DimensionRow = {
  key: string
  option_name: string
  option_value: string
  id: string
  dimensions: ProductDimensions
}

export function DimensionsSection() {
  const {
    product,
    variants,
    variantDimensions,
    updateProduct,
    updateVariantDimension,
    deleteVariantDimension,
    applyDefaultDimensionsToUnset,
  } = useProductEditor()

  const defaults = useMemo(
    () => (product.default_dimensions ? { ...product.default_dimensions } : emptyDimensions('cm', 'g')),
    [product.default_dimensions]
  )

  const rows = useMemo<DimensionRow[]>(() => {
    const existing = new Map(variantDimensions.map((entry) => [`${entry.option_name}\u0000${entry.option_value}`, entry]))
    const out: DimensionRow[] = []
    for (const variant of variants) {
      if (!['toggle', 'text_input'].includes(variant.option_type)) {
        for (const value of variant.values ?? []) {
          const entry = existing.get(`${variant.option_name}\u0000${value}`)
          out.push({
            key: `${variant.option_name}\u0000${value}`,
            option_name: variant.option_name,
            option_value: value,
            id: entry?.id ?? '',
            dimensions: entry?.dimensions ?? emptyDimensions(defaults.dimension_unit, defaults.weight_unit),
          })
        }
      }
    }
    return out
  }, [variants, variantDimensions, defaults.dimension_unit, defaults.weight_unit])

  const hasVariants = variants.some((variant) => !['toggle', 'text_input'].includes(variant.option_type))

  function setDefaultDimensions(partial: Partial<ProductDimensions>) {
    updateProduct('default_dimensions', withComputedVolume({ ...defaults, ...partial }))
  }

  function setDefaultUnits(dimension_unit: DimensionUnit, weight_unit: WeightUnit) {
    setDefaultDimensions({ dimension_unit, weight_unit })
  }

  function setRowDimension(row: DimensionRow, axis: 'length_mm' | 'width_mm' | 'height_mm', value: string) {
    const raw = value === '' ? null : Number(value)
    updateVariantDimension(row.option_name, row.option_value, {
      ...row.dimensions,
      [axis]: raw !== null && Number.isFinite(raw) ? lengthToBase(raw, row.dimensions.dimension_unit) : null,
    })
  }

  function setRowWeight(row: DimensionRow, value: string) {
    const raw = value === '' ? null : Number(value)
    updateVariantDimension(row.option_name, row.option_value, {
      ...row.dimensions,
      weight_g: raw !== null && Number.isFinite(raw) ? weightToBase(raw, row.dimensions.weight_unit) : null,
    })
  }

  function setRowUnits(row: DimensionRow, dimension_unit: DimensionUnit, weight_unit: WeightUnit) {
    updateVariantDimension(row.option_name, row.option_value, {
      ...row.dimensions,
      dimension_unit,
      weight_unit,
    })
  }

  const defaultSizeInputs = {
    length: convertLength(defaults.length_mm, defaults.dimension_unit),
    width: convertLength(defaults.width_mm, defaults.dimension_unit),
    height: convertLength(defaults.height_mm, defaults.dimension_unit),
  }

  return (
    <Section title="Dimensions" description="Set physical size and weight — stores in mm/g, displays in your units.">
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-2">
          <Ruler className="h-4 w-4 text-[#6d28d9]" />
          <h3 className="text-sm font-semibold text-[#0F1B3D]">Default Product Dimensions</h3>
          <span className="ml-auto text-xs text-[#6F7192]">Fallback for all variants without specific dimensions</span>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-10">
          <label className="block lg:col-span-1">
            <span className="mb-1 block text-xs text-[#6F7192]">Length</span>
            <input
              type="number"
              min={0}
              value={defaultSizeInputs.length ?? ''}
              onChange={(event) =>
                setDefaultDimensions({
                  length_mm:
                    event.target.value === '' ? null : lengthToBase(Number(event.target.value), defaults.dimension_unit),
                })
              }
              placeholder="—"
              className={sizeInputClass()}
            />
          </label>
          <label className="block lg:col-span-1">
            <span className="mb-1 block text-xs text-[#6F7192]">Width</span>
            <input
              type="number"
              min={0}
              value={defaultSizeInputs.width ?? ''}
              onChange={(event) =>
                setDefaultDimensions({
                  width_mm:
                    event.target.value === '' ? null : lengthToBase(Number(event.target.value), defaults.dimension_unit),
                })
              }
              placeholder="—"
              className={sizeInputClass()}
            />
          </label>
          <label className="block lg:col-span-1">
            <span className="mb-1 block text-xs text-[#6F7192]">Height</span>
            <input
              type="number"
              min={0}
              value={defaultSizeInputs.height ?? ''}
              onChange={(event) =>
                setDefaultDimensions({
                  height_mm:
                    event.target.value === '' ? null : lengthToBase(Number(event.target.value), defaults.dimension_unit),
                })
              }
              placeholder="—"
              className={sizeInputClass()}
            />
          </label>
          <label className="block lg:col-span-1">
            <span className="mb-1 block text-xs text-[#6F7192]">Weight</span>
            <input
              type="number"
              min={0}
              value={defaults.weight_g ?? ''}
              onChange={(event) =>
                setDefaultDimensions({
                  weight_g:
                    event.target.value === '' ? null : weightToBase(Number(event.target.value), defaults.weight_unit),
                })
              }
              placeholder="—"
              className={sizeInputClass()}
            />
          </label>
          <label className="block lg:col-span-2">
            <span className="mb-1 block text-xs text-[#6F7192]">Length Unit</span>
            <select
              value={defaults.dimension_unit}
              onChange={(event) => setDefaultUnits(event.target.value as DimensionUnit, defaults.weight_unit)}
              className={sizeInputClass()}
            >
              {DIMENSION_UNITS.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block lg:col-span-2">
            <span className="mb-1 block text-xs text-[#6F7192]">Weight Unit</span>
            <select
              value={defaults.weight_unit}
              onChange={(event) => setDefaultUnits(defaults.dimension_unit, event.target.value as WeightUnit)}
              className={sizeInputClass()}
            >
              {WEIGHT_UNITS.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block lg:col-span-1">
            <span className="mb-1 block text-xs text-[#6F7192]">Volume (auto)</span>
            <input
              type="text"
              readOnly
              value={defaults.volume_cc != null ? `${defaults.volume_cc} cc` : '—'}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#6F7192]"
            />
          </label>
        </div>
      </div>

      {hasVariants ? (
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#0F1B3D]">Variant Option Dimensions</h3>
            <button
              type="button"
              onClick={applyDefaultDimensionsToUnset}
              className="rounded-xl border border-[#6d28d9]/20 px-3 py-1.5 text-xs font-semibold text-[#6d28d9] hover:bg-[#6d28d9]/5"
            >
              Apply defaults to unset
            </button>
          </div>
          <p className="mt-1 text-xs text-[#6F7192]">
            Dimensions here override the default for every SKU that includes the option value.
          </p>
          <div className="mt-3 space-y-2">
            {rows.map((row) => {
              const axisValues = {
                length: convertLength(row.dimensions.length_mm, row.dimensions.dimension_unit),
                width: convertLength(row.dimensions.width_mm, row.dimensions.dimension_unit),
                height: convertLength(row.dimensions.height_mm, row.dimensions.dimension_unit),
              }
              return (
                <div
                  key={row.key}
                  className="grid gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,90px))_minmax(0,90px)_minmax(0,140px)_minmax(0,90px)_auto_auto] sm:items-end"
                >
                  <div className="min-w-0">
                    <span className="mb-1 block text-xs text-[#6F7192]">Option Value</span>
                    <div className="truncate rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[#0F1B3D]">
                      <span className="font-bold text-[#6d28d9]">{row.option_name}:</span> {row.option_value}
                    </div>
                  </div>
                  {(['length', 'width', 'height'] as const).map((axisLabel) => {
                    const axisField = `${axisLabel}_mm` as 'length_mm' | 'width_mm' | 'height_mm'
                    return (
                      <div key={axisLabel}>
                        <span className="mb-1 block text-xs text-[#6F7192]">{axisLabel[0].toUpperCase() + axisLabel.slice(1)}</span>
                        <input
                          type="number"
                          min={0}
                          value={axisValues[axisLabel] ?? ''}
                          onChange={(event) => setRowDimension(row, axisField, event.target.value)}
                          placeholder="—"
                          className={sizeInputClass()}
                        />
                      </div>
                    )
                  })}
                  <div>
                    <span className="mb-1 block text-xs text-[#6F7192]">Weight</span>
                    <input
                      type="number"
                      min={0}
                      value={convertWeight(row.dimensions.weight_g, row.dimensions.weight_unit) ?? ''}
                      onChange={(event) => setRowWeight(row, event.target.value)}
                      placeholder="—"
                      className={sizeInputClass()}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <select
                      value={row.dimensions.dimension_unit}
                      onChange={(event) => setRowUnits(row, event.target.value as DimensionUnit, row.dimensions.weight_unit)}
                      className={sizeInputClass()}
                    >
                      {DIMENSION_UNITS.map((unit) => (
                        <option key={unit.value} value={unit.value}>
                          {unit.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={row.dimensions.weight_unit}
                      onChange={(event) => setRowUnits(row, row.dimensions.dimension_unit, event.target.value as WeightUnit)}
                      className={`${sizeInputClass()} max-w-[7rem]`}
                    >
                      {WEIGHT_UNITS.map((unit) => (
                        <option key={unit.value} value={unit.value}>
                          {unit.label.split(' ')[0]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="mb-0.5 whitespace-nowrap text-xs text-[#6F7192]">
                    {row.dimensions.volume_cc != null ? `${row.dimensions.volume_cc} cc` : ''}
                  </span>
                  {row.id && (
                    <button
                      type="button"
                      onClick={() => void deleteVariantDimension(row.id)}
                      title="Remove dimensions"
                      className="mb-0.5 rounded-xl border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="text-xs text-[#6F7192]">Add variant options to configure per-value dimensions.</p>
      )}
    </Section>
  )
}