import type { Object3D } from 'three'

export type MaterialPropertySet = {
  strength: string
  flexibility: string
  tempResistance: string
  difficulty: string
}

export type MaterialColor = {
  name: string
}

export const DIFFICULTY_FACTOR_OPTIONS = [
  { value: 1.1, label: '1.1X' },
  { value: 1.2, label: '1.2X' },
  { value: 1.3, label: '1.3X' },
  { value: 1.5, label: '1.5X' },
  { value: 10, label: '10X' },
] as const

export type QuoteMaterial = {
  id: string
  name: string
  icon: string
  summary: string
  density: number
  pricePerGram: number
  machineRate: number
  multiplier: number
  recommendedFor: string
  properties: MaterialPropertySet
  colors: MaterialColor[]
  difficultyFactor: number
  keyProperties?: string[]
  bestFor?: string[]
  difficultyLevel?: 'Easy' | 'Medium' | 'Hard'
  heatResistance?: 'Low' | 'Medium' | 'High'
  strengthRating?: 'Low' | 'Medium' | 'High'
  finishQuality?: 'Basic' | 'Good' | 'Excellent'
  samplePhoto?: string
}

export type LayerHeightOption = {
  value: number
  label: string
  multiplier: number
  description: string
}

export type PostProcessingLevel = 'none' | 'sanded' | 'sanded-painted'

export type ParsedModel = {
  fileName: string
  fileSize: number
  extension: string
  object: Object3D
  dimensionsMm: {
    x: number
    y: number
    z: number
  }
  volumeMm3: number
  triangleCount: number
  suggestedMaterialId: string
}

export type QuoteConfig = {
  materialId: string
  color: string
  infill: number
  layerHeight: number
  quantity: number
  postProcessingLevel: PostProcessingLevel
  supports: boolean
}

export type PriceBreakdown = {
  scaledVolumeCm3: number
  quantity: number
  baseWeightGrams: number
  infillMultiplier: number
  materialUsageGramsPerUnit: number
  materialWeightGrams: number
  supportWeightGrams: number
  materialRatePerKg: number
  machineRatePerHour: number
  basePrintTimeMinutesPerUnit: number
  estimatedMinutesPerUnit: number
  estimatedMinutes: number
  estimatedHours: number
  quantityDiscountPercent: number
  quantityDiscountAmount: number
  totalBeforeRounding: number
  materialCost: number
  timeCost: number
  labourCost: number
  setupCost: number
  supportCost: number
  postProcessingLevel: PostProcessingLevel
  postProcessingCostPerUnit: number
  subtotal: number
  overheadAmount: number
  profitMargin: number
  total: number
  dimensionsMm: {
    x: number
    y: number
    z: number
  }
}

export type UploadState = {
  status: 'idle' | 'uploading' | 'success' | 'error'
  progress: number
  path?: string
  error?: string
}
