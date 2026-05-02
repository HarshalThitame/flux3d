import type { LayerHeightOption, QuoteMaterial } from '@/lib/quote/types'

export const quoteMaterials: QuoteMaterial[] = []

export const layerHeightOptions: LayerHeightOption[] = []

function normalizeValue(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

const materialAliases: Record<string, string[]> = {}

export function getMaterialById(materialId: string, materials: QuoteMaterial[] = quoteMaterials) {
  const normalizedMaterialId = normalizeValue(materialId)

  return (
    materials.find((material) => normalizeValue(material.id) === normalizedMaterialId) ??
    materials.find((material) => normalizeValue(material.name) === normalizedMaterialId) ??
    materials[0] ??
    null
  )
}

const materialAliases: Record<string, string[]> = {
  'pla-plus': ['pla', 'pla+', 'pla-plus', 'pla-pro'],
  abs: ['abs', 'abs-tough'],
  petg: ['petg'],
  asa: ['asa'],
  tpu: ['tpu'],
  'resin-4k': ['resin', 'resin-4k'],
  'silk-gold': ['silk', 'gold', 'silk-gold'],
  'multi-color': ['multi', 'multi-color', 'ams', 'color'],
}

export function getMaterialById(materialId: string, materials: QuoteMaterial[] = quoteMaterials) {
  const normalizedMaterialId = normalizeValue(materialId)

  return (
    materials.find((material) => normalizeValue(material.id) === normalizedMaterialId) ??
    materials.find((material) => normalizeValue(material.name) === normalizedMaterialId) ??
    materials.find((material) => {
      const aliases = materialAliases[normalizedMaterialId] ?? [normalizedMaterialId]
      const normalizedName = normalizeValue(material.name)

      return aliases.some((alias) => normalizedName.includes(normalizeValue(alias)))
    }) ??
    materials[0] ??
    undefined
  )
}
