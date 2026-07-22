'use client'

export type PBRShaderProps = {
  roughness: number
  metalness: number
  clearcoat?: number
  clearcoatRoughness?: number
  transmission?: number
  ior?: number
  transparent?: boolean
  opacity?: number
}

const MATERIAL_PBR_PRESETS: Record<string, PBRShaderProps> = {
  'pla': {
    roughness: 0.42,
    metalness: 0.04,
    clearcoat: 0.1,
  },
  'pla-plus': {
    roughness: 0.38,
    metalness: 0.05,
    clearcoat: 0.15,
  },
  'resin-4k': {
    roughness: 0.12,
    metalness: 0.02,
    clearcoat: 0.95,
    clearcoatRoughness: 0.05,
  },
  'petg': {
    roughness: 0.25,
    metalness: 0.05,
    transmission: 0.15,
    ior: 1.52,
    clearcoat: 0.4,
  },
  'tpu': {
    roughness: 0.65,
    metalness: 0.0,
    clearcoat: 0.1,
  },
  'abs': {
    roughness: 0.48,
    metalness: 0.02,
    clearcoat: 0.05,
  },
  'nylon': {
    roughness: 0.55,
    metalness: 0.02,
  },
  'carbon-fiber': {
    roughness: 0.28,
    metalness: 0.75,
    clearcoat: 0.3,
  },
  'metal-fill': {
    roughness: 0.2,
    metalness: 0.85,
    clearcoat: 0.2,
  },
}

const COLOR_HEX_MAP: Record<string, string> = {
  'default': '#a5b4fc',
  'white': '#f8fafc',
  'matte white': '#f4f4f5',
  'black': '#18181b',
  'stealth black': '#09090b',
  'grey': '#64748b',
  'gray': '#64748b',
  'space grey': '#334155',
  'space gray': '#334155',
  'silver': '#cbd5e1',
  'metallic silver': '#94a3b8',
  'gold': '#eab308',
  'metallic gold': '#ca8a04',
  'red': '#ef4444',
  'crimson red': '#dc2626',
  'blue': '#0284c7',
  'cyber blue': '#0284c7',
  'navy': '#1e3a8a',
  'green': '#22c55e',
  'emerald green': '#16a34a',
  'yellow': '#facc15',
  'orange': '#f97316',
  'purple': '#a855f7',
  'violet': '#8b5cf6',
  'pink': '#ec4899',
  'translucent': '#e0f2fe',
  'clear': '#f0f9ff',
  'natural': '#fef08a',
}

export function getColorHex(colorName?: string): string {
  if (!colorName) return COLOR_HEX_MAP['default']
  const normalized = colorName.trim().toLowerCase()
  if (COLOR_HEX_MAP[normalized]) {
    return COLOR_HEX_MAP[normalized]
  }

  for (const [key, hex] of Object.entries(COLOR_HEX_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return hex
    }
  }

  if (/^#([0-9a-fA-F]{3}){1,2}$/.test(colorName)) {
    return colorName
  }

  return COLOR_HEX_MAP['default']
}

export function getMaterialShaderProps(materialId?: string, colorName?: string): PBRShaderProps & { color: string } {
  const color = getColorHex(colorName)
  const normMat = (materialId || '').trim().toLowerCase()
  const preset = MATERIAL_PBR_PRESETS[normMat] ?? MATERIAL_PBR_PRESETS['pla']

  return {
    ...preset,
    color,
  }
}
