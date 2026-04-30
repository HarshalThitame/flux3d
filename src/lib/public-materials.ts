import type { MaterialSpec } from '@/data/materials'
import { getAdminMaterialsData } from '@/lib/admin/queries'
import type { AdminMaterial } from '@/lib/admin/types'
import type { MaterialColor, QuoteMaterial } from '@/lib/quote/types'

const presetAliases = [
  { keywords: ['pla', 'pla+'], id: 'pla-plus' },
  { keywords: ['abs'], id: 'abs' },
  { keywords: ['petg'], id: 'petg' },
  { keywords: ['asa'], id: 'asa' },
  { keywords: ['tpu'], id: 'tpu' },
  { keywords: ['resin'], id: 'resin-4k' },
  { keywords: ['silk', 'gold'], id: 'silk-gold' },
  { keywords: ['multi', 'ams', 'color'], id: 'multi-color' },
] as const

const colorLookup: Record<string, string> = {
  white: '#f3f4f6',
  black: '#111827',
  graphite: '#1f2937',
  gray: '#6b7280',
  grey: '#6b7280',
  smoke: '#475569',
  silver: '#cbd5e1',
  red: '#ef4444',
  orange: '#ff5c1a',
  coral: '#fb7185',
  yellow: '#facc15',
  gold: '#d4a017',
  copper: '#b45309',
  green: '#22c55e',
  mint: '#34d399',
  lime: '#84cc16',
  blue: '#38bdf8',
  cyan: '#22d3ee',
  purple: '#8b5cf6',
  violet: '#8b5cf6',
  ivory: '#fef3c7',
  stone: '#94a3b8',
  clear: '#dbeafe',
  carbon: '#0f172a',
}

function normalizeValue(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function findPresetId(value: string) {
  const normalized = normalizeValue(value)

  return presetAliases.find((preset) =>
    preset.keywords.some((keyword) => normalized.includes(normalizeValue(keyword)))
  )?.id
}

function getFallbackQuoteMaterial(name: string) {
  const presetId = findPresetId(name)
  return presetId ?? null
}

function getFallbackMaterialSpec(name: string) {
  const presetId = findPresetId(name)
  return presetId ?? null
}

function hashColor(value: string) {
  let hash = 0

  for (const character of value) {
    hash = (hash << 5) - hash + character.charCodeAt(0)
    hash |= 0
  }

  const hex = Math.abs(hash).toString(16).padStart(6, '0')
  return `#${hex.slice(0, 6)}`
}

function colorNameToHex(name: string) {
  const normalized = normalizeValue(name)

  for (const [keyword, hex] of Object.entries(colorLookup)) {
    if (normalized.includes(keyword)) {
      return hex
    }
  }

  return hashColor(normalized || name)
}

function mapAdminColors(colors: string[], fallbackColors: MaterialColor[]) {
  if (colors.length === 0) {
    return fallbackColors.length > 0
      ? fallbackColors
      : [{ name: 'Default', hex: '#ff5c1a' }]
  }

  return colors.map((color) => ({
    name: color,
    hex: colorNameToHex(color),
  }))
}

function mapAdminMaterialToQuoteMaterial(material: AdminMaterial): QuoteMaterial {
  const fallbackMaterialId = getFallbackQuoteMaterial(material.name)

  return {
    id: material.id,
    name: material.name,
    icon: fallbackMaterialId === 'resin-4k' ? '💎' : fallbackMaterialId === 'multi-color' ? '🎨' : '🧱',
    summary: `${material.name} is available in the live admin catalog for custom 3D printing jobs.`,
    density: material.density,
    pricePerGram: material.price_per_gram,
    machineRate: 210,
    multiplier: 1.1,
    recommendedFor: 'Custom parts, operator-reviewed jobs, and production runs',
    properties: {
      strength: 'Medium',
      flexibility: 'Medium',
      tempResistance: 'Medium',
      difficulty: 'Medium',
    },
    colors: mapAdminColors(material.colors, []),
  }
}

function mapAdminMaterialToSpec(material: AdminMaterial): MaterialSpec {
  const fallbackSpecId = getFallbackMaterialSpec(material.name)

  return {
    id: material.id,
    name: material.name,
    tag: fallbackSpecId ? 'Admin Catalog' : 'Admin Catalog',
    icon: fallbackSpecId === 'resin-4k' ? '💎' : fallbackSpecId === 'multi-color' ? '🎨' : '🧱',
    description: `${material.name} is available through the live admin material catalog and can be quoted directly in the order workflow.`,
    color: colorNameToHex(material.colors[0] ?? material.name),
    gradient: undefined,
    properties: {
      strength: 'Medium',
      flexibility: 'Medium',
      tempResistance: 'Medium',
      difficulty: 'Medium',
    },
    useCases: ['Custom prototypes', 'Production parts', 'Operator-reviewed jobs'],
    pros: [
      'Available in the live admin catalog',
      `Priced at ₹${material.price_per_gram}/g`,
      `Density ${material.density} g/cm3`,
    ],
    cons: [
      material.stock === 'Paused'
        ? 'Currently paused in stock'
        : material.stock === 'Low'
          ? 'Limited stock may affect lead time'
          : 'Lead time depends on part geometry',
    ],
    settings: undefined,
  }
}

function sortMaterials(materials: AdminMaterial[]) {
  const stockRank: Record<AdminMaterial['stock'], number> = {
    Healthy: 0,
    Low: 1,
    Paused: 2,
  }

  return [...materials].sort((left, right) => {
    const stockDifference = stockRank[left.stock] - stockRank[right.stock]
    if (stockDifference !== 0) {
      return stockDifference
    }

    return left.name.localeCompare(right.name)
  })
}

export async function getPublicQuoteMaterials() {
  try {
    const materials = await getAdminMaterialsData()
    if (materials.length === 0) {
      return []
    }

    return sortMaterials(materials).map(mapAdminMaterialToQuoteMaterial)
  } catch {
    return []
  }
}

export async function getPublicMaterialSpecs() {
  try {
    const materials = await getAdminMaterialsData()
    if (materials.length === 0) {
      return []
    }

    return sortMaterials(materials).map(mapAdminMaterialToSpec)
  } catch {
    return []
  }
}
