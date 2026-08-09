import { createAdminSupabaseClient } from '@/lib/admin/server'
import { getSettings } from '@/lib/settings'
import { calculateQuotePricing } from '@/lib/quote/pricing-waterfall'
import type { ParsedModel, QuoteConfig, QuoteMaterial } from '@/lib/quote/types'

export type ModelMetadata = {
  fileName: string
  fileSize: number
  extension: string
  volumeMm3: number
  dimensionsMm: { x: number; y: number; z: number }
  triangleCount: number
  suggestedMaterialId?: string
}

export function toParsedModel(metadata: ModelMetadata): ParsedModel {
  return {
    fileName: metadata.fileName,
    fileSize: metadata.fileSize,
    extension: metadata.extension,
    object: null as unknown as ParsedModel['object'],
    dimensionsMm: metadata.dimensionsMm,
    volumeMm3: metadata.volumeMm3,
    triangleCount: metadata.triangleCount,
    suggestedMaterialId: metadata.suggestedMaterialId ?? '',
  }
}

export async function fetchMaterialForQuote(materialId: string): Promise<QuoteMaterial | null> {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('materials')
    .select(
      'id, name, density, price_per_gram, machine_rate, multiplier, recommended_for, properties, colors, difficulty_factor, stock, icon, summary, key_properties, best_for, difficulty_level, heat_resistance, strength_rating, finish_quality, sample_photo'
    )
    .or(`id.eq.${materialId},name.ilike.${materialId}`)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[server-pricing] Failed to load material:', error)
    return null
  }

  if (!data) return null

  const row = data as Record<string, unknown>
  const colors = Array.isArray(row.colors)
    ? (row.colors as Array<{ name?: string; hex?: string }>).map((c) => ({ name: c.name ?? 'Default' }))
    : []

  return {
    id: String(row.id),
    name: String(row.name),
    icon: typeof row.icon === 'string' ? row.icon : '🧩',
    summary: typeof row.summary === 'string' ? row.summary : '',
    density: Number(row.density ?? 0),
    pricePerGram: Number(row.price_per_gram ?? 0),
    machineRate: Number(row.machine_rate ?? 0),
    multiplier: Number(row.multiplier ?? 1),
    recommendedFor: typeof row.recommended_for === 'string' ? row.recommended_for : '',
    properties: (() => {
      const props = typeof row.properties === 'object' && row.properties !== null
        ? (row.properties as Record<string, string>)
        : {}
      return {
        strength: props.strength ?? 'Medium',
        flexibility: props.flexibility ?? 'Medium',
        tempResistance: props.tempResistance ?? 'Medium',
        difficulty: props.difficulty ?? 'Medium',
      }
    })(),
    colors: colors.length > 0 ? colors : [{ name: 'Default' }],
    difficultyFactor: Number(row.difficulty_factor ?? 1),
    keyProperties: Array.isArray(row.key_properties) ? row.key_properties : [],
    bestFor: Array.isArray(row.best_for) ? row.best_for : [],
    difficultyLevel: (row.difficulty_level as QuoteMaterial['difficultyLevel']) ?? 'Easy',
    heatResistance: (row.heat_resistance as QuoteMaterial['heatResistance']) ?? 'Low',
    strengthRating: (row.strength_rating as QuoteMaterial['strengthRating']) ?? 'Medium',
    finishQuality: (row.finish_quality as QuoteMaterial['finishQuality']) ?? 'Good',
    samplePhoto: typeof row.sample_photo === 'string' ? row.sample_photo : '',
  }
}

export async function calculateServerQuotePricing(
  metadata: ModelMetadata,
  config: QuoteConfig
) {
  const material = await fetchMaterialForQuote(config.materialId)
  if (!material) {
    throw new Error('Selected material is not available. Please choose a different material.')
  }

  const settings = await getSettings()
  const parsedModel = toParsedModel(metadata)
  const breakdown = calculateQuotePricing(parsedModel, config, [material], {
    overheadPercentage: settings.overheadPercentage,
    marginPercentage: settings.marginPercentage,
    materialMarkupPercent: settings.materialMarkupPercent,
    printSpeedGramsPerHour: settings.printSpeedGramsPerHour,
    postProcessingMultipliers: settings.postProcessingMultipliers,
    deliveryChargeThreshold: settings.deliveryChargeThreshold,
    defaultDeliveryCharge: settings.defaultDeliveryCharge,
    cartDiscountEnabled: settings.cartDiscountEnabled,
    cartDiscountTiers: settings.cartDiscountTiers,
    minimumOrderValue: settings.minimumOrderValue,
    gstInclusivePricing: settings.gstInclusivePricing,
  })

  if (!breakdown) {
    throw new Error('Could not calculate pricing for the selected model.')
  }

  return { breakdown, material }
}
