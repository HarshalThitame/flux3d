'use client'

import { useMemo } from 'react'
import { Box, Copy, Ruler, Trash2 } from 'lucide-react'
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
  box_dimensions: ProductDimensions | null
}

export function DimensionsSection() {
  const {
    product,
    variants,
    variantDimensions,
    updateProduct,
    updateVariantDimension,
    updateVariantBoxDimension,
    deleteVariantDimension,
    applyDefaultDimensionsToUnset,
  } = useProductEditor()

  const defaults = useMemo(
    () => (product.default_dimensions ? { ...product.default_dimensions } : emptyDimensions('cm', 'g')),
    [product.default_dimensions]
  )

  const boxValue = useMemo<ProductDimensions>(
    () =>
      product.box_dimensions
        ? { ...product.box_dimensions }
        : emptyDimensions(defaults.dimension_unit, defaults.weight_unit),
    [product.box_dimensions, defaults.dimension_unit, defaults.weight_unit]
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
            box_dimensions: entry?.box_dimensions ?? null,
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

  function setBoxDimensions(partial: Partial<ProductDimensions>) {
    updateProduct('box_dimensions', withComputedVolume({ ...boxValue, ...partial }))
  }

  function setBoxUnits(dimension_unit: DimensionUnit, weight_unit: WeightUnit) {
    setBoxDimensions({ dimension_unit, weight_unit })
  }

  function copyDefaultsToBox() {
    updateProduct('box_dimensions', withComputedVolume({ ...defaults }))
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

  function boxSeed(row: DimensionRow): ProductDimensions {
    return row.box_dimensions ?? emptyDimensions(boxValue.dimension_unit, boxValue.weight_unit)
  }

  function setRowBoxDimension(row: DimensionRow, axis: 'length_mm' | 'width_mm' | 'height_mm', value: string) {
    const raw = value === '' ? null : Number(value)
    const base = boxSeed(row)
    updateVariantBoxDimension(row.option_name, row.option_value, {
      ...base,
      [axis]: raw !== null && Number.isFinite(raw) ? lengthToBase(raw, base.dimension_unit) : null,
    })
  }

  function setRowBoxWeight(row: DimensionRow, value: string) {
    const raw = value === '' ? null : Number(value)
    const base = boxSeed(row)
    updateVariantBoxDimension(row.option_name, row.option_value, {
      ...base,
      weight_g: raw !== null && Number.isFinite(raw) ? weightToBase(raw, base.weight_unit) : null,
    })
  }

  function setRowBoxUnits(row: DimensionRow, dimension_unit: DimensionUnit, weight_unit: WeightUnit) {
    const base = boxSeed(row)
    updateVariantBoxDimension(row.option_name, row.option_value, {
      ...base,
      dimension_unit,
      weight_unit,
    })
  }

  function copyRowDimsToBox(row: DimensionRow) {
    updateVariantBoxDimension(
      row.option_name,
      row.option_value,
      withComputedVolume({ ...row.dimensions })
    )
  }

  const defaultSizeInputs = {
    length: convertLength(defaults.length_mm, defaults.dimension_unit),
    width: convertLength(defaults.width_mm, defaults.dimension_unit),
    height: convertLength(defaults.height_mm, defaults.dimension_unit),
  }

  const boxSizeInputs = {
    length: convertLength(boxValue.length_mm, boxValue.dimension_unit),
    width: convertLength(boxValue.width_mm, boxValue.dimension_unit),
    height: convertLength(boxValue.height_mm, boxValue.dimension_unit),
  }

  return (
    <Section
      title="Dimensions"
      description="Product dimensions are shown to customers; box dimensions are used for courier packages (Shiprocket)."
    >
      {/* ── Product-level: customer-facing dimensions ── */}
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

      {/* ── Product-level: box / shipping dimensions ── */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-2">
          <Box className="h-4 w-4 text-[#6d28d9]" />
          <h3 className="text-sm font-semibold text-[#0F1B3D]">Default Box / Shipping Dimensions</h3>
          <button
            type="button"
            onClick={copyDefaultsToBox}
            className="ml-auto flex items-center gap-1 rounded-xl border border-[#6d28d9]/20 px-3 py-1.5 text-xs font-semibold text-[#6d28d9] hover:bg-[#6d28d9]/5"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy from product dims
          </button>
        </div>
        <p className="mt-1 text-xs text-[#6F7192]">
          The corrugated box used to ship this product. If unset, shipping falls back to product dimensions.
        </p>

        <div className="mt-4 grid gap-3 lg:grid-cols-10">
          <label className="block lg:col-span-1">
            <span className="mb-1 block text-xs text-[#6F7192]">Length</span>
            <input
              type="number"
              min={0}
              value={boxSizeInputs.length ?? ''}
              onChange={(event) =>
                setBoxDimensions({
                  length_mm:
                    event.target.value === '' ? null : lengthToBase(Number(event.target.value), boxValue.dimension_unit),
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
              value={boxSizeInputs.width ?? ''}
              onChange={(event) =>
                setBoxDimensions({
                  width_mm:
                    event.target.value === '' ? null : lengthToBase(Number(event.target.value), boxValue.dimension_unit),
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
              value={boxSizeInputs.height ?? ''}
              onChange={(event) =>
                setBoxDimensions({
                  height_mm:
                    event.target.value === '' ? null : lengthToBase(Number(event.target.value), boxValue.dimension_unit),
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
              value={boxValue.weight_g ?? ''}
              onChange={(event) =>
                setBoxDimensions({
                  weight_g:
                    event.target.value === '' ? null : weightToBase(Number(event.target.value), boxValue.weight_unit),
                })
              }
              placeholder="—"
              className={sizeInputClass()}
            />
          </label>
          <label className="block lg:col-span-2">
            <span className="mb-1 block text-xs text-[#6F7192]">Length Unit</span>
            <select
              value={boxValue.dimension_unit}
              onChange={(event) => setBoxUnits(event.target.value as DimensionUnit, boxValue.weight_unit)}
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
              value={boxValue.weight_unit}
              onChange={(event) => setBoxUnits(boxValue.dimension_unit, event.target.value as WeightUnit)}
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
              value={boxValue.volume_cc != null ? `${boxValue.volume_cc} cc` : '—'}
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
            Product dimensions override the default for every SKU that includes the option value. Box dimensions
            default to the same values until set here.
          </p>
          <div className="mt-3 space-y-2">
            {rows.map((row) => {
              const axisValues = {
                length: convertLength(row.dimensions.length_mm, row.dimensions.dimension_unit),
                width: convertLength(row.dimensions.width_mm, row.dimensions.dimension_unit),
                height: convertLength(row.dimensions.height_mm, row.dimensions.dimension_unit),
              }
              const boxAxisValues = {
                length: row.box_dimensions
                  ? convertLength(row.box_dimensions.length_mm, row.box_dimensions.dimension_unit)
                  : null,
                width: row.box_dimensions
                  ? convertLength(row.box_dimensions.width_mm, row.box_dimensions.dimension_unit)
                  : null,
                height: row.box_dimensions
                  ? convertLength(row.box_dimensions.height_mm, row.box_dimensions.dimension_unit)
                  : null,
              }
              return (
                <div key={row.key} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 truncate rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[#0F1B3D]">
                      <span className="font-bold text-[#6d28d9]">{row.option_name}:</span> {row.option_value}
                    </div>
                    {row.id && (
                      <button
                        type="button"
                        onClick={() => void deleteVariantDimension(row.id)}
                        title="Remove dimensions"
                        className="rounded-xl border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-[repeat(3,minmax(0,90px))_minmax(0,90px)_minmax(0,140px)_minmax(0,90px)_auto] sm:items-end">
                    <div>
                      <span className="mb-1 block text-xs text-[#6F7192]">Length</span>
                      <input
                        type="number"
                        min={0}
                        value={axisValues.length ?? ''}
                        onChange={(event) => setRowDimension(row, 'length_mm', event.target.value)}
                        placeholder="—"
                        className={sizeInputClass()}
                      />
                    </div>
                    <div>
                      <span className="mb-1 block text-xs text-[#6F7192]">Width</span>
                      <input
                        type="number"
                        min={0}
                        value={axisValues.width ?? ''}
                        onChange={(event) => setRowDimension(row, 'width_mm', event.target.value)}
                        placeholder="—"
                        className={sizeInputClass()}
                      />
                    </div>
                    <div>
                      <span className="mb-1 block text-xs text-[#6F7192]">Height</span>
                      <input
                        type="number"
                        min={0}
                        value={axisValues.height ?? ''}
                        onChange={(event) => setRowDimension(row, 'height_mm', event.target.value)}
                        placeholder="—"
                        className={sizeInputClass()}
                      />
                    </div>
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
                    <span />
                  </div>

                  <div className="mt-3 grid gap-3 border-t border-dashed border-gray-200 pt-3 sm:grid-cols-[minmax(0,90px)_repeat(3,minmax(0,90px))_minmax(0,90px)_minmax(0,140px)_minmax(0,90px)_auto] sm:items-end">
                    <div>
                      <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#6F7192]">
                        <Box className="h-3 w-3 text-[#6d28d9]" /> Box
                      </span>
                      <button
                        type="button"
                        onClick={() => copyRowDimsToBox(row)}
                        title="Copy this variant's product dims into its box"
                        className="flex w-full items-center justify-center gap-1 rounded-xl border border-[#6d28d9]/20 px-2 py-2 text-[10px] font-semibold text-[#6d28d9] hover:bg-[#6d28d9]/5"
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </button>
                    </div>
                    {(['length', 'width', 'height'] as const).map((axisLabel) => {
                      const axisField = `${axisLabel}_mm` as 'length_mm' | 'width_mm' | 'height_mm'
                      return (
                        <div key={axisLabel}>
                          <span className="mb-1 block text-xs text-[#6F7192]">{axisLabel[0].toUpperCase() + axisLabel.slice(1)}</span>
                          <input
                            type="number"
                            min={0}
                            value={boxAxisValues[axisLabel] ?? ''}
                            onChange={(event) => setRowBoxDimension(row, axisField, event.target.value)}
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
                        value={
                          row.box_dimensions
                            ? convertWeight(row.box_dimensions.weight_g, row.box_dimensions.weight_unit) ?? ''
                            : ''
                        }
                        onChange={(event) => setRowBoxWeight(row, event.target.value)}
                        placeholder="—"
                        className={sizeInputClass()}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <select
                        value={row.box_dimensions?.dimension_unit ?? boxValue.dimension_unit}
                        onChange={(event) =>
                          setRowBoxUnits(row, event.target.value as DimensionUnit, row.box_dimensions?.weight_unit ?? boxValue.weight_unit)
                        }
                        className={sizeInputClass()}
                      >
                        {DIMENSION_UNITS.map((unit) => (
                          <option key={unit.value} value={unit.value}>
                            {unit.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={row.box_dimensions?.weight_unit ?? boxValue.weight_unit}
                        onChange={(event) =>
                          setRowBoxUnits(row, row.box_dimensions?.dimension_unit ?? boxValue.dimension_unit, event.target.value as WeightUnit)
                        }
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
                      {row.box_dimensions?.volume_cc != null ? `${row.box_dimensions.volume_cc} cc` : ''}
                    </span>
                  </div>
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