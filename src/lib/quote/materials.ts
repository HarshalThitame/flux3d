import type { LayerHeightOption, QuoteMaterial } from '@/lib/quote/types'

export const quoteMaterials: QuoteMaterial[] = []

export const layerHeightOptions: LayerHeightOption[] = [
  { value: 0.2, label: '🟢 Standard Quality (0.2mm)', multiplier: 1.0, description: 'Balanced quality and cost. Slight layer lines may be visible. Best for: Everyday prints, prototypes, basic parts' },
  { value: 0.12, label: '🔵 High Quality (0.12mm)', multiplier: 1.3, description: 'Smoother surface with finer details and less visible lines. Best for: Display models, gifts, detailed designs' },
  { value: 0.08, label: '🟣 Ultra Quality (0.08mm)', multiplier: 1.8, description: 'Premium finish with very smooth surface and sharp details. Best for: Showcase pieces, premium products, professional use' },
]

function normalizeValue(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9+]+/g, '-')
}

const materialAliases: Record<string, string[]> = {
  pla: ['pla', 'pla+', 'pla-plus', 'pla-pro'],
  'pla-plus': ['pla', 'pla+', 'pla-plus', 'pla-pro'],
  abs: ['abs', 'abs-tough'],
  petg: ['petg'],
  asa: ['asa'],
  tpu: ['tpu'],
  nylon: ['nylon', 'pa12', 'nylon-pa12'],
  pc: ['pc', 'polycarbonate'],
  polycarbonate: ['pc', 'polycarbonate'],
  resin: ['resin', 'resin-4k', 'standard-resin'],
  'resin-4k': ['resin', 'resin-4k'],
  'silk-gold': ['silk', 'gold', 'silk-gold'],
  'multi-color': ['multi', 'multi-color', 'ams', 'color'],
}

export function getMaterialById(materialId: string, materials: QuoteMaterial[] = quoteMaterials) {
  const normalizedMaterialId = normalizeValue(materialId)
  const exactMaterial = materials.find((material) =>
    normalizeValue(material.id) === normalizedMaterialId ||
    normalizeValue(material.name) === normalizedMaterialId
  )

  if (exactMaterial) {
    return exactMaterial
  }

  const aliases = materialAliases[normalizedMaterialId] ?? [normalizedMaterialId]

  for (const alias of aliases) {
    const normalizedAlias = normalizeValue(alias)
    const exactAliasMatch = materials.find((material) => normalizeValue(material.name) === normalizedAlias)
    if (exactAliasMatch) {
      return exactAliasMatch
    }
  }

  return (
    materials.find((material) => {
      const normalizedName = normalizeValue(material.name)
      return aliases.some((alias) => normalizedName.includes(normalizeValue(alias)))
    }) ??
    materials[0] ??
    undefined
  )
}
