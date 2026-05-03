import type { Object3D } from 'three'

export type MaterialPropertySet = {
  strength: string
  flexibility: string
  tempResistance: string
  difficulty: string
}

export type MaterialColor = {
  name: string
  hex: string
}

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
  colorHex: string
  infill: number
  layerHeight: number
  supports: boolean
  scalePercent: number
}

export type PriceBreakdown = {
  scaledVolumeCm3: number
  materialWeightGrams: number
  supportWeightGrams: number
  materialCost: number
  estimatedHours: number
  timeCost: number
  labourCost: number
  setupCost: number
  supportCost: number
  subtotal: number
  overheadAmount: number
  wastageAmount: number
  profitMargin: number
  gstAmount: number
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

